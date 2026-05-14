# PAUMarket Smoke Test Checklist

Bu dosya, projeyi ayağa kaldırdıktan sonra temel akışların gerçekten çalıştığını hızlıca doğrulamak için hazırlanmıştır. Amaç ayrıntılı test değil, sistemin demo ve geliştirme için hazır olup olmadığını kısa sürede kontrol etmektir.

## 1. Ortamı Ayağa Kaldır

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose up -d --build
docker compose ps
```

Beklenen:

- `paumarket-frontend` → `Up`
- `paumarket-backend` → `Up`
- `paumarket-recommender` → `Up`
- `paumarket-sql` → `Up (healthy)`

## 2. Temel URL Kontrolü

Tarayıcıda şunları aç:

- `http://localhost:5173`
- `http://localhost:5251/swagger`
- `http://localhost:8000/docs`

Beklenen:

- frontend beyaz ekran vermeden açılmalı
- backend swagger açılmalı
- recommender docs açılmalı

## 3. Auth Akışı

Kontrol:

1. kayıt sayfasını aç
2. `@posta.pau.edu.tr` uzantılı geçerli bir mail ile kayıt ol
3. login ekranına dön
4. giriş yap

Beklenen:

- form render bozulmamalı
- login sonrası navbar kullanıcı bilgisi göstermeli
- korumalı sayfalara erişim açılmalı

## 4. Ana Sayfa

Kontrol:

1. ana sayfa aç
2. ilan kartlarının geldiğini doğrula
3. arama kutusuna bir kelime yaz
4. filtre/arama sonucu görsel olarak değişiyor mu bak

Beklenen:

- ürün kartları görünmeli
- layout kırılmamalı
- arama sonrası sayfa boşalmamalı

## 5. İlan Detayı

Kontrol:

1. herhangi bir ürün kartına tıkla
2. detay sayfasını aç
3. başlık, fiyat, kategori, açıklama alanlarını kontrol et

Beklenen:

- detay route’u açılmalı
- `404` veya boş sayfa olmamalı
- mesaj butonu görünmeli

## 6. Favoriler

Kontrol:

1. giriş yapmış kullanıcı ile ana sayfadan bir ilanı favorile
2. kalp ikonunun dolduğunu doğrula
3. sayfayı yenile

Beklenen:

- favori state korunmalı
- ana grid kaybolmamalı

## 7. Mesajlaşma

Kontrol:

1. ilan detayından mesaj başlat
2. `/messages` sayfasına git
3. konuşmanın solda listelendiğini kontrol et
4. bir mesaj gönder

Beklenen:

- konuşma inbox listesinde görünmeli
- seçilen konuşma sağ panelde açılmalı
- okunmamış mesaj badge’i davranışı mantıklı olmalı

## 8. Profil ve Ayarlar

Kontrol:

1. `/profile` sayfasını aç
2. kullanıcı bilgileri ve dashboard özetini kontrol et
3. `/settings` sayfasına git
4. ad/soyad/bölüm/sınıf değiştir
5. tercihleri kaydet
6. `/profile` ekranına dön

Beklenen:

- profil yüklenmeli
- ayarlar kaydı çalışmalı
- profil güncel veriyi göstermeli

## 9. İlan Yönetimi

Kontrol:

1. `/listings/new` ile yeni ilan oluştur
2. `/my-listings` ekranına düş
3. ilanı düzenle
4. pasife al / yeniden yayına al
5. gerekirse sil

Beklenen:

- ilan oluşturma başarılı olmalı
- `İlanlarım` ekranı güncel liste göstermeli
- aktif/pasif durumu değişmeli
- silinen ilan listeden kalkmalı

## 10. Backend Sağlık Kontrolü

Terminal:

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose logs --tail 100 backend
docker compose logs --tail 100 recommender
```

Beklenen:

- sürekli exception akışı olmamalı
- istekler `200/201/204` seviyesinde dönmeli
- profil, mesaj, listing route’ları `404/405` vermemeli

## 11. Kalite Kapıları

Frontend:

```bash
cd /Users/hasantogmus/Desktop/pau-market/PauMarket.Client
npm run lint
npm run build
```

Backend:

```bash
cd /Users/hasantogmus/Desktop/pau-market
dotnet build backend/src/PauMarket.API/PauMarket.API.csproj
```

Beklenen:

- lint geçmeli
- build’ler hata vermemeli
- mevcut package vulnerability uyarıları ayrı backlog konusu olarak not alınmalı

## 12. Demo Öncesi Hızlı 2 Dakika Kontrol

Eğer çok az vaktiniz varsa sadece şunları kontrol edin:

1. `docker compose ps`
2. `http://localhost:5173`
3. login
4. ana sayfa ilanları
5. bir ilan detayı
6. `/profile`
7. `/messages`
8. `/my-listings`

## Arıza Notları

Sık görülen sorunlar:

- Yeni backend endpoint’i çalışmıyorsa çoğu zaman container eski image ile ayaktadır
- Çözüm:

```bash
cd /Users/hasantogmus/Desktop/pau-market
docker compose up -d --build backend frontend
```

- Profil veya ayarlar çalışmıyorsa önce backend loglarında `404/405` var mı bakın
- Favoriler veya mesajlar görünmüyorsa oturum token’ının geçerli olduğunu doğrulayın
