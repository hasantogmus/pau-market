# 🧠 Paü Market — Recommender System Microservice

Pamukkale Üniversitesi C2C öğrenci pazaryeri için ML tabanlı hibrit öneri sistemi.

## Mimarı

```
Python FastAPI ─── 3 ML Model ─── Retailrocket Dataset
                                  
  /recommend/{user}  →  Anahtarlamalı Hibrit RS
  /similar/{item}    →  LightFM Item Embeddings
  /train             →  Model Eğitimi Pipeline
  /metrics           →  Precision@K, Recall@K, NDCG@K, RMSE
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
# auto: PAÜ CSV varsa onu, yoksa RetailRocket benchmark verisini kullanır
curl -X POST "http://localhost:8000/train?source=auto"

# RECOMMENDER_ADMIN_TOKEN tanımlıysa:
curl -X POST \
  -H "X-Recommender-Admin-Token: your-train-token" \
  "http://localhost:8000/train?source=auto"
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
POST /train?source=auto → PAÜ CSV varsa gerçek veriyle, yoksa benchmark veriyle eğitir
POST /train?source=paumarket → yalnızca PAÜ CSV ile eğitir
POST /train?source=retailrocket → yalnızca RetailRocket benchmark verisiyle eğitir
GET /metrics → metrikleri, veri seti özetini ve tez/demo notlarını JSON olarak döndürür
```

`RECOMMENDER_ADMIN_TOKEN` ortam değişkeni tanımlanırsa `/train` endpoint'i
`X-Recommender-Admin-Token` header'ı ister. Boş bırakılırsa lokal geliştirme için
eski davranış korunur.

`GET /metrics` çıktısında şu alanlar özellikle jüri/demo için tasarlandı:

- `comparison_table`: model bazlı Precision@K, Recall@K, NDCG@K, HitRate@K, MRR ve RMSE karşılaştırması.
- `dataset_summary`: kullanılan veri kaynağı, kullanıcı/ilan/etkileşim sayıları, train/test ayrımı, sparsity ve event dağılımı.
- `training_summary`: CF/LightFM için hangi interaction kaynağının kullanıldığı ve cold-start eşiği.
- `thesis_notes`: metriklerin nasıl yorumlanması gerektiğini açıklayan kısa savunma notları.

## PAÜ Market Etkileşim Sözleşmesi

Gerçek platform verisi biriktiğinde recommender modeli aşağıdaki davranış ağırlıklarıyla yeniden eğitilecek şekilde tasarlanmıştır:

| PAÜ Market olayı | Ağırlık | Anlam |
|---|---:|---|
| `view` | 1.0 | İlan görüntüleme |
| `message` | 2.0 | Satıcıyla mesajlaşma |
| `favorite` | 3.0 | İlanı favorileme |
| `deal_request` | 4.0 | Anlaşma isteği gönderme |
| `deal_accepted` | 4.5 | Anlaşma isteğinin kabul edilmesi |
| `purchase` | 5.0 | Satışın tamamlanması |

RetailRocket tarafındaki `addtocart` olayı, PAÜ Market'te `deal_request` davranışına karşılık gelen güçlü satın alma niyeti olarak yorumlanır.

## PAÜ Market Verisiyle Eğitim Geçişi

Gerçek platform verisi yeterli seviyeye geldiğinde `PauMarketPreprocessor`, SQL export'unu mevcut SVD/LightFM pipeline'ının beklediği formata dönüştürür.

Beklenen interaction export formatı:

```csv
user_id,listing_id,event,timestamp
12,1003,view,2026-04-20T12:00:00Z
12,1003,message,2026-04-20T12:01:00Z
12,1003,deal_request,2026-04-20T12:04:00Z
12,1003,purchase,2026-04-20T12:30:00Z
```

Opsiyonel listing metadata export formatı:

```csv
listing_id,category,condition,price,title,description
1003,Elektronik,Sıfır,12000,PlayStation 5,Temiz cihaz
```

Adapter kullanım örneği:

```python
from app.data.paumarket_preprocessor import PauMarketPreprocessor

preprocessor = PauMarketPreprocessor(
    interactions_path="app/data/datasets/paumarket_interactions.csv",
    listings_path="app/data/datasets/paumarket_listings.csv",
)
preprocessor.run()
```

Bu adapter gerçek `User.Id` ve `Listing.Id` değerlerini model içi `user_idx` / `item_idx` indekslerine çevirir. Model öneri üretirken `reverse_item_map` sayesinde tekrar gerçek `Listing.Id` döndürülebilir.

Backend export endpointleri:

```http
GET /api/recommender-export/interactions
GET /api/recommender-export/listings
```

Bu endpointler admin JWT gerektirir ve Python tarafındaki varsayılan dosya adlarıyla uyumlu CSV döndürür.

Docker/demo akışı:

```bash
# Tek komutla:
# 1. Backend'den gerçek PAÜ interaction/listing CSV exportlarını indirir.
# 2. CSV'leri recommender/app/data/datasets içine koyar.
# 3. Recommender'ı source=paumarket ile yeniden eğitir.
# 4. /metrics çıktısını ekrana basar.
ADMIN_TOKEN="admin-jwt-token" \
RECOMMENDER_ADMIN_TOKEN="your-train-token" \
./recommender/scripts/export_and_train_paumarket.sh
```

Varsayılan adresler `http://localhost:5251` ve `http://localhost:8000` olarak ayarlanmıştır.
Gerekirse `BACKEND_URL`, `RECOMMENDER_URL`, `DATASET_DIR`, `METRICS_OUTPUT` ve
`RECOMMENDER_ADMIN_TOKEN` değişkenleriyle override edilebilir.

`source=auto` modunda `paumarket_interactions.csv` eğitim için hazırsa PAÜ verisi seçilir; dosya yoksa veya çok küçükse sistem RetailRocket benchmark verisine kontrollü şekilde düşer.
