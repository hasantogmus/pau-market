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
    HOLDOUT_ITEMS_PER_USER = 2

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
        self.raw_event_count = 0
        self.raw_train_count = 0
        self.raw_test_count = 0
        self.raw_event_distribution: dict = {}

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
        self._user_temporal_holdout()
        self._aggregate_user_item_events()
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

    def _user_temporal_holdout(self):
        """
        Her kullanıcının son farklı ilan etkileşimlerini test setine ayırır.

        Global zaman split'i küçük pilot veride çoğu kullanıcının yalnızca train
        veya yalnızca test tarafında kalmasına neden oluyordu. Bu split, aynı
        kullanıcının geçmişinden öğrenip sonraki ilgi alanını ölçmeye daha uygun.
        """
        holdout_n = self.HOLDOUT_ITEMS_PER_USER
        print(f"[6/8] Kullanıcı bazlı temporal holdout (son {holdout_n} farklı ilan test)...")

        self.events_df = self.events_df.sort_values("timestamp").reset_index(drop=True)
        self.raw_event_count = len(self.events_df)
        self.raw_event_distribution = self.events_df["event"].value_counts().to_dict()

        pair_history = (
            self.events_df
            .groupby(["user_id", "listing_id"], as_index=False)
            .agg(timestamp=("timestamp", "max"))
            .sort_values(["user_id", "timestamp", "listing_id"])
        )

        test_pairs: set[tuple[int, int]] = set()
        for user_id, user_pairs in pair_history.groupby("user_id", sort=False):
            if len(user_pairs) <= holdout_n + 1:
                continue

            for pair in user_pairs.tail(holdout_n).itertuples(index=False):
                test_pairs.add((int(pair.user_id), int(pair.listing_id)))

        if not test_pairs:
            print("  → Yeterli kullanıcı geçmişi yok; güvenli global zaman split'e düşülüyor")
            self._time_based_split()
            self.raw_train_count = len(self.train_df)
            self.raw_test_count = len(self.test_df)
            return

        pair_index = list(zip(self.events_df["user_id"], self.events_df["listing_id"]))
        is_test_pair = pd.Series(
            [(int(user_id), int(listing_id)) in test_pairs for user_id, listing_id in pair_index],
            index=self.events_df.index,
        )

        self.train_df = self.events_df[~is_test_pair].copy()
        self.test_df = self.events_df[is_test_pair].copy()
        self.raw_train_count = len(self.train_df)
        self.raw_test_count = len(self.test_df)

        if self.train_df.empty:
            raise ValueError(
                "PAÜ Market export'u eğitim seti oluşturmak için yeterli değil. "
                "Kullanıcı bazlı holdout sonrasında train tarafı boş kaldı."
            )

        print(
            f"  → Ham train: {self.raw_train_count:,} event | "
            f"Ham test: {self.raw_test_count:,} event | "
            f"Test kullanıcı sayısı: {self.test_df['user_id'].nunique():,}"
        )

    def _aggregate_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        if frame.empty:
            return frame.copy()

        # Aynı kullanıcı-ilan çiftindeki tekrarları tek gözleme indiriyoruz.
        # En güçlü sinyal ağırlığı eğitimde korunur; temsil event'i de aynı
        # mantıkla en yüksek ağırlık ve en güncel timestamp üzerinden seçilir.
        representative_events = (
            frame
            .sort_values(
                ["user_id", "listing_id", "weight", "timestamp"],
                ascending=[True, True, False, False],
            )
            .drop_duplicates(subset=["user_id", "listing_id"], keep="first")
            [["user_id", "listing_id", "event"]]
        )

        aggregated = (
            frame
            .groupby(["user_id", "listing_id"], as_index=False)
            .agg(
                weight=("weight", "max"),
                timestamp=("timestamp", "max"),
                raw_event_count=("event", "count"),
            )
            .merge(representative_events, on=["user_id", "listing_id"], how="left")
        )

        return aggregated[["user_id", "listing_id", "event", "timestamp", "weight", "raw_event_count"]]

    def _aggregate_user_item_events(self):
        print("[6/8] User-listing tekrarları max ağırlıkla tek gözleme indiriliyor...")

        before_train = len(self.train_df)
        before_test = len(self.test_df)

        self.train_df = self._aggregate_frame(self.train_df)
        self.test_df = self._aggregate_frame(self.test_df)
        self.events_df = pd.concat([self.train_df, self.test_df], ignore_index=True)

        print(
            f"  → Train: {before_train:,} event → {len(self.train_df):,} user-listing çifti | "
            f"Test: {before_test:,} event → {len(self.test_df):,} user-listing çifti"
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
            "split_strategy": "user_temporal_holdout",
            "holdout_items_per_user": self.HOLDOUT_ITEMS_PER_USER,
            "aggregation_strategy": "max_weight_per_user_listing",
            "n_users": n_users,
            "n_items": n_items,
            "n_raw_events": self.raw_event_count or n_interactions,
            "n_raw_train": self.raw_train_count or len(self.train_df),
            "n_raw_test": self.raw_test_count or len(self.test_df),
            "n_interactions": n_interactions,
            "n_observed_pairs": n_observed_pairs,
            "n_train": len(self.train_df),
            "n_test": len(self.test_df),
            "sparsity": sparsity,
            "n_categories": len(set(self.item_categories.values())),
            "raw_event_distribution": self.raw_event_distribution,
            "event_distribution": self.events_df["event"].value_counts().to_dict(),
            "weight_distribution": self.events_df["weight"].value_counts().sort_index().to_dict(),
        }

    def _print_stats(self):
        s = self.stats
        print("\n📊 PAÜ Market Veri Özeti:")
        print(f"   Kullanıcı sayısı    : {s['n_users']:,}")
        print(f"   İlan sayısı         : {s['n_items']:,}")
        print(f"   Ham event sayısı    : {s['n_raw_events']:,}")
        print(f"   Model gözlemi       : {s['n_interactions']:,}")
        print(f"   User-listing çifti  : {s['n_observed_pairs']:,}")
        print(f"   Train etkileşim     : {s['n_train']:,}")
        print(f"   Test etkileşim      : {s['n_test']:,}")
        print(f"   Seyreklik (sparsity): {s['sparsity']:.4%}")
        print(f"   Kategori sayısı     : {s['n_categories']}")
        print(f"   Ham event dağılımı  : {s['raw_event_distribution']}")
        print(f"   Event dağılımı      : {s['event_distribution']}")
        print(f"   Ağırlık dağılımı    : {s['weight_distribution']}")

    def get_train_sparse_matrix(self) -> coo_matrix:
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        rows = self.train_df["user_idx"].values
        cols = self.train_df["item_idx"].values
        data = self.train_df["weight"].values.astype(np.float32)

        return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))

    def get_train_lightfm_matrices(self) -> tuple[coo_matrix, coo_matrix]:
        """
        LightFM WARP için binary interaction ve ayrı sample_weight döndürür.

        LightFM sıralama modelinde pozitif etkileşim var/yok matrisi binary
        kalmalı; PAÜ event gücü ise sample_weight ile modele aktarılmalı.
        """
        n_users = len(self.user_id_map)
        n_items = len(self.item_id_map)

        rows = self.train_df["user_idx"].values
        cols = self.train_df["item_idx"].values
        weights = self.train_df["weight"].values.astype(np.float32)
        positives = np.ones_like(weights, dtype=np.float32)

        interactions = coo_matrix((positives, (rows, cols)), shape=(n_users, n_items))
        sample_weight = coo_matrix((weights, (rows, cols)), shape=(n_users, n_items))

        interactions.sum_duplicates()
        sample_weight.sum_duplicates()

        return interactions, sample_weight

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
