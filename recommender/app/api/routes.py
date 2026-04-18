from __future__ import annotations
"""
FastAPI Route'ları
===================
Recommender System API endpoint'leri.

Endpoints:
    GET  /recommend/{user_idx}  → Hibrit öneri
    GET  /similar/{item_idx}    → Benzer ürünler
    POST /train                 → Modeli yeniden eğit
    GET  /metrics               → Performans metrikleri
    GET  /health                → Sağlık kontrolü
"""

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import (
    RecommendationResponse,
    RecommendationItem,
    SimilarItemResponse,
    TrainResponse,
    MetricsResponse,
    HealthResponse,
)

router = APIRouter()

# Global referanslar — main.py'de set edilecek
_recommender = None
_preprocessor = None
_evaluator_results = None


def set_recommender(recommender):
    global _recommender
    _recommender = recommender


def set_preprocessor(preprocessor):
    global _preprocessor
    _preprocessor = preprocessor


def set_evaluator_results(results):
    global _evaluator_results
    _evaluator_results = results


# ─── Endpoints ───────────────────────────────────────────────────


@router.get("/recommend/{user_idx}", response_model=RecommendationResponse)
async def get_recommendations(
    user_idx: int,
    n: int = Query(default=5, ge=1, le=50, description="Öneri sayısı"),
):
    """
    Belirtilen kullanıcı için hibrit öneri üretir.

    Anahtarlamalı strateji:
    - Soğuk başlangıç → Content-Based
    - Aktif kullanıcı → LightFM Hybrid
    """
    if _recommender is None or not _recommender.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Model henüz eğitilmedi. POST /train endpoint'ini çağırın."
        )

    n_users = _preprocessor.get_n_users()
    if user_idx < 0 or user_idx >= n_users:
        raise HTTPException(
            status_code=404,
            detail=f"Kullanıcı bulunamadı. Geçerli aralık: 0 - {n_users - 1}"
        )

    try:
        result = _recommender.recommend(user_idx, n)

        recommendations = [
            RecommendationItem(
                item_idx=rec["item_idx"],
                original_item_id=rec.get("original_item_id", -1),
                score=rec.get("score", rec.get("similarity", 0.0)),
            )
            for rec in result["recommendations"]
        ]

        return RecommendationResponse(
            user_idx=user_idx,
            recommendations=recommendations,
            model_used=result["model_used"],
            interaction_count=result["interaction_count"],
            cold_start_threshold=result["cold_start_threshold"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Öneri üretilirken hata: {str(e)}")


@router.get("/similar/{item_idx}", response_model=SimilarItemResponse)
async def get_similar_items(
    item_idx: int,
    n: int = Query(default=5, ge=1, le=50, description="Benzer ürün sayısı"),
):
    """Belirtilen ürüne en benzer N ürünü döndürür."""
    if _recommender is None or not _recommender.is_trained:
        raise HTTPException(status_code=503, detail="Model henüz eğitilmedi.")

    n_items = _preprocessor.get_n_items()
    if item_idx < 0 or item_idx >= n_items:
        raise HTTPException(
            status_code=404,
            detail=f"Ürün bulunamadı. Geçerli aralık: 0 - {n_items - 1}"
        )

    try:
        similar = _recommender.get_similar_items(item_idx, n)
        return SimilarItemResponse(
            source_item_idx=item_idx,
            similar_items=similar,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benzer ürünler bulunurken hata: {str(e)}")


@router.post("/train", response_model=TrainResponse)
async def train_models():
    """
    Tüm modelleri yeniden eğitir:
    - Content-Based NLP (Mercari ~4.9M ilan)
    - Collaborative Filtering SVD (RetailRocket ~2.7M event)
    - Hybrid LightFM WARP (RetailRocket + item features)

    ⚠️ Bu işlem ~8 dakika sürebilir!
    """
    from app.data.preprocessor import RetailRocketPreprocessor
    from app.data.loader import load_mercari
    from app.evaluation.evaluator import ModelEvaluator

    global _recommender, _preprocessor, _evaluator_results

    try:
        # 1. RetailRocket veri ön-işleme (CF + Hibrit modeller için)
        print("\n🚀 [Train] Adım 1/5: RetailRocket verisi ön-işleniyor...")
        preprocessor = RetailRocketPreprocessor()
        preprocessor.run()
        _preprocessor = preprocessor
        set_preprocessor(preprocessor)

        # 2. Mercari verisi yükleme (Content-Based NLP için)
        print("\n🚀 [Train] Adım 2/5: Mercari C2C verisi yükleniyor...")
        mercari_df = load_mercari()

        # 3. Tüm modelleri eğit
        print("\n🚀 [Train] Adım 3/5: 3 model eğitiliyor...")
        from app.models.recommender import HybridRecommender
        recommender = HybridRecommender()
        training_stats = recommender.train_all(preprocessor, mercari_df)
        _recommender = recommender
        set_recommender(recommender)

        # 4. Modelleri diske kaydet
        print("\n🚀 [Train] Adım 4/5: Modeller kaydediliyor...")
        recommender.save_models()

        # 5. CF + Hibrit modelleri RetailRocket test seti üzerinde değerlendir
        print("\n🚀 [Train] Adım 5/5: Değerlendirme...")
        evaluator = ModelEvaluator(recommender, preprocessor)
        eval_results = evaluator.run()
        _evaluator_results = evaluator.get_results_json()
        set_evaluator_results(_evaluator_results)

        return TrainResponse(
            status="success",
            training_stats=training_stats,
            message=(
                f"✅ Tüm modeller eğitildi! "
                f"RetailRocket: {preprocessor.stats['n_interactions']:,} etkileşim, "
                f"Mercari: {len(mercari_df):,} ilan"
            ),
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Eğitim hatası: {str(e)}")


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Son eğitimin performans metriklerini döndürür.
    Precision@K, Recall@K, NDCG@K, HitRate@K, MRR ve RMSE karşılaştırma tablosu.
    """
    if _evaluator_results is None:
        raise HTTPException(
            status_code=404,
            detail="Henüz değerlendirme yapılmadı. POST /train çağırarak modelleri eğitin."
        )

    return MetricsResponse(
        metrics=_evaluator_results,
        message="Değerlendirme metrikleri başarıyla getirildi.",
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Servis sağlık kontrolü."""
    models_loaded = _recommender is not None and _recommender.is_trained

    model_info = None
    if models_loaded and _recommender.training_stats:
        model_info = {
            "hybrid_model": _recommender.training_stats.get("hybrid_lightfm", {}).get("model"),
            "n_users": _recommender.training_stats.get("hybrid_lightfm", {}).get("n_users"),
            "n_items": _recommender.training_stats.get("hybrid_lightfm", {}).get("n_items"),
        }

    return HealthResponse(
        status="healthy",
        models_loaded=models_loaded,
        model_info=model_info,
    )
