# PAUMarket Client

PAUMarket frontend uygulaması React + Vite ile geliştirilmiştir.

## Komutlar

```bash
cd /Users/hasantogmus/Desktop/pau-market/PauMarket.Client
npm install
npm run dev
```

Build ve lint:

```bash
npm run lint
npm run build
```

## Ortam Değişkeni

Frontend backend adresini `VITE_API_URL` ile okur.

Örnek:

```bash
VITE_API_URL=http://localhost:5251/api
```

Docker Compose kullanıyorsan bu değer kök `.env` ve `docker-compose.yml` üzerinden zaten sağlanır.

## Kapsam

Frontend içinde şu temel akışlar bulunur:

- giriş / kayıt
- ana sayfa ve ilan detayları
- ilan oluşturma
- ilan yönetimi
- favoriler
- mesajlar
- profil ve ayarlar

Ana proje dokümantasyonu için kökteki [README.md](/Users/hasantogmus/Desktop/pau-market/README.md) dosyasına bak.
