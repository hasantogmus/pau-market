# PAU Market Recommender System - Matris, Matematik ve Cikti Savunma Notu

Bu dosya, tez hocasina onerici sistemin "matrisi nasil olusturuldu, hangi matematiksel model kullanildi, agirliklar neye gore verildi ve sistemden hangi ciktilar alinabiliyor?" sorularina hazir cevap vermek icin hazirlanmistir.

## 1. Kisa Savunma Ozeti

PAU Market onerici sistemi iki katmanli calisir:

1. **Canli kisilestirme katmani (Backend):** Kullanicinin anlik goruntuleme, favori, mesaj ve anlasma sinyallerini hemen kullanir. Yeniden egitim beklemeden ana sayfadaki "Sana Ozel Oneriler" alanini gunceller.
2. **Model tabanli katman (Python/FastAPI):** PAU Market etkilesim export'u ile LightFM tabanli hibrit model egitir. Yeterli etkilesim gecmisi olan kullanicilarda collaborative + kategori ozellikli siralama uretir.

Bu ayrim onemlidir: Bir kullanici favori yaptiginda veya mesaj attiginda sistem hemen tepki verebilir; fakat daha derin "bu kullaniciya benzeyenler neleri begendi?" bilgisinin modele yansimasi icin yeniden egitim gerekir.

## 2. Veri Akisi

Uretim akisi su sekildedir:

```mermaid
flowchart LR
    A["Frontend\nGoruntuleme, favori, mesaj, anlasma"] --> B["C# Backend\nInteraction tablosu"]
    B --> C["Recommender Export CSV\nuser_id, listing_id, event, timestamp, weight"]
    C --> D["Python Preprocessor\nID mapping + train/test split"]
    D --> E["Sparse Interaction Matrix\nR: user x listing"]
    E --> F["LightFM Hybrid Model\nWARP ranking loss"]
    F --> G["original_item_id = PAU Listing.Id"]
    G --> H["Backend dogrular\naktif/onayli/satilmamis ilan"]
    H --> I["Frontend\nSana Ozel Oneriler"]
```

Backend export dosyalari:

- `GET /api/recommender-export/interactions`
- `GET /api/recommender-export/listings`

Bu endpointler admin korumalidir. Boylece model egitim verisi normal kullaniciya acilmaz.

## 3. Interaction Matrisi Nasil Olusturuluyor?

Modelin ana girdisi kullanici-ilan etkilesim matrisidir:

```text
R ∈ R^(|U| x |I|)
```

Burada:

- `U`: kullanici kumesi
- `I`: ilan kumesi
- `R[u, i]`: kullanici `u` ile ilan `i` arasindaki ilgi gucu

Backend her etkileşimi CSV'ye su formatta verir:

```csv
user_id,listing_id,event,timestamp,weight
1005,2102,favorite,2026-04-27T09:12:00Z,3.0
1005,2200,view,2026-04-27T09:15:00Z,1.0
```

Python preprocessor bu ID'leri modelin kullanacagi sirali indexlere cevirir:

```text
user_id    -> user_idx
listing_id -> item_idx
item_idx   -> original Listing.Id
```

Bu mapping kritik bir savunma noktasi: Model kendi icinde `0..N` indexleriyle calisir, fakat backend'e donerken mutlaka gercek PAU Market `Listing.Id` degeri kullanilir.

## 4. Etkilesim Agirliklari

PAU Market'te klasik e-ticaret sepet akisi yoktur. Bu nedenle RetailRocket'taki "addtocart" davranisi bizde "anlasma istegi / satin alma niyeti" olarak yorumlanir. PAU Market'in gercek davranis agirliklari backend'de tek kaynak olarak hesaplanir:

| Event | Agirlik | Anlam |
|---|---:|---|
| `view` | `1.0` | Ilani gormek, zayif ilgi |
| `message` | `2.0` | Saticiyla iletisime gecmek |
| `favorite` | `3.0` | Bilincli ilgi, tekrar bakma niyeti |
| `deal_request` | `4.0` | Anlasma istegi, guclu satin alma niyeti |
| `deal_accepted` | `4.5` | Satici tarafindan kabul edilen niyet |
| `purchase` | `5.0` | Tamamlanmis satis, en guclu pozitif sinyal |

