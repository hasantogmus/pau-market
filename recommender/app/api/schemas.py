from __future__ import annotations
"""
API Şemaları — Pydantic Modelleri
==================================
FastAPI endpoint'leri için request/response modelleri.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── Response Modelleri ────────────────────────────────────────────

class RecommendationItem(BaseModel):
    """Tek bir öneri öğesi."""
    item_idx: int = Field(description="Modeldeki ürün index'i")
    original_item_id: int = Field(default=-1, description="Orijinal ürün ID'si")
    score: float = Field(description="Öneri skoru (yüksek = daha iyi)")


class RecommendationResponse(BaseModel):
    """Öneri endpoint'i yanıtı."""
    user_idx: int
    original_user_id: Optional[int] = None
    recommendations: list[RecommendationItem]
    model_used: str = Field(description="Hangi model kullanıldı (content_based/collaborative/hybrid_lightfm)")
    interaction_count: int = Field(description="Kullanıcının eğitim setindeki etkileşim sayısı")
    cold_start_threshold: int


class SimilarItemResponse(BaseModel):
    """Benzer ürünler yanıtı."""
    source_item_idx: int
    similar_items: list[dict]


class TrainResponse(BaseModel):
    """Model eğitimi yanıtı."""
    status: str
    training_stats: dict
    message: str


class MetricsResponse(BaseModel):
    """Değerlendirme metrikleri yanıtı."""
    metrics: dict
    message: str


class HealthResponse(BaseModel):
    """Sağlık kontrolü yanıtı."""
    status: str
    models_loaded: bool
    model_info: Optional[dict] = None
