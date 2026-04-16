from __future__ import annotations
"""
Veri Ön-İşleme (Preprocessor)
==============================
Retailrocket ham verisini:
  1. Temizler (duplikat, bot trafiği kaldırma)
  2. Etkileşim ağırlıklarını atar (view=1, addtocart=3, transaction=5)
  3. Az etkileşimli kullanıcı/ürünleri filtreler
  4. Zaman bazlı train/test split yapar
  5. LightFM ve Surprise için uygun formata dönüştürür

Kullanım:
    from app.data.preprocessor import RetailRocketPreprocessor
    preprocessor = RetailRocketPreprocessor()
    preprocessor.run()

    train_df  = preprocessor.train_df
    test_df   = preprocessor.test_df
    user_map  = preprocessor.user_id_map   # visitorid → sıralı index
    item_map  = preprocessor.item_id_map   # itemid → sıralı index
"""

import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix

from app.config import (
    EVENT_WEIGHTS,
    MIN_USER_INTERACTIONS,
    MIN_ITEM_INTERACTIONS,
    TRAIN_TEST_SPLIT_RATIO,
)
from app.data.loader import (
    load_retailrocket_events,
    load_retailrocket_item_properties,
    load_retailrocket_categories,
)


class RetailRocketPreprocessor:
    """
    RetailRocket verisini ML modelleri için hazırlayan pipeline.
    """

    def __init__(self):
        self.events_df: pd.DataFrame | None = None
        self.train_df: pd.DataFrame | None = None
        self.test_df: pd.DataFrame | None = None

        # ID eşleme sözlükleri (orijinal → sıralı 0-indexed)
        self.user_id_map: dict[int, int] = {}
        self.item_id_map: dict[int, int] = {}

        # Ters eşleme (sıralı index → orijinal)
        self.reverse_user_map: dict[int, int] = {}
        self.reverse_item_map: dict[int, int] = {}

        # Ürün kategori eşlemesi
        self.item_categories: dict[int, int] = {}  # itemid → categoryid

        # İstatistikler
        self.stats: dict = {}

    def run(self) -> "RetailRocketPreprocessor":
        """Tüm ön-işleme pipeline'ını çalıştırır."""
        print("\n" + "=" * 60)
        print("  RetailRocket Veri Ön-İşleme Pipeline")
        print("=" * 60)

        self._load_data()
        self._assign_weights()
        self._remove_duplicates()
        self._filter_sparse_users_items()
        self._create_id_maps()
        self._load_item_categories()
        self._time_based_split()
        self._compute_stats()

        print("\n" + "=" * 60)
        print("  Pipeline Tamamlandı ✓")
        print("=" * 60)
        self._print_stats()

        return self

    # ──────────────────────────────────────────────────────────────

    def _load_data(self):
        """Ham events verisini yükler."""
        print("\n[1/7] Veri yükleniyor...")
        self.events_df = load_retailrocket_events()

        # timestamp → datetime dönüşümü
        self.events_df["datetime"] = pd.to_datetime(
            self.events_df["timestamp"], unit="ms"
        )

    def _assign_weights(self):
        """Event tiplerine göre etkileşim ağırlıkları atar."""
        print("[2/7] Etkileşim ağırlıkları atanıyor...")
        self.events_df["weight"] = self.events_df["event"].map(EVENT_WEIGHTS)

        # Ağırlık atanamayan satırları kaldır (bilinmeyen event tipi)
        before = len(self.events_df)
        self.events_df = self.events_df.dropna(subset=["weight"])
        self.events_df["weight"] = self.events_df["weight"].astype(int)
        dropped = before - len(self.events_df)
        if dropped > 0:
            print(f"  → {dropped:,} bilinmeyen event satırı çıkarıldı")

    def _remove_duplicates(self):
        """Aynı kullanıcı-ürün-event üçlüsünden çoklu kayıtları temizler."""
        print("[3/7] Duplikat temizliği...")
        before = len(self.events_df)

        # Aynı kullanıcı aynı ürünü aynı tipte birden çok kez yapmışsa,
        # en son olanı tut (en güncel etkileşim)
        self.events_df = (
            self.events_df
            .sort_values("timestamp")
            .drop_duplicates(
                subset=["visitorid", "itemid", "event"],
                keep="last"
            )
        )

        print(f"  → {before - len(self.events_df):,} duplikat kaldırıldı")

    def _filter_sparse_users_items(self):
        """
        Az etkileşimli kullanıcı ve ürünleri iteratif olarak filtreler.
        Bu, veri seyrekliğini (sparsity) azaltır ve modelin daha anlamlı
        kalıplar öğrenmesini sağlar.
        """
        print(f"[4/7] Sparse filtreleme (min kullanıcı: {MIN_USER_INTERACTIONS}, min ürün: {MIN_ITEM_INTERACTIONS})...")

        prev_len = 0
        curr_len = len(self.events_df)
        iteration = 0

        # Iteratif filtreleme: kullanıcı filtrelemesi yeni ürünleri sparse yapabilir
        while prev_len != curr_len:
            prev_len = curr_len
            iteration += 1

            # En az N etkileşimli kullanıcılar
            user_counts = self.events_df["visitorid"].value_counts()
            valid_users = user_counts[user_counts >= MIN_USER_INTERACTIONS].index
            self.events_df = self.events_df[self.events_df["visitorid"].isin(valid_users)]

            # En az N etkileşimli ürünler
            item_counts = self.events_df["itemid"].value_counts()
            valid_items = item_counts[item_counts >= MIN_ITEM_INTERACTIONS].index
            self.events_df = self.events_df[self.events_df["itemid"].isin(valid_items)]

            curr_len = len(self.events_df)

        print(f"  → {iteration} iterasyon sonucu: {curr_len:,} etkileşim kaldı")

    def _create_id_maps(self):
        """
        Orijinal ID'leri sıralı 0-indexed değerlere eşler.
        Sparse matrisler için gerekli.
        """
        print("[5/7] ID eşleme sözlükleri oluşturuluyor...")

        unique_users = sorted(self.events_df["visitorid"].unique())
        unique_items = sorted(self.events_df["itemid"].unique())

        self.user_id_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.item_id_map = {iid: idx for idx, iid in enumerate(unique_items)}

        self.reverse_user_map = {v: k for k, v in self.user_id_map.items()}
        self.reverse_item_map = {v: k for k, v in self.item_id_map.items()}

        # DataFrame'e mapped ID'leri ekle
        self.events_df["user_idx"] = self.events_df["visitorid"].map(self.user_id_map)
        self.events_df["item_idx"] = self.events_df["itemid"].map(self.item_id_map)

        print(f"  → {len(unique_users):,} kullanıcı, {len(unique_items):,} ürün")

    def _load_item_categories(self):
        """Ürün-kategori eşlemesini yükler (content-based features için)."""
        print("[6/7] Ürün kategorileri yükleniyor...")

        try:
            item_props = load_retailrocket_item_properties()

            if item_props.empty:
                print("  → Ürün özellikleri bulunamadı, kategori olmadan devam")
                return

            # 'categoryid' property'sini filtrele
            cat_props = item_props[item_props["property"] == "categoryid"].copy()

            if cat_props.empty:
                print("  → 'categoryid' property bulunamadı, devam ediliyor")
                return

            # Her ürün için en son atanan kategoriyi al
            cat_props = (
                cat_props
                .sort_values("timestamp")
                .drop_duplicates(subset=["itemid"], keep="last")
            )

            # Yalnızca bizim filtrelenmiş item setindeki ürünleri al
            cat_props = cat_props[cat_props["itemid"].isin(self.item_id_map)]

            self.item_categories = dict(
                zip(cat_props["itemid"].astype(int), cat_props["value"].astype(int))
            )

            coverage = len(self.item_categories) / max(len(self.item_id_map), 1) * 100
            print(f"  → {len(self.item_categories):,} ürün için kategori bulundu ({coverage:.1f}% kapsam)")

        except Exception as e:
            print(f"  → Kategori yükleme hatası: {e}, kategori olmadan devam")

    def _time_based_split(self):
        """
        Kronolojik sırayla train/test ayrımı yapar.
        Son %20'lik dilim test, geri kalanı train.
        Bu, gelecek verisiyle eğitim yapma (data leakage) riskini önler.
        """
        print(f"[7/7] Zaman bazlı train/test split ({TRAIN_TEST_SPLIT_RATIO:.0%} / {1 - TRAIN_TEST_SPLIT_RATIO:.0%})...")

        self.events_df = self.events_df.sort_values("timestamp").reset_index(drop=True)

        split_idx = int(len(self.events_df) * TRAIN_TEST_SPLIT_RATIO)

        self.train_df = self.events_df.iloc[:split_idx].copy()
        self.test_df = self.events_df.iloc[split_idx:].copy()

        print(f"  → Train: {len(self.train_df):,} etkileşim | Test: {len(self.test_df):,} etkileşim")

        # Test setindeki yeni kullanıcı/ürün durumunu raporla
        train_users = set(self.train_df["visitorid"])
        test_users = set(self.test_df["visitorid"])
        cold_users = test_users - train_users
        print(f"  → Test setinde {len(cold_users):,} soğuk başlangıç kullanıcısı (train'de yok)")

    def _compute_stats(self):
        """Raporlama için istatistikleri hesaplar."""
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)
        n_interactions = len(self.events_df)
        sparsity = 1 - (n_interactions / max(n_users * n_items, 1))

        self.stats = {
            "n_users": n_users,
            "n_items": n_items,
            "n_interactions": n_interactions,
            "n_train": len(self.train_df),
            "n_test": len(self.test_df),
            "sparsity": sparsity,
            "n_categories": len(set(self.item_categories.values())),
            "event_distribution": self.events_df["event"].value_counts().to_dict(),
        }

    def _print_stats(self):
        """İstatistik özetini yazdırır."""
        s = self.stats
        print(f"\n📊 Veri Seti Özeti:")
        print(f"   Kullanıcı sayısı    : {s['n_users']:,}")
        print(f"   Ürün sayısı         : {s['n_items']:,}")
        print(f"   Toplam etkileşim    : {s['n_interactions']:,}")
        print(f"   Train etkileşim     : {s['n_train']:,}")
        print(f"   Test etkileşim      : {s['n_test']:,}")
        print(f"   Seyreklik (sparsity): {s['sparsity']:.4%}")
        print(f"   Kategori sayısı     : {s['n_categories']}")
        print(f"   Event dağılımı      : {s['event_distribution']}")

    # ──────────────────────────────────────────────────────────────
    # Yardımcı Metodlar — Modeller İçin
    # ──────────────────────────────────────────────────────────────

    def get_train_sparse_matrix(self) -> coo_matrix:
        """
        Train seti için sparse etkileşim matrisi oluşturur (LightFM formatı).

        Returns:
            scipy.sparse.coo_matrix — shape (n_users, n_items), değerler = ağırlık
        """
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        rows = self.train_df["user_idx"].values
        cols = self.train_df["item_idx"].values
        data = self.train_df["weight"].values.astype(np.float32)

        return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))

    def get_test_sparse_matrix(self) -> coo_matrix:
        """
        Test seti için sparse etkileşim matrisi oluşturur.

        Returns:
            scipy.sparse.coo_matrix
        """
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        # Yalnızca train setinde de mevcut olan kullanıcı/ürün çiftlerini dahil et
        train_users = set(self.train_df["user_idx"].unique())
        test_filtered = self.test_df[self.test_df["user_idx"].isin(train_users)]

        rows = test_filtered["user_idx"].values
        cols = test_filtered["item_idx"].values
        data = test_filtered["weight"].values.astype(np.float32)

        return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))

    def get_item_feature_labels(self) -> list[str]:
        """
        LightFM için ürün özellik etiketleri oluşturur.
        Her ürün için kategori ID'si feature olarak kullanılır.

        Returns:
            list[str] — ["cat_123", "cat_456", ...] formatında etiketler
        """
        unique_categories = sorted(set(self.item_categories.values()))
        return [f"cat_{cid}" for cid in unique_categories]

    def get_n_users(self) -> int:
        return len(self.user_id_map)

    def get_n_items(self) -> int:
        return len(self.item_id_map)
