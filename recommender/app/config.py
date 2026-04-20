from __future__ import annotations
"""
Recommender System — Merkezi Konfigürasyon
==========================================
Tüm yol, parametre ve sabitler burada tanımlanır.
"""

import os
from pathlib import Path

# ─── Dizin Yapısı ──────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "datasets"
MODEL_DIR = BASE_DIR / "trained_models"

# Dizinlerin var olduğundan emin ol
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ─── RetailRocket Dataset Ayarları ─────────────────────────────────────
RETAILROCKET_KAGGLE_DATASET = "retailrocket/ecommerce-dataset"
RETAILROCKET_EVENTS_FILE = DATA_DIR / "events.csv"
RETAILROCKET_ITEM_PROPS_1 = DATA_DIR / "item_properties_part1.csv"
RETAILROCKET_ITEM_PROPS_2 = DATA_DIR / "item_properties_part2.csv"
RETAILROCKET_CATEGORY_TREE = DATA_DIR / "category_tree.csv"

# ─── Mercari Dataset Ayarları ─────────────────────────────────────────
MERCARI_KAGGLE_DATASET = "c/mercari-price-suggestion-challenge"
MERCARI_TRAIN_FILE = DATA_DIR / "train.tsv"
MERCARI_TEST_FILE = DATA_DIR / "test_stg2.tsv"

# ─── PAÜ Market Export Ayarları ─────────────────────────────────────
PAUMARKET_INTERACTIONS_FILE = DATA_DIR / "paumarket_interactions.csv"
PAUMARKET_LISTINGS_FILE = DATA_DIR / "paumarket_listings.csv"
RECOMMENDER_DATA_SOURCE = os.getenv("RS_DATA_SOURCE", "auto").strip().lower()
PAUMARKET_MIN_TRAINING_INTERACTIONS = int(os.getenv("PAUMARKET_MIN_TRAINING_INTERACTIONS", "2"))

# ─── Etkileşim Ağırlıkları ───────────────────────────────────────────
# RetailRocket simülasyon eventleri.
# PAÜ Market karşılığı:
#   view        → ilan görüntüleme
#   addtocart   → anlaşma isteği / güçlü satın alma niyeti
#   transaction → tamamlanmış satış
EVENT_WEIGHTS = {
    "view": 1,
    "addtocart": 3,
    "transaction": 5,
}

# PAÜ Market gerçek etkileşim sözleşmesi.
# Bu sözleşme, ileride SQL export'u ile model yeniden eğitilirken kullanılacak.
PAUMARKET_EVENT_WEIGHTS = {
    "view": 1.0,
    "message": 2.0,
    "favorite": 3.0,
    "deal_request": 4.0,
    "deal_accepted": 4.5,
    "purchase": 5.0,
}

# ─── Veri Ön-İşleme Parametreleri ────────────────────────────────────
MIN_USER_INTERACTIONS = 3    # Toplam veri kaybını önlemek için 5'ten 3'e düşürüldü
MIN_ITEM_INTERACTIONS = 3    # CF için filtre
TRAIN_TEST_SPLIT_RATIO = 0.8  # %80 train, %20 test (zaman bazlı)

# ─── Model Hiperparametreleri ──────────────────────────────────────────
# LightFM
LIGHTFM_NO_COMPONENTS = 64        # Latent factor boyutu
LIGHTFM_LEARNING_RATE = 0.05
LIGHTFM_EPOCHS = 30
LIGHTFM_LOSS = "warp"             # Weighted Approximate-Rank Pairwise

# Surprise SVD
SVD_N_FACTORS = 50
SVD_N_EPOCHS = 20
SVD_LR_ALL = 0.005
SVD_REG_ALL = 0.02

# ─── Değerlendirme ───────────────────────────────────────────────────
EVAL_K_VALUES = [5, 10, 20]       # Precision@K ve Recall@K için K değerleri
PRIMARY_K = 5                     # Ana raporlama metriği: @5

# ─── API Ayarları ───────────────────────────────────────────────────
API_HOST = os.getenv("RS_HOST", "0.0.0.0")
API_PORT = int(os.getenv("RS_PORT", "8000"))

# ─── Anahtarlamalı Hibrit Eşik Değeri ──────────────────────────────
# Bu değerden az etkileşimi olan kullanıcılar → Content-Based
# Bu değerden fazla → LightFM Hybrid
COLD_START_THRESHOLD = 5
