from __future__ import annotations
"""
Paü Market — Recommender System Microservice
=============================================
FastAPI giriş noktası.

Başlatma:
    cd recommender
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

API Dokümantasyonu:
    http://localhost:8000/docs  (Swagger UI)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import API_HOST, API_PORT
from app.api.routes import router, set_recommender, set_preprocessor, set_evaluator_results
from app.models.recommender import HybridRecommender


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Uygulama başlatılırken kaydedilmiş modelleri yüklemeye çalışır.
    Yoksa modeller POST /train ile eğitilmelidir.
    """
    print("\n🚀 Paü Market Recommender System başlatılıyor...")

    recommender = HybridRecommender()

    # Kaydedilmiş modelleri yüklemeyi dene
    if recommender.load_models():
        set_recommender(recommender)
        set_preprocessor(recommender.preprocessor)
        print("✓ Kaydedilmiş modeller yüklendi, servis hazır!\n")
    else:
        print("⚠ Kaydedilmiş model bulunamadı.")
        print("  → POST /train endpoint'ini çağırarak modelleri eğitin.\n")

    yield

    print("\n👋 Recommender System kapatılıyor...")


# ─── FastAPI Uygulaması ─────────────────────────────────────────

app = FastAPI(
    title="Paü Market Recommender System",
    description=(
        "Pamukkale Üniversitesi öğrenci pazaryeri için "
        "Hibrit Öneri Sistemi (ML) microservice.\n\n"
        "**3 Model:**\n"
        "- Content-Based (TF-IDF + Cosine Similarity)\n"
        "- Collaborative Filtering (Surprise SVD)\n"
        "- Hybrid (LightFM + WARP Loss) ⭐\n\n"
        "**Veri:** Retailrocket E-Commerce Dataset (Kaggle)"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:5251",   # .NET backend
        "http://localhost:3000",   # Alternatif dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Route'ları ekle ───────────────────────────────────────────
app.include_router(router, prefix="", tags=["Recommender System"])


# ─── Doğrudan çalıştırma ──────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
