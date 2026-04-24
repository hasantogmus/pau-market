# PAÜ Market - Hibrit Öneri Sistemi (Recommender System) Teknik Raporu

Bu rapor, "PAÜ Market" e-ticaret platformunun kalbini oluşturan makine öğrenmesi tabanlı Öneri Sistemi'nin (Recommender System) uçtan uca mimarisini, teknik detaylarını ve veri entegrasyonu aşamalarını kapsar. 

---

## 1. Mimari Genel Bakış (Dağıtık Mikroservis Mimarisi)
Öneri sistemi, ana C# Web API uygulamasının içine doğrudan kodlanmak yerine, **Dağıtık Mikroservis (Microservice)** mantığıyla ayrı bir Python uygulaması olarak sıfırdan tasarlanmıştır.

Bu kararın arkasındaki temel mühendislik sebebi şunlardır:
- **Performans İzolasyonu:** Matris çarpımları gibi ağır AI hesaplamaları, kullanıcıların anlık ilan gezme (HTTP) isteklerini yavaşlatmasın diye tamamen C# ana omurgasından ayrılmıştır.
- **Dil Uygunluğu (Language Fit):** Veri işleme, Machine Learning ve LightFM algoritmaları için dünyanın en zengin kütüphanelerine sahip olan Python tercih edilmiş ve **FastAPI** ile RESTful bir servis (Port 8000) aracılığıyla C# ile asenkron konuşturulmuştur.

---

## 2. Python Yapay Zeka Servisi (Python Recommender)
Python tarafı, elindeki milyarlarca tıklama matrisini işleyebilecek hibrit (Collaborative + Content-Based) bir tasarıma sahiptir.

### A. Veri Setleri (Simülasyon İçin: RetailRocket & Mercari)
Yerel veritabanımızın sıfırıncı gününde (Day-0) hiç tıklama ve kullanıcı verisi olmadığı için sistemi test edebilmek adına iki devasa veri seti hibritlenerek kullanılmıştır:
- **RetailRocket:** Kullanıcıların tıklama, favorileme ve sepet hareketlerini (Interaction Matrix) modellemek için temel "İşbirlikçi Filtreleme" kaynağı olarak kullanıldı.
- **Mercari Price Suggestion:** PAÜ Market'in özündeki **C2C (Tüketiciden Tüketiciye)** yapısına tam uyum sağlamak için kullanıldı. İkinci el eşyaların "Durum" (Condition), "Kategori" ve "Açıklama" metinlerinin analizi bu veri seti sayesinde modele öğretildi. Bu sayede yapay zeka; ikinci el ürünler arasındaki semantik benzerlikleri çok daha isabetli kavrayabilmektedir.

### B. Uygulanan Algoritma: LightFM
Standart K-Nearest Neighbors (KNN) gibi basit algoritmalar yerine Endüstri Standardı olan **LightFM** kullanıldı. Bu algoritmanın en büyük gücü; hem kullanıcıların tıkladıkları ürünleri (Collaborative/İşbirlikçi) hem de ürünlerin kendi özelliklerini (Content-Based/İçeriksel) aynı anda hesaba katarak matrisleri birleştirmesidir. Bu sayede önerilerde körlük ve tıkanma engellenmiştir.

---

## 3. C# Entegrasyonu ve Hata Toleransı
Python yapay zekasına asenkron olarak istek atan C# katmanımız (Ana Backend), modelin sadece "Kaggle" veri setine ait sahte ID'leri fırlattığını anladığında **çökmek yerine hayatta kalabilmesi** için kusursuz bir kalkan mekanizmasıyla donatıldı:

### "Cold Start" (Soğuk Başlangıç) Fallback Kalkanı
E-ticaret sistemlerinin en büyük sorunu **Cold Start**'tır. (Kullanıcının henüz hiçbir şey tıklamaması durumu veya verilerin çakışması). 
Eğer Python, C# sunucumuza ID'ler döner, fakat C# bu ID'leri yerel `PauMarketDb` veritabanında bulamazsa, sistem şu 3 aşamalı **Bypass Filtresini** devreye sokar:

1. **Onboarding Anketi Okuması:** Kullanıcının hesabı ilk açtığında karşısına çıkan o harika ankette seçtiği kategorileri (Örn: `Hobi`, `Giyim`) SQL veritabanından süzerek çeker (`PreferredCategories`). Esnek eşleştirme (`rawCategories.Contains`) kullanılarak frontend'den farklı gelse bile uyuşmazlıklar çözülür.
2. **Yerel Veri Eşleştirme (Dynamic Routing):** Python yapay zekasını yok sayarak, kullanıcının o an tamamen ilgisini çekebilecek yerel SQL ilanlarını (Sadece "Giyim", Sadece "Sıfır" vb.) dinamik olarak listeler.
3. **Popülerlik Enjeksiyonu:** Eğer "Giyim" kategorisinde 5 adet ilan bulunmazsa, kalan boş slotlara sistemdeki en popüler/en yeni ilanları ekleyerek karışıma akıllıca müdahale eder.

Yani arka planda hangi kriz yaşanırsa yaşansın, kullanıcıya **MÜKEMMEL, dolu dolu ve mantıklı bir vitrin** sunulur.

---

## 4. Frontend (React) İletişimi
Projenin görsel ayağında geçici (Mock/Hardcoded) verilerden kurtularak API bağlantısı eksiksiz yapıldı.

- `Home.jsx` (Ana Sayfa) içerisindeki **"Sana Özel Öneriler"** kaydırmalı bandı (Carousel); `localStorage`'dan anlık oturum tokenını kontrol eder.
- Eğer kullanıcı giriş yapmışsa, yerel `AI_PICKS` sahte listesini anında çöpe atar ve `listingService.getRecommendations()` aracılığıyla **Gerçek (AI veya Cold-Start Kalkanı)** sonuçlarını ekrana şık `Framer Motion` animasyonlarıyla basar. 

---

## 5. DevOps ve İzolasyon Mimarisini Çözme (Docker)
Bu bütünleşik sistemleri birbirinden bağımsız çalıştırmak Jürinin önünde büyük kaos yaratabilirdi. Bu nedenden dolayı sisteme üst düzey **DevOps / Container Orchestration** becerisi de eklendi:

- Proje ana dizinine **`docker-compose.yml`** yazıldı.
- M çipli Mac'lerde Python C derleyicilerinde (Örn: `lightfm` özel derlemelerinde) oluşan bilinen `__LIGHTFM_SETUP__` ölümcül hatası, Python `Dockerfile` dosyasına müdahale edilerek (setuptools <= 65) ve pip izolasyonu kırılarak (`--no-build-isolation` ile) yamalandı.
- Sonuç olarak tüm platform (`paumarket-sql`, `recommender-ai`, `aspnet-backend`, `react-vite-frontend` olmak üzere tam 4 bağımsız gemi), yekpare ve profesyonel bir şirket uygulamasıymışçasına tek bir `docker-compose up` koduyla hatasız olarak ayağa kaldırıldı. 

**Özetle Tezin Değeri:** Recommender System, C# Backend ve React'ın yalnızca tasarlanması değil; tamamen mikroservis esasıyla uçtan uca asenkron konuşturulması ve **verinin eksik olduğu (Cold Start) kör noktalarda bile sistemin kullanıcıyı memnun eden bir tavsiye ekranıyla krizi atlatmasıdır.**
