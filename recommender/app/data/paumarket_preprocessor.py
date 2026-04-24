from __future__ import annotations
"""
PAÜ Market Veri Ön-İşleme Adapter'ı
===================================
Gerçek PAÜ Market interaction export'unu mevcut recommender modellerinin
beklediği user_idx / item_idx / weight formatına dönüştürür.

Beklenen interaction CSV kolonları:
    user_id, listing_id, event, timestamp

Opsiyonel listing metadata CSV kolonları:
    listing_id, category, condition, price, title, description

Bu sınıf, RetailRocket pipeline'ını değiştirmez. Yeterli gerçek platform
verisi biriktiğinde aynı SVD/LightFM modellerini PAÜ verisiyle eğitmek için
adapter görevi görür.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from scipy.sparse import coo_matrix

from app.config import (
    PAUMARKET_INTERACTIONS_FILE,
    PAUMARKET_LISTINGS_FILE,
    TRAIN_TEST_SPLIT_RATIO,
)


class PauMarketPreprocessor:
    """
    PAÜ Market etkileşimlerini model eğitim formatına dönüştüren pipeline.

    Public alanlar RetailRocketPreprocessor ile uyumludur:
        train_df, test_df, user_id_map, item_id_map, reverse_item_map,
        item_categories, stats
    """

    REQUIRED_INTERACTION_COLUMNS = {"user_id", "listing_id", "event", "timestamp"}

    def __init__(
        self,
        interactions_path: str | Path = PAUMARKET_INTERACTIONS_FILE,
        listings_path: str | Path | None = None,
        min_user_interactions: int = 1,
        min_item_interactions: int = 1,
    ):
        self.interactions_path = Path(interactions_path)
        self.listings_path = Path(listings_path) if listings_path is not None else PAUMARKET_LISTINGS_FILE
        self.min_user_interactions = min_user_interactions
        self.min_item_interactions = min_item_interactions

        self.events_df: pd.DataFrame | None = None
        self.listings_df: pd.DataFrame | None = None
        self.train_df: pd.DataFrame | None = None
        self.test_df: pd.DataFrame | None = None

        self.user_id_map: dict[int, int] = {}
        self.item_id_map: dict[int, int] = {}
        self.reverse_user_map: dict[int, int] = {}
        self.reverse_item_map: dict[int, int] = {}
        self.item_categories: dict[int, str] = {}
        self.stats: dict = {}

    def run(self) -> "PauMarketPreprocessor":
        print("\n" + "=" * 60)
        print("  PAÜ Market Veri Ön-İşleme Pipeline")
        print("=" * 60)

        self._load_data()
        self._normalize_events()
        self._assign_weights()
        self._remove_duplicates()
        self._time_based_split()
        self._filter_sparse_users_items()
        self._create_id_maps()
        self._load_item_categories()
        self._compute_stats()

        print("\n" + "=" * 60)
        print("  PAÜ Market Pipeline Tamamlandı ✓")
        print("=" * 60)
        self._print_stats()

        return self

    def _load_data(self):
        if not self.interactions_path.exists():
            raise FileNotFoundError(f"Interaction export bulunamadı: {self.interactions_path}")

        print(f"\n[1/8] PAÜ interaction export yükleniyor: {self.interactions_path}")
        self.events_df = pd.read_csv(self.interactions_path)

        missing_columns = self.REQUIRED_INTERACTION_COLUMNS - set(self.events_df.columns)
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise ValueError(f"Interaction export eksik kolon içeriyor: {missing}")

        if self.listings_path is not None:
            if not self.listings_path.exists():
                print(f"[loader] Listing metadata bulunamadı, opsiyonel olduğu için atlandı: {self.listings_path}")
                return

            print(f"[2/8] PAÜ listing metadata yükleniyor: {self.listings_path}")
            self.listings_df = pd.read_csv(self.listings_path)

    def _normalize_events(self):
        print("[3/8] Event kolonları normalize ediliyor...")

        self.events_df = self.events_df.copy()
        self.events_df["event"] = (
            self.events_df["event"]
            .astype(str)
            .str.strip()
            .str.lower()
        )

        self.events_df["timestamp"] = pd.to_datetime(
            self.events_df["timestamp"],
            errors="coerce",
            utc=True,
        )
        self.events_df = self.events_df.dropna(subset=["timestamp"])

        self.events_df["user_id"] = self.events_df["user_id"].astype(int)
        self.events_df["listing_id"] = self.events_df["listing_id"].astype(int)

    def _assign_weights(self):
        print("[4/8] PAÜ event ağırlıkları atanıyor...")

        if "weight" not in self.events_df.columns:
            raise ValueError("CSV'de 'weight' kolonu bulunamadı. Ağırlıklar backend tarafından hesaplanıp (tek kaynak) gönderilmelidir.")
        
        self.events_df["weight"] = pd.to_numeric(self.events_df["weight"], errors="coerce")

        before = len(self.events_df)
        self.events_df = self.events_df.dropna(subset=["weight"])
        self.events_df["weight"] = self.events_df["weight"].astype(float)
        dropped = before - len(self.events_df)

        if dropped > 0:
            print(f"  → {dropped:,} bilinmeyen veya ağırlıksız event çıkarıldı")

    def _remove_duplicates(self):
        print("[5/8] Duplikat temizliği...")
        before = len(self.events_df)

        self.events_df = (
            self.events_df
            .sort_values("timestamp")
            .drop_duplicates(
                subset=["user_id", "listing_id", "event"],
                keep="last",
            )
        )

        print(f"  → {before - len(self.events_df):,} duplikat kaldırıldı")

    def _time_based_split(self):
        print(f"[6/8] Zaman bazlı train/test split ({TRAIN_TEST_SPLIT_RATIO:.0%} / {1 - TRAIN_TEST_SPLIT_RATIO:.0%})...")

        self.events_df = self.events_df.sort_values("timestamp").reset_index(drop=True)

        split_idx = int(len(self.events_df) * TRAIN_TEST_SPLIT_RATIO)
        if len(self.events_df) > 1:
            split_idx = min(max(split_idx, 1), len(self.events_df) - 1)

        self.train_df = self.events_df.iloc[:split_idx].copy()
        self.test_df = self.events_df.iloc[split_idx:].copy()

        if self.train_df.empty:
            raise ValueError(
                "PAÜ Market export'u eğitim seti oluşturmak için yeterli değil. "
                "En az birkaç zaman sıralı etkileşim gerekir."
            )

        print(
            f"  → Ham train: {len(self.train_df):,} etkileşim | "
            f"Ham test: {len(self.test_df):,} etkileşim"
        )

    def _filter_sparse_users_items(self):
        print(
            "[7/8] Train tabanlı sparse filtreleme "
            f"(min kullanıcı: {self.min_user_interactions}, "
            f"min ilan: {self.min_item_interactions})..."
        )

        previous_len = -1
        current_len = len(self.train_df)

        while previous_len != current_len:
            previous_len = current_len

            user_counts = self.train_df["user_id"].value_counts()
            valid_users = user_counts[user_counts >= self.min_user_interactions].index
            self.train_df = self.train_df[self.train_df["user_id"].isin(valid_users)]

            item_counts = self.train_df["listing_id"].value_counts()
            valid_items = item_counts[item_counts >= self.min_item_interactions].index
            self.train_df = self.train_df[self.train_df["listing_id"].isin(valid_items)]

            current_len = len(self.train_df)

        print(f"  → Filtre sonrası train: {current_len:,} etkileşim")

        if current_len == 0:
            raise ValueError(
                "PAÜ Market export'u eğitim için yeterli etkileşim içermiyor. "
                "Train filtrelerinden sonra 0 kayıt kaldı."
            )

        valid_users = set(self.train_df["user_id"].unique())
        valid_items = set(self.train_df["listing_id"].unique())

        self.test_df = self.test_df[
            self.test_df["user_id"].isin(valid_users) &
            self.test_df["listing_id"].isin(valid_items)
        ].copy()

        print(f"  → Train evrenine hizalanmış test: {len(self.test_df):,} etkileşim")

    def _create_id_maps(self):
        print("[8/8] Train evreninden ID eşlemeleri oluşturuluyor...")

        unique_users = sorted(self.train_df["user_id"].unique())
        unique_items = sorted(self.train_df["listing_id"].unique())

        self.user_id_map = {int(uid): idx for idx, uid in enumerate(unique_users)}
        self.item_id_map = {int(iid): idx for idx, iid in enumerate(unique_items)}

        self.reverse_user_map = {idx: uid for uid, idx in self.user_id_map.items()}
        self.reverse_item_map = {idx: iid for iid, idx in self.item_id_map.items()}

        self.train_df["user_idx"] = self.train_df["user_id"].map(self.user_id_map)
        self.train_df["item_idx"] = self.train_df["listing_id"].map(self.item_id_map)
        self.test_df["user_idx"] = self.test_df["user_id"].map(self.user_id_map)
        self.test_df["item_idx"] = self.test_df["listing_id"].map(self.item_id_map)

        self.events_df = pd.concat([self.train_df, self.test_df], ignore_index=True)

        print(f"  → {len(unique_users):,} kullanıcı, {len(unique_items):,} ilan")

    def _load_item_categories(self):
        print("[8/8] İlan kategori özellikleri hazırlanıyor...")

        if self.listings_df is None or "category" not in self.listings_df.columns:
            print("  → Listing metadata/category yok, kategori feature atlandı")
            return

        listing_id_column = "listing_id" if "listing_id" in self.listings_df.columns else "id"
        if listing_id_column not in self.listings_df.columns:
            print("  → Listing ID kolonu bulunamadı, kategori feature atlandı")
            return

        metadata = self.listings_df[[listing_id_column, "category"]].dropna().copy()
        metadata[listing_id_column] = metadata[listing_id_column].astype(int)
        metadata = metadata[metadata[listing_id_column].isin(self.item_id_map)]

        self.item_categories = dict(
            zip(
                metadata[listing_id_column].astype(int),
                metadata["category"].astype(str).str.strip().str.lower(),
            )
        )

        coverage = len(self.item_categories) / max(len(self.item_id_map), 1) * 100
        print(f"  → {len(self.item_categories):,} ilan için kategori bulundu ({coverage:.1f}% kapsam)")

    def _compute_stats(self):
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)
        n_interactions = len(self.events_df)
        n_observed_pairs = self.events_df[["user_idx", "item_idx"]].drop_duplicates().shape[0]
        sparsity = 1 - (n_observed_pairs / max(n_users * n_items, 1))

        self.stats = {
            "source": "paumarket",
            "n_users": n_users,
            "n_items": n_items,
            "n_interactions": n_interactions,
            "n_observed_pairs": n_observed_pairs,
            "n_train": len(self.train_df),
            "n_test": len(self.test_df),
            "sparsity": sparsity,
            "n_categories": len(set(self.item_categories.values())),
            "event_distribution": self.events_df["event"].value_counts().to_dict(),
            "weight_distribution": self.events_df["weight"].value_counts().sort_index().to_dict(),
        }

    def _print_stats(self):
        s = self.stats
        print("\n📊 PAÜ Market Veri Özeti:")
        print(f"   Kullanıcı sayısı    : {s['n_users']:,}")
        print(f"   İlan sayısı         : {s['n_items']:,}")
        print(f"   Toplam etkileşim    : {s['n_interactions']:,}")
        print(f"   User-listing çifti  : {s['n_observed_pairs']:,}")
        print(f"   Train etkileşim     : {s['n_train']:,}")
        print(f"   Test etkileşim      : {s['n_test']:,}")
        print(f"   Seyreklik (sparsity): {s['sparsity']:.4%}")
        print(f"   Kategori sayısı     : {s['n_categories']}")
        print(f"   Event dağılımı      : {s['event_distribution']}")
        print(f"   Ağırlık dağılımı    : {s['weight_distribution']}")

    def get_train_sparse_matrix(self) -> coo_matrix:
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        rows = self.train_df["user_idx"].values
        cols = self.train_df["item_idx"].values
        data = self.train_df["weight"].values.astype(np.float32)

        return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))

    def get_test_sparse_matrix(self) -> coo_matrix:
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        train_users = set(self.train_df["user_idx"].unique())
        test_filtered = self.test_df[self.test_df["user_idx"].isin(train_users)]

        rows = test_filtered["user_idx"].values
        cols = test_filtered["item_idx"].values
        data = test_filtered["weight"].values.astype(np.float32)

        return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))

    def get_item_feature_labels(self) -> list[str]:
        unique_categories = sorted(set(self.item_categories.values()))
        return [f"cat_{category}" for category in unique_categories]

    def get_n_users(self) -> int:
        return len(self.user_id_map)

    def get_n_items(self) -> int:
        return len(self.item_id_map)
