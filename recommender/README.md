# 🧠 Paü Market — Recommender System Microservice

Pamukkale Üniversitesi C2C öğrenci pazaryeri için ML tabanlı hibrit öneri sistemi.

## Mimarı

```
Python FastAPI ─── 3 ML Model ─── Retailrocket Dataset
                                  
  /recommend/{user}  →  Anahtarlamalı Hibrit RS
  /similar/{item}    →  LightFM Item Embeddings
  /train             →  Model Eğitimi Pipeline
  /metrics           →  Precision@K, Recall@K, NDCG@K
  /health            →  Servis Durumu
```

## Kurulum

```bash
cd recommender

# 1. Virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux

# 2. Bağımlılıkları kur
pip install -r requirements.txt

# 3. Kaggle API key'i ayarla
# ~/.kaggle/kaggle.json dosyası gerekli
# https://www.kaggle.com/settings → API → Create New Token

# 4. Servisi başlat
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 5. Modeli eğit (ilk seferde)
curl -X POST http://localhost:8000/train
```

## API Dokümantasyonu

Swagger UI: http://localhost:8000/docs

## ML Modelleri

| Model | Kütüphane | Yöntem | Dataset |
|---|---|---|---|
| Content-Based | scikit-learn | TF-IDF + Cosine Similarity | Mercari + RetailRocket |
| Collaborative | Surprise | SVD Matrix Factorization | RetailRocket |
| **Hybrid** ⭐ | LightFM | WARP + Item Features | RetailRocket |

## Değerlendirme

```
POST /train → otomatik olarak 3 modeli eğitir + değerlendirir
GET /metrics → sonuçları JSON olarak döndürür
```