Matris mantigi:

```text
R[user_idx, item_idx] = kullanicinin ilana verdigi implicit feedback gucu
```

Ayni kullanici-ilan-event tekrar ederse en son kayit tutulur. Farkli event turleri ayni user-listing hucresinde birikerek daha guclu ilgi sinyali gibi davranir.

## 5. Train/Test Split ve Data Leakage Onlemi

PAU Market preprocessor akisi:

1. CSV yuklenir.
2. Event isimleri normalize edilir.
3. Backend'den gelen `weight` kolonu okunur.
4. Duplikatlar temizlenir.
5. Zaman bazli `80/20` train/test split yapilir.
6. Sparse filtreleme sadece train evreni uzerinde yapilir.
7. Test seti train'de gorulen kullanici/ilan evrenine hizalanir.

Bu sira bilincli secildi. Once split, sonra train tabanli filtreleme yapildigi icin gelecek test etkileşimleri modelin egitim evrenini belirlemez. Bu, offline metriklerin yapay olarak sisirilmesini engeller.

Kod karsiligi:

- `/Users/hasantogmus/Desktop/pau-market/recommender/app/data/paumarket_preprocessor.py`
- `TRAIN_TEST_SPLIT_RATIO = 0.8`

## 6. Sparse Matris

Etkilesim matrisi cok seyrektir. Her kullanici her ilani gormez. Bu nedenle dense matris yerine `scipy.sparse.coo_matrix` kullanilir:

```python
coo_matrix((weights, (user_idx, item_idx)), shape=(n_users, n_items))
```

Ornek metrik ciktisina gore mevcut egitim kosusunda:

```text
n_users        : 103
n_items        : 214
n_interactions : 1946
sparsity       : 91.3211%
```

Yani matrisin yaklasik `%91.3` kismi bostur. Sparse matris kullanmak hem RAM hem de egitim performansi icin gereklidir.

## 7. Item Feature Matrisi

LightFM sadece kullanici-ilan etkileşimini degil, ilan ozelliklerini de kullanir. Bizde item feature matrisi su sekilde kurulur:

```text
F_item = [I_items | OneHot(category)]
```

Yani her ilan iki tip ozellik tasir:

1. **Identity feature:** Ilanin kendi kimligi.
2. **Category feature:** Elektronik, Giyim, Ev Esyasi gibi kategori bilgisi.

Bu sayede model sadece "kim neye tikladi" bilgisini degil, "hangi kategoriye ilgi var" bilgisini de ogrenir.

Kod karsiligi:

- `/Users/hasantogmus/Desktop/pau-market/recommender/app/models/hybrid.py`

## 8. Kullanilan Model: LightFM + WARP

Model:

```text
LightFM Hybrid Model
loss = WARP
no_components = 64
learning_rate = 0.05
epochs = 30
```

LightFM, kullanici ve ilanlari latent vektor uzayinda temsil eder. Basit anlatimla skor su fikre dayanir:

```text
score(u, i) = user_vector(u) · item_vector(i) + bias terms
```

Hibrit durumda item vektoru sadece item ID'den degil, item feature matrisinden de beslenir. Bu nedenle kategori bilgisi de skoru etkiler.

WARP (Weighted Approximate-Rank Pairwise) loss, explicit puan tahmininden cok siralama kalitesini optimize eder. Yani modelin amaci "bu urune 4.2 puan verir" demekten ziyade:

```text
Kullanicinin ilgilendigi ilanlar, ilgilenmedigi ilanlardan daha yukarida siralansin.
```

Bu PAU Market icin dogrudur, cunku elimizde Netflix gibi 1-5 yildiz puani yok; implicit feedback vardir.

## 9. Oneri Uretme

Egitimden sonra model bir kullanici icin tum ilanlara skor verir:

```text
scores = model.predict(user_idx, all_item_idx)
```

Sonra:

