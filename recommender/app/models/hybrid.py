from __future__ import annotations
"""
Model 3: Hibrit Model — LightFM (WARP Loss)
=============================================
Kullanıcı-ürün etkileşimlerini VE ürün özelliklerini (kategori) birlikte kullanarak
metadata-aware hibrit matrix factorization yapar.

WARP (Weighted Approximate-Rank Pairwise) loss fonksiyonu, implicit feedback
(görüntüleme, favorileme, satın alma) verisiyle sıralama optimizasyonu yapar.

Referanslar:
    Kula, M. (2015). Metadata Embeddings for User and Item Cold-start Recommendations.
    RecSys Workshop on CBRecSys.

    Weston, J., Bengio, S., & Usunier, N. (2011).
    WSABIE: Scaling Up To Large Vocabulary Image Annotation.
    IJCAI.

Kullanım:
    from app.models.hybrid import HybridLightFMModel
    model = HybridLightFMModel()
    model.train(preprocessor)
    recommendations = model.recommend(user_id=42, n=5)
"""

import numpy as np
from lightfm import LightFM
from lightfm.data import Dataset as LFMDataset
from scipy.sparse import coo_matrix, identity, hstack, eye

from app.config import (
    LIGHTFM_NO_COMPONENTS,
    LIGHTFM_LEARNING_RATE,
    LIGHTFM_EPOCHS,
    LIGHTFM_LOSS,
)
from app.data.preprocessor import RetailRocketPreprocessor


