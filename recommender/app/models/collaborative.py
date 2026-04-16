from __future__ import annotations
"""
Model 2: İşbirlikçi Filtreleme — Surprise SVD
==============================================
Kullanıcı-ürün etkileşim matrisinde Singular Value Decomposition (SVD)
ile matris ayrıştırması yapar.

Referans:
    Koren, Y., Bell, R., & Volinsky, C. (2009).
    Matrix Factorization Techniques for Recommender Systems.
    IEEE Computer, 42(8), 30-37.

Kullanım:
    from app.models.collaborative import CollaborativeFilteringModel
    model = CollaborativeFilteringModel()
    model.train(preprocessor)
    recommendations = model.recommend(user_id=42, n=5)
"""

import numpy as np
import pandas as pd
from surprise import SVD, Dataset, Reader
from surprise.model_selection import cross_validate

from app.config import SVD_N_FACTORS, SVD_N_EPOCHS, SVD_LR_ALL, SVD_REG_ALL
from app.data.preprocessor import RetailRocketPreprocessor


class CollaborativeFilteringModel:
    """
    Surprise SVD tabanlı İşbirlikçi Filtreleme modeli.
    Implicit feedback ağırlıklarını (view=1, addtocart=3, transaction=5) rating olarak kullanır.
    """

    def __init__(self):
        self.model: SVD | None = None
        self.preprocessor: RetailRocketPreprocessor | None = None
        self.trainset = None
        self.is_trained = False

    def train(self, preprocessor: RetailRocketPreprocessor) -> dict:
        """
        Surprise SVD modelini eğitir.

        Args:
            preprocessor: Ön-işlenmiş veri

        Returns:
            dict: Eğitim istatistikleri
        """
        self.preprocessor = preprocessor
        print("\n🔧 [CF] Surprise SVD modeli eğitiliyor...")

        # Surprise formatında veri hazırla
        # Rating scale: 1 (view) - 5 (purchase)
        reader = Reader(rating_scale=(1, 5))

        train_data = preprocessor.train_df[["user_idx", "item_idx", "weight"]].copy()
        train_data.columns = ["user", "item", "rating"]

        dataset = Dataset.load_from_df(train_data, reader)
        self.trainset = dataset.build_full_trainset()

        # SVD modeli oluştur ve eğit
        self.model = SVD(
            n_factors=SVD_N_FACTORS,
            n_epochs=SVD_N_EPOCHS,
            lr_all=SVD_LR_ALL,
            reg_all=SVD_REG_ALL,
            verbose=True,
        )
        self.model.fit(self.trainset)
        self.is_trained = True

        stats = {
            "model": "Surprise SVD",
            "n_factors": SVD_N_FACTORS,
            "n_epochs": SVD_N_EPOCHS,
            "n_users": self.trainset.n_users,
            "n_items": self.trainset.n_items,
            "n_ratings": self.trainset.n_ratings,
        }

        print(f"  → Eğitim tamamlandı: {stats['n_ratings']:,} etkileşim üzerinde")
        return stats

    def recommend(self, user_idx: int, n: int = 5, exclude_known: bool = True) -> list[dict]:
        """
        Belirtilen kullanıcı için en iyi N öneriyi üretir.

        Args:
            user_idx: Kullanıcının sıralı index ID'si
            n: Kaç öneri döndürülecek
            exclude_known: Bilinen etkileşimleri hariç tut

        Returns:
            list[dict]: [{"item_idx": int, "score": float}, ...]
        """
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi. Önce train() çağırın.")

        n_items = self.preprocessor.get_n_items()

        # Kullanıcının bildiği ürünleri bul
        known_items = set()
        if exclude_known:
            user_interactions = self.preprocessor.train_df[
                self.preprocessor.train_df["user_idx"] == user_idx
            ]
            known_items = set(user_interactions["item_idx"].values)

        # Tüm ürünler için skor tahmin et
        predictions = []
        for item_idx in range(n_items):
            if item_idx in known_items:
                continue
            pred = self.model.predict(user_idx, item_idx)
            predictions.append({
                "item_idx": item_idx,
                "score": pred.est,
            })

        # Skora göre sırala ve en iyi N'i döndür
        predictions.sort(key=lambda x: x["score"], reverse=True)
        return predictions[:n]

    def predict(self, user_idx: int, item_idx: int) -> float:
        """Belirli bir kullanıcı-ürün çifti için skor tahmin eder."""
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi.")
        return self.model.predict(user_idx, item_idx).est