1. Kullanicinin zaten etkilesim verdigi ilanlar maskelenir.
2. Skoru en yuksek `N` ilan secilir.
3. `item_idx` tekrar gercek `Listing.Id` degerine cevrilir.
4. Backend bu ID'leri kontrol eder:
   - ilan onayli mi?
   - satilmamis mi?
   - kullanicinin kendi ilani degil mi?
   - hala veritabaninda var mi?

Bu son kontrol, ID uyumsuzlugu veya silinmis ilan riskine karsi guvenlik katmanidir.

## 10. Cold Start Yaklasimi

Sistemde cold-start esigi:

```text
COLD_START_THRESHOLD = 5
```

Bir kullanicinin train setinde 5'ten az etkileşimi varsa Python model canli PAU ilan ID'si uretmeye zorlanmaz. Bunun yerine `backend_fallback` doner. Backend su kaynaklarla oneriyi doldurur:

1. Anlik canli etkileşimler: goruntuleme, favori, mesaj, anlasma.
2. Onboarding tercihleri.
3. Kategori/condition benzerligi.
4. En yeni veya popüler onayli ilanlar.

Bu karar ozellikle iki veri seti savunmasinda onemlidir: Mercari veya RetailRocket ID'leri PAU Market ID'siymis gibi kullanilmaz.

## 11. Iki Veri Setini Nasil Savunuruz?

Hocanin "iki veri setinin ID'leri uyusmaz" elestirisi teknik olarak dogru. Bizim savunmamiz su olmali:

> Biz iki veri setini dogrudan ID seviyesinde birlestirmiyoruz. RetailRocket/PAU Market davranis matrisi kullanici-ilan etkileşim mantigini test etmek icin, Mercari ise C2C urun metni/kategori yapisini NLP benchmark'i olarak kullaniliyor. Canli PAU Market onerilerinde backend'e sadece PAU Market `Listing.Id` donmesine izin veriyoruz.

Yani yanlis olan sey:

```text
Mercari item_id = PAU Listing.Id gibi davranmak
```

Bizim yaptigimiz dogru ayrim:

```text
Davranis verisi -> interaction matrix / ranking modeli
Metin verisi    -> content-based NLP benchmark
Canli sistem    -> PAU Listing.Id ile dogrulanmis sonuc
```

Bu nedenle iki veri seti "tek urun evreniymis" gibi karistirilmiyor. Ayrı rolleri var.

## 12. Mevcut Cikti Kanitlari

Recommender health ciktisi:

```json
{
  "status": "healthy",
  "models_loaded": true,
  "model_info": {
    "hybrid_model": "LightFM Hybrid (WARP)",
    "n_users": 103,
    "n_items": 214
  }
}
```

Metrics ciktisindan ozet:

```text
dataset_summary.source          = paumarket
n_users                         = 103
n_items                         = 214
n_interactions                  = 1946
n_train                         = 1556
n_test                          = 390
sparsity_percent                = 91.3211
event_distribution.view         = 1494
event_distribution.favorite     = 452
content_based category P@5      = 0.93
collaborative Precision@5       = 0.023762
collaborative Recall@5          = 0.032308
collaborative HitRate@5         = 0.118812
collaborative RMSE              = 0.897583
```

Onemli not: Bu kosuda `hybrid_lightfm` ranking metriği `n_users_evaluated=0` gorunuyor. Bu, modelin canli akista kullanilamayacagi anlamina gelmez; evaluator tarafinda test kullanici/ilan hizalamasinin bu kosuda LightFM icin uygun ornek uretmedigini gosterir. Hocaya sunarken collaborative metrikleri, Mercari content benchmark'ini ve canli backend onerisi ayrimini net anlatmak daha guvenlidir.

## 13. Hocaya Gosterilebilecek Endpointler