class HybridLightFMModel:
    """
    LightFM ile Hibrit Öneri Modeli.

    Özellikler:
        - Implicit feedback (WARP loss)
        - Ürün kategori bilgisini feature olarak kullanır
        - Soğuk başlangıçta metadata üzerinden öneri üretebilir
    """

    def __init__(self):
        self.model: LightFM | None = None
        self.preprocessor: RetailRocketPreprocessor | None = None
        self.item_features: coo_matrix | None = None
        self.is_trained = False
        self._n_users = 0
        self._n_items = 0

    def train(self, preprocessor: RetailRocketPreprocessor) -> dict:
        """
        LightFM hibrit modelini eğitir.

        Args:
            preprocessor: Ön-işlenmiş RetailRocket verisi

        Returns:
            dict: Eğitim istatistikleri
        """
        self.preprocessor = preprocessor
        self._n_users = preprocessor.get_n_users()
        self._n_items = preprocessor.get_n_items()

        print("\n🧠 [Hybrid] LightFM WARP modeli eğitiliyor...")
        print(f"   Parametreler: components={LIGHTFM_NO_COMPONENTS}, "
              f"lr={LIGHTFM_LEARNING_RATE}, epochs={LIGHTFM_EPOCHS}")

        # ── Etkileşim matrisi ──
        interactions = preprocessor.get_train_sparse_matrix()
        print(f"   Etkileşim matrisi: {interactions.shape}, nnz={interactions.nnz:,}")

        # ── Ürün özellik matrisi oluştur ──
        self.item_features = self._build_item_features(preprocessor)

        # ── Model oluştur ──
        self.model = LightFM(
            no_components=LIGHTFM_NO_COMPONENTS,
            learning_rate=LIGHTFM_LEARNING_RATE,
            loss=LIGHTFM_LOSS,
            random_state=42,
        )

        # ── Eğitim ──
        print(f"   Eğitim başlıyor ({LIGHTFM_EPOCHS} epoch)...")
        for epoch in range(LIGHTFM_EPOCHS):
            self.model.fit_partial(
                interactions,
                item_features=self.item_features,
                epochs=1,
                num_threads=4,
            )
            if (epoch + 1) % 10 == 0 or epoch == 0:
                print(f"   → Epoch {epoch + 1}/{LIGHTFM_EPOCHS} tamamlandı")

        self.is_trained = True

        stats = {
            "model": "LightFM Hybrid (WARP)",
            "no_components": LIGHTFM_NO_COMPONENTS,
            "learning_rate": LIGHTFM_LEARNING_RATE,
            "epochs": LIGHTFM_EPOCHS,
            "n_users": self._n_users,
            "n_items": self._n_items,
            "n_interactions": interactions.nnz,
            "n_item_features": self.item_features.shape[1] if self.item_features is not None else 0,
        }

        print(f"   ✓ Eğitim tamamlandı!")
        return stats

    def _build_item_features(self, preprocessor: RetailRocketPreprocessor) -> coo_matrix:
        """
        Ürün özellik matrisi oluşturur.

        Her ürün için:
        - Identity feature (ürün kendi ID'si) — bilinen ürünler için
        - Kategori feature (one-hot encoded) — soğuk başlangıç için kritik

        Returns:
            scipy.sparse.coo_matrix — shape (n_items, n_items + n_categories)
        """
        n_items = preprocessor.get_n_items()
        item_categories = preprocessor.item_categories
        item_id_map = preprocessor.item_id_map

        # Benzersiz kategorileri bul
        unique_cats = sorted(set(item_categories.values()))
        cat_to_idx = {cat: idx for idx, cat in enumerate(unique_cats)}
        n_cats = len(unique_cats)

        print(f"   Ürün özellik matrisi: {n_items} items × ({n_items} identity + {n_cats} category features)")

        # Identity matrix (her ürün kendi ID'sini feature olarak taşır)
        identity_features = eye(n_items, format="coo")

        if n_cats == 0:
            print("   → Kategori bilgisi yok, sadece identity features kullanılacak")
            return identity_features

        # Kategori one-hot matrisi
        cat_rows = []
        cat_cols = []
        cat_data = []

        for original_item_id, item_idx in item_id_map.items():
            if original_item_id in item_categories:
                cat_id = item_categories[original_item_id]
                if cat_id in cat_to_idx:
                    cat_rows.append(item_idx)
                    cat_cols.append(cat_to_idx[cat_id])
                    cat_data.append(1.0)

        category_matrix = coo_matrix(
            (cat_data, (cat_rows, cat_cols)),
            shape=(n_items, n_cats)
        )

        # Identity + Category birleştir
        combined = hstack([identity_features, category_matrix], format="coo")

        coverage = len(cat_data) / max(n_items, 1) * 100
        print(f"   → Kategori kapsam: {coverage:.1f}%")

        return combined

    def recommend(self, user_idx: int, n: int = 5, exclude_known: bool = True) -> list[dict]:
        """
        Belirtilen kullanıcı için LightFM hibrit önerilerini üretir.

        Args:
            user_idx: Kullanıcının sıralı index ID'si
            n: Kaç öneri döndürülecek
            exclude_known: Bilinen etkileşimleri hariç tut

        Returns:
            list[dict]: [{"item_idx": int, "score": float}, ...]
        """
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi. Önce train() çağırın.")

        # Tüm ürünler için skor hesapla
        item_ids = np.arange(self._n_items)

        scores = self.model.predict(
            user_ids=user_idx,
            item_ids=item_ids,
            item_features=self.item_features,
        )

        # Bilinen ürünleri maskelemek için
        if exclude_known:
            user_interactions = self.preprocessor.train_df[
                self.preprocessor.train_df["user_idx"] == user_idx
            ]
            known_items = set(user_interactions["item_idx"].values)

            for item_idx in known_items:
                if item_idx < len(scores):
                    scores[item_idx] = -np.inf

        # En yüksek skorlu N ürünü bul
        top_indices = np.argsort(-scores)[:n]

        results = []
        for idx in top_indices:
            if scores[idx] > -np.inf:
                results.append({
                    "item_idx": int(idx),
                    "score": float(scores[idx]),
                })

        return results

    def predict(self, user_idx: int, item_idx: int) -> float:
        """Belirli bir kullanıcı-ürün çifti için skor."""
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi.")

        score = self.model.predict(
            user_ids=np.array([user_idx]),
            item_ids=np.array([item_idx]),
            item_features=self.item_features,
        )
        return float(score[0])

    def get_similar_items(self, item_idx: int, n: int = 5) -> list[dict]:
        """
        Belirtilen ürüne en benzer N ürünü bulur.
        LightFM'in öğrendiği ürün embeddings'leri üzerinden cosine similarity hesaplar.

        Args:
            item_idx: Ürünün sıralı index ID'si
            n: Kaç benzer ürün döndürülecek

        Returns:
            list[dict]: [{"item_idx": int, "similarity": float}, ...]
        """
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi.")

        # Ürün embeddings'lerini al
        _, item_embeddings = self.model.get_item_representations(
            features=self.item_features
        )

        # Hedef ürünün vektörü
        target_embedding = item_embeddings[item_idx]

        # Cosine similarity hesapla
        norms = np.linalg.norm(item_embeddings, axis=1)
        norms[norms == 0] = 1e-10  # sıfır bölme koruması

        target_norm = np.linalg.norm(target_embedding)
        if target_norm == 0:
            target_norm = 1e-10

        similarities = np.dot(item_embeddings, target_embedding) / (norms * target_norm)

        # Kendisini hariç tut ve en benzerleri bul
        similarities[item_idx] = -1.0
        top_indices = np.argsort(-similarities)[:n]

        return [
            {"item_idx": int(idx), "similarity": float(similarities[idx])}
            for idx in top_indices
        ]
