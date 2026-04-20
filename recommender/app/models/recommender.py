from __future__ import annotations
"""
Anahtarlamalı Hibrit Orkestratör
=================================
3 modeli yönetir:
  - Model 1 (Content-Based NLP): Mercari verisinden eğitilir
  - Model 2 (Collaborative SVD): RetailRocket verisinden eğitilir
  - Model 3 (Hybrid LightFM):    RetailRocket verisinden eğitilir

Kullanıcının etkileşim geçmişine göre hangi modelin kullanılacağına karar verir.

Strateji (Burke, 2002 — Switching Hybrid):
    - interaction_count == 0  → Content-Based (soğuk başlangıç)
    - interaction_count > 0   → LightFM Hybrid (metadata-aware)

Kullanım:
    from app.models.recommender import HybridRecommender
    recommender = HybridRecommender()
    recommender.train_all(preprocessor, mercari_df)
    recs = recommender.recommend(user_idx=42, n=5)
"""

import joblib
from pathlib import Path
from typing import Any

from app.config import COLD_START_THRESHOLD, MODEL_DIR
from app.models.content_based import ContentBasedModel
from app.models.collaborative import CollaborativeFilteringModel
from app.models.hybrid import HybridLightFMModel


class HybridRecommender:
    """
    Anahtarlamalı (Switching) Hibrit Öneri Sistemi.

    Üç modeli yönetir ve kullanıcının durumuna göre en uygun olanı seçer.
    """

    def __init__(self):
        self.cb_model = ContentBasedModel()
        self.cf_model = CollaborativeFilteringModel()
        self.hybrid_model = HybridLightFMModel()
        self.preprocessor: Any | None = None
        self.is_trained = False
        self.training_stats: dict = {}
        self.cb_evaluation: dict = {}

    def train_all(
        self,
        preprocessor,
        mercari_df,
        interaction_source_label: str = "RetailRocket",
    ) -> dict:
        """
        Tüm modelleri farklı veri kaynaklarıyla eğitir.

        Args:
            preprocessor: Ön-işlenmiş etkileşim verisi (CF + Hibrit için)
            mercari_df: Mercari DataFrame'i (Content-Based NLP için)
            interaction_source_label: CF + Hibrit modellerinin veri kaynağı etiketi

        Returns:
            dict: Tüm modellerin eğitim istatistikleri
        """
        self.preprocessor = preprocessor

        print("\n" + "=" * 60)
        print("  Hibrit Recommender — Tüm Modeller Eğitiliyor")
        print(f"  📊 {interaction_source_label}: CF + Hibrit | Mercari: Content-Based NLP")
        print("=" * 60)

        # ── Model 1: Content-Based (MERCARI verisiyle) ──
        cb_stats = self.cb_model.train(mercari_df)

        # ── Content-Based kendi kategori doğruluk testi ──
        self.cb_evaluation = self.cb_model.evaluate_category_accuracy(
            n_samples=500, k=5
        )

        # ── Model 2: Collaborative Filtering (RETAILROCKET verisiyle) ──
        cf_stats = self.cf_model.train(preprocessor)

        # ── Model 3: LightFM Hybrid (RETAILROCKET verisiyle) ──
        hybrid_stats = self.hybrid_model.train(preprocessor)

        self.is_trained = True

        self.training_stats = {
            "content_based": cb_stats,
            "content_based_evaluation": self.cb_evaluation,
            "collaborative": cf_stats,
            "hybrid_lightfm": hybrid_stats,
            "cold_start_threshold": COLD_START_THRESHOLD,
            "data_sources": {
                "content_based": "Mercari C2C (NLP)",
                "collaborative": f"{interaction_source_label} (CF)",
                "hybrid": f"{interaction_source_label} (Hybrid + Features)",
            },
        }

        print("\n" + "=" * 60)
        print("  ✓ Tüm modeller başarıyla eğitildi!")
        print("=" * 60)

        return self.training_stats

    # ── Geriye dönük uyumluluk (eski API desteği) ──
    def train(self, preprocessor) -> dict:
        """
        Eski API uyumluluğu. Mercari olmadan sadece RetailRocket ile eğitir.
        Content-Based model bu durumda eğitilemez.
        """
        self.preprocessor = preprocessor

        print("\n" + "=" * 60)
        print("  Hibrit Recommender — RetailRocket Modelleri Eğitiliyor")
        print("  ⚠️  Mercari verisi yok, Content-Based NLP atlanacak")
        print("=" * 60)

        # CB model atlanır
        cb_stats = {"model": "Content-Based (ATLANILDI — Mercari verisi yok)"}

        cf_stats = self.cf_model.train(preprocessor)
        hybrid_stats = self.hybrid_model.train(preprocessor)

        self.is_trained = True

        self.training_stats = {
            "content_based": cb_stats,
            "collaborative": cf_stats,
            "hybrid_lightfm": hybrid_stats,
            "cold_start_threshold": COLD_START_THRESHOLD,
        }

        print("\n" + "=" * 60)
        print("  ✓ CF + Hibrit modeller eğitildi! (CB atlandı)")
        print("=" * 60)

        return self.training_stats

    def recommend(self, user_idx: int, n: int = 5) -> dict:
        """
        Anahtarlamalı hibrit öneri üretir.

        Karar mantığı:
            1. Kullanıcının train setindeki etkileşim sayısını bul
            2. 0 ise → Content-Based (soğuk başlangıç)
            3. > 0 ise → LightFM Hybrid

        Args:
            user_idx: Kullanıcı index ID'si
            n: Öneri sayısı

        Returns:
            dict: {
                "recommendations": [...],
                "model_used": str,
                "interaction_count": int
            }
        """
        if not self.is_trained:
            raise RuntimeError("Modeller henüz eğitilmedi. Önce train_all() çağırın.")

        # Kullanıcının etkileşim sayısını bul
        user_interactions = self.preprocessor.train_df[
            self.preprocessor.train_df["user_idx"] == user_idx
        ]
        interaction_count = len(user_interactions)

        # ── Anahtarlama Kararı ──
        if interaction_count == 0 and self.cb_model.is_trained:
            # Soğuk başlangıç: Content-Based (Mercari NLP)
            model_used = "content_based"
            recommendations = self.cb_model.recommend(user_idx, n)
        else:
            # Aktif kullanıcı: LightFM Hybrid
            model_used = "hybrid_lightfm"
            recommendations = self.hybrid_model.recommend(user_idx, n)

        # Orijinal item ID'leri ekle (RetailRocket modelleri için)
        if model_used != "content_based":
            for rec in recommendations:
                rec["original_item_id"] = self.preprocessor.reverse_item_map.get(
                    rec["item_idx"], -1
                )
        else:
            # CB model Mercari index'leri kullanır, orijinal ID yok
            for rec in recommendations:
                rec["original_item_id"] = rec.get("item_idx", -1)

        return {
            "recommendations": recommendations,
            "model_used": model_used,
            "interaction_count": interaction_count,
            "cold_start_threshold": COLD_START_THRESHOLD,
        }

    def get_similar_items(self, item_idx: int, n: int = 5) -> list[dict]:
        """
        Belirtilen ürüne benzer ürünleri döndürür.
        LightFM hybrid model kullanır (RetailRocket embeddings).

        Args:
            item_idx: Ürün index ID'si (RetailRocket)
            n: Döndürülecek ürün sayısı

        Returns:
            list[dict]
        """
        if not self.is_trained:
            raise RuntimeError("Modeller henüz eğitilmedi.")

        results = self.hybrid_model.get_similar_items(item_idx, n)

        for rec in results:
            rec["original_item_id"] = self.preprocessor.reverse_item_map.get(
                rec["item_idx"], -1
            )

        return results

    def get_similar_items_nlp(self, item_idx: int, n: int = 5) -> list[dict]:
        """
        Mercari NLP modeli üzerinden benzer ürünleri döndürür.
        İlan açıklamalarına dayalı metin benzerliği.

        Args:
            item_idx: Ürün index ID'si (Mercari)
            n: Döndürülecek ürün sayısı

        Returns:
            list[dict]
        """
        if not self.cb_model.is_trained:
            raise RuntimeError("Content-Based NLP modeli eğitilmedi.")

        return self.cb_model.get_similar_items(item_idx, n)

    def save_models(self, directory: Path | None = None):
        """Eğitilmiş modelleri diske kaydeder."""
        save_dir = directory or MODEL_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(self.cb_model, save_dir / "content_based.pkl")
        joblib.dump(self.cf_model, save_dir / "collaborative.pkl")
        joblib.dump(self.hybrid_model, save_dir / "hybrid_lightfm.pkl")
        joblib.dump(self.preprocessor, save_dir / "preprocessor.pkl")
        joblib.dump(self.training_stats, save_dir / "training_stats.pkl")

        print(f"\n💾 Modeller kaydedildi: {save_dir}")

    def load_models(self, directory: Path | None = None) -> bool:
        """Daha önce kaydedilmiş modelleri yükler."""
        load_dir = directory or MODEL_DIR

        required_files = [
            "collaborative.pkl",
            "hybrid_lightfm.pkl",
            "preprocessor.pkl",
            "training_stats.pkl",
        ]

        if not all((load_dir / f).exists() for f in required_files):
            print("[recommender] Kaydedilmiş model bulunamadı, yeniden eğitim gerekli.")
            return False

        print(f"\n📂 Modeller yükleniyor: {load_dir}")

        self.cf_model = joblib.load(load_dir / "collaborative.pkl")
        self.hybrid_model = joblib.load(load_dir / "hybrid_lightfm.pkl")
        self.preprocessor = joblib.load(load_dir / "preprocessor.pkl")
        self.training_stats = joblib.load(load_dir / "training_stats.pkl")

        # CB model opsiyonel (büyük dosya, var ise yükle)
        cb_path = load_dir / "content_based.pkl"
        if cb_path.exists():
            self.cb_model = joblib.load(cb_path)
            print("   → Content-Based NLP modeli yüklendi")

        self.is_trained = True

        print("   ✓ Tüm modeller yüklendi!")
        return True