Docker ayaktayken:

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/metrics
curl -s "http://localhost:8000/recommend/by-user-id/1005?n=5"
```

Backend tarafinda login token ile:

```bash
GET http://localhost:5251/api/recommendations/hybrid?count=8
```

Admin token ile egitim:

```bash
POST http://localhost:8000/train?source=paumarket
Header: X-Recommender-Admin-Token: <token>
```

## 14. Beklenen Soru-Cevaplar

### Soru: Matrisi nasil olusturdunuz?

Kullanicilari satir, ilanlari sutun yaptik. Her user-listing hucresine goruntuleme, favori, mesaj, anlasma istegi ve satin alma gibi implicit feedback sinyallerinden gelen agirliklari koyduk. Matris sparse oldugu icin `coo_matrix` kullandik.

### Soru: Neden yildiz puani yerine implicit feedback?

PAU Market'te kullanici urunlere 1-5 puan vermiyor. Davranislari ilgi sinyali olarak kullanmak daha dogru: favori yapmak, mesaj atmak veya anlasma istemek gercek niyet gosteriyor.

### Soru: Favori neden goruntulemeden daha yuksek agirlikli?

Goruntuleme bazen meraktan olabilir. Favori ise kullanicinin ilani saklamak veya daha sonra donmek istedigini gosterir. Bu nedenle `view=1`, `favorite=3` verildi.

### Soru: Satis neden en yuksek agirlikli?

Satis tamamlanmis davranistir. Sadece ilgi degil, gercek tercih kanitidir. Bu nedenle `purchase=5` ile en guclu pozitif sinyal yapildi.

### Soru: Sepet yoksa RetailRocket'taki addtocart neye denk geliyor?

PAU Market'te sepet yerine anlasma istegi vardir. Bu nedenle addtocart mantigi "kullanici satin alma niyetini guclu sekilde belli etti" anlamina gelen `deal_request` davranisina karsilik gelir.

### Soru: Iki veri seti ID uyusmazsa neden problem olmuyor?

Canli oneride yabanci veri seti ID'si PAU ilani gibi kullanilmiyor. Python model PAU verisiyle egitildiginde `item_idx -> Listing.Id` mapping'i vardir. Mercari ise sadece content/NLP benchmark'i olarak ayridir.

### Soru: Yeniden egitim otomatik mi?

Su an sistemde egitim endpoint'i hazir ve admin token ile tetiklenebilir. Tez demosu icin manuel tetikleme yeterli; production senaryosunda bu endpoint gece belirli araliklarla cron job ile calistirilabilir.

### Soru: Bir kullanici favori yapinca hemen oneriler degisiyor mu?

Evet, backend canli kisilestirme katmani yeni etkileşimi aninda okur ve "Sana Ozel Oneriler" alanini yeniler. Python modelin latent vektorlerinin kalici olarak degismesi ise sonraki yeniden egitimde olur.

### Soru: Kullanicinin kendi ilani onerilir mi?

Hayir. Export ve backend onerisi, kullanicinin kendi ilanlarini filtreler. Bu hem veri kalitesi hem de kullanici deneyimi icin gereklidir.

### Soru: Satilmis ilan onerilir mi?

Canli oneride satilmis ilanlar normal aliciya onerilmez. Satilmis ilanlar satici profili ve guven/yorum gecmisi icin gorunebilir, fakat aktif satin alma onerisi olarak kullanilmaz.

## 15. Sinirliliklar ve Dürüst Savunma

Bu sistemin guclu tarafi mimaridir: veri toplama, agirliklandirma, sparse matris, LightFM egitimi, backend dogrulamasi ve cold-start fallback'i uc uca vardir.

Sinirliliklar:

1. Pilot veri az oldugunda metrikler dusuk veya dengesiz olabilir.
2. Gercek akademik basari icin daha fazla PAU Market kullanici etkileşimi gerekir.
3. Yeniden egitim su an otomatik zamanlayiciya bagli degil; endpoint hazir, cron eklenebilir.
4. Mercari content modeli canli PAU ID'si dondurmez; benchmark ve NLP savunmasi icin ayridir.

Savunma cumlesi:

> Bu tezde asil katkimiz, PAU Market'e uygun implicit feedback agirliklariyla sparse interaction matrisi kurup, LightFM WARP modeliyle ranking uretmek ve ID uyumsuzlugu/cold-start gibi gercek hayat problemlerini backend dogrulamasi ve fallback katmaniyla guvenli hale getirmektir.
