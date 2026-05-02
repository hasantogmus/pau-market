# PAUMarket

PAUMarket, Pamukkale Üniversitesi öğrencileri için geliştirilen bir C2C kampüs pazaryeri projesidir. Sistem; React tabanlı istemci, ASP.NET Core Web API backend, SQL Server veritabanı ve Python/FastAPI recommender mikroservisinden oluşur.

## Mimari

- `PauMarket.Client`: React + Vite frontend
- `backend/src/PauMarket.API`: ASP.NET Core Web API
- `recommender`: FastAPI tabanlı hibrit öneri sistemi
- `docker-compose.yml`: tüm sistemi tek komutla ayağa kaldıran orchestration dosyası

Varsayılan portlar:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5251`
- Recommender API: `http://localhost:8000`
- SQL Server: `localhost:1433`

## Öne Çıkan Özellikler

- PAÜ e-posta kısıtlı kullanıcı kaydı ve JWT tabanlı kimlik doğrulama
- İlan oluşturma, görüntüleme, güncelleme, satıldı işaretleme ve silme
- Favoriler, mesajlaşma, anlaşma isteği ve kullanıcı profil/tercih yönetimi
- Recommender mikroservisi + cold-start fallback mantığı
- Docker Compose ile tek komutluk geliştirme ortamı

## Hızlı Başlangıç

### 1. Ortam değişkenlerini hazırla

Projede çalışma zamanı secret’ları `.env` ile yönetilir. Yeni kurulumda:

```bash
cd /Users/hasantogmus/Desktop/pau-market
cp .env.example .env
```

Sonra `.env` içindeki şu alanları kendi ortamına göre doldur:

- `MSSQL_SA_PASSWORD`
- `JWT_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 2. Tüm sistemi Docker ile ayağa kaldır

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose up -d --build
```

Durumu kontrol etmek için:

```bash
docker compose ps
```

Log izlemek için:

```bash
docker compose logs -f
```

Kapatmak için:

```bash
docker compose down
```

## Geliştirme Notları

### Sadece backend/frontend yeniden build etmek

Kod değişikliklerinden sonra çoğu durumda şu komut yeterlidir:

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose up -d --build backend frontend
```

### Manuel çalışma

#### Frontend

```bash
cd /Users/hasantogmus/Desktop/pau-market/PauMarket.Client
npm install
npm run dev
```

#### Backend

```bash
cd /Users/hasantogmus/Desktop/pau-market/backend/src/PauMarket.API
dotnet build
dotnet run
```

#### Recommender

```bash
cd /Users/hasantogmus/Desktop/pau-market/recommender
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Nightly LightFM Retraining

Kullanıcı etkileşimleri `dbo.Interactions` tablosunda birikir. `egitim_pipeline.py` bu veriyi kullanarak:

- güncel kullanıcı ve ilan mapping'ini yeniden oluşturur,
- yeni LightFM modelini eğitir,
- model dosyalarını atomik olarak kaydeder,
- ardından çalışan FastAPI servisine model reload çağrısı yapar.

FastAPI tarafında:

- `GET /health/model-status` ile aktif model durumu görülebilir,
- `POST /admin/reload-model` ile model bundle yeniden yüklenebilir.

Yerel makinede gece 03:00 görevi kurmak için:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register_nightly_retrain.ps1
```

Farklı saat veya Python yolu ile:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register_nightly_retrain.ps1 -RunAt "02:30" -PythonExe "C:\Python310\python.exe"
```

## Kullanılan Temel Komutlar

Frontend kalite kontrolleri:

```bash
cd /Users/hasantogmus/Desktop/pau-market/PauMarket.Client
npm run lint
npm run build
```

Backend kalite kontrolü:

```bash
cd /Users/hasantogmus/Desktop/pau-market
dotnet build backend/src/PauMarket.API/PauMarket.API.csproj
```

Compose doğrulaması:

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose config
```

## Önemli Dosyalar

- [docker-compose.yml](/Users/hasantogmus/Desktop/pau-market/docker-compose.yml)
- [.env.example](/Users/hasantogmus/Desktop/pau-market/.env.example)
- [backend/src/PauMarket.API/Program.cs](/Users/hasantogmus/Desktop/pau-market/backend/src/PauMarket.API/Program.cs)
- [docs/project_requirements.md](/Users/hasantogmus/Desktop/pau-market/docs/project_requirements.md)
- [docs/smoke_test_checklist.md](/Users/hasantogmus/Desktop/pau-market/docs/smoke_test_checklist.md)
- [docs/project_audit_report.md](/Users/hasantogmus/Desktop/pau-market/docs/project_audit_report.md)
- [docs/recommender_system_report.md](/Users/hasantogmus/Desktop/pau-market/docs/recommender_system_report.md)

## Notlar

- Root `.env` dosyası git’e dahil edilmez.
- Backend CORS artık config tabanlı whitelist kullanır.
- Recommender tarafı tez/prototip yaklaşımına göre ayrı mikroservis olarak çalışır.
- `npm run build` sırasında büyük bundle uyarısı görülebilir; bu şu an build’i kırmaz.
