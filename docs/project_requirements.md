# Paü Market — Proje Gereksinimleri

> **Önemli Not:** Kimlik doğrulama için geçerli e-posta uzantısı `@posta.pau.edu.tr` olmalıdır.
> Yazılan tüm kodlarda bu kural referans alınacaktır.

---

## Bir Üniversite Kampüsü için Akıllı Recommender Sistem Entegreli Al-Sat Platformu Tasarımı

### Özet

Günümüzde üniversite öğrencileri, eğitim hayatları boyunca yurt, ev veya apart gibi farklı yaşam alanlarında bulunmaktadır. Bu süreçte öğrenciler, ders kitapları, elektronik eşyalar, ev gereçleri veya mobilyalar gibi birçok ürüne anlık ihtiyaç duyabilmekte veya ellerindeki fazla eşyaları elden çıkarmak istemektedirler. Bu durum, öğrenciler arasında dinamik bir ikinci el pazarı oluşturmaktadır. Halihazırda bu ihtiyacı karşılamak için çeşitli genel e-ticaret platformları veya sosyal medya grupları kullanılmaktadır. Ancak bu genel platformlar, ülke çapında herkese açık oldukları için özellikle öğrenciler arasında "güven" sorununu ortaya çıkarmaktadır. Ayrıca, geniş coğrafi alana yayılan ilanlar arasında, sadece kampüs içerisindeki veya Denizli'deki diğer öğrencilerin ilanlarını bulmak oldukça zordur. Bu tez çalışması, bu probleme bir çözüm olarak sadece Pamukkale Üniversitesi (PAÜ) öğrencilerine yönelik kapalı bir C2C (tüketiciden tüketiciye) e-ticaret platformu olan "Paü Market" projesinin geliştirilmesini ele almaktadır. Platform, öğrenci e-postası (`@posta.pau.edu.tr`) ile kimlik doğrulaması yaparak güvenli ve erişilebilir bir alım-satım ortamı sunmayı amaçlamaktadır. Projenin temel teknik odağı ve akademik katkısı, platforma entegre edilecek bir Recommender Sistem (Öneri Sistemi) modelidir. Platformdaki ilan sayısı arttıkça kullanıcıların alakasız ilanlar arasında kaybolmasını engellemek ve satış potansiyelini artırmak için modern e-ticaret sistemlerinin vazgeçilmezi olan kişiselleştirilmiş bir deneyim sunmak şarttır. Bu sistem, kullanıcıların geçmiş davranışlarını (ilan görüntüleme, favorileme, alım-satım) ve ilanların özelliklerini (kategori, fiyat, konum) analiz ederek kişiselleştirilmiş ilan önerileri sunacaktır. Metodoloji olarak, literatürde yaygın olarak kullanılan Recommender Sistem yaklaşımları incelenecektir. Bunlar; kullanıcının geçmişte beğendiği ürünlerin özelliklerine (kategori, marka, anahtar kelime) dayalı olarak benzer ürünleri öneren İçerik Tabanlı Filtreleme (Content-Based Filtering); "size benzeyen kullanıcılar şunları da beğendi" mantığına dayanan İşbirlikçi Filtreleme (Collaborative Filtering); ve bu iki yöntemin zayıf yönlerini telafi etmek için birleştiren Hibrit (Hybrid) Sistemler'dir. Ulaşılan sonuçlar bölümünde, geliştirilen platformun prototipi sunulacak ve bu platform üzerinde eğitilen Recommender Sistem modelinin performansı değerlendirilecektir. Modelin, kullanıcılara alaka düzeyi yüksek ve çeşitli öneriler sunarak platformdaki kullanıcı memnuniyetini ve etkileşimini artırması beklenmektedir.

**Anahtar Kelimeler:** Recommender Systems, kişiselleştirme, C2C e-ticaret, işbirlikçi filtreleme, içerik tabanlı filtreleme

---

## Design of a Smart Recommender System Integrated Buy-Sell Platform for a University Campus

### Summary

The dynamic student life on university campuses creates a continuous second-hand market for course materials, dormitory items, and personal equipment. However, existing general e-commerce platforms fail to fully solve the problems of "trust" and "ease of access" among students. Furthermore, among listings scattered across a wide geographical area, it is difficult to find listings specifically from other students on campus or within the local city. As a solution to this problem, this thesis addresses the development of "Paü Market," a closed C2C (consumer-to-consumer) e-commerce platform aimed exclusively at Pamukkale University (PAU) students. The platform aims to provide a secure and accessible trading environment by authenticating users via their student email addresses (`@posta.pau.edu.tr`). The primary technical focus and academic contribution of the project is a Recommender System integrated into the platform. As the number of listings on the platform grows, it is essential to provide a personalized experience—a cornerstone of modern e-commerce systems—to prevent users from getting lost in irrelevant listings and to increase sales potential. This system will analyze users' past behaviors (listing views, favorites, transactions) and item attributes (category, price, location) to provide personalized listing recommendations. As for methodology, commonly used Recommender System approaches in the literature will be examined. These include: Content-Based Filtering, which recommends similar items based on the attributes (category, brand, keywords) of items a user liked in the past; Collaborative Filtering, which operates on the logic of "users similar to you also liked these"; and Hybrid Systems, which combine these two methods to compensate for their respective weaknesses. In the results section, the prototype of the developed platform will be presented, and the performance of the Recommender System model trained on this platform will be evaluated. The model is expected to increase user satisfaction and engagement on the platform by providing highly relevant and diverse recommendations.

**Keywords:** Recommender Systems, personalization, C2C e-commerce, collaborative filtering, content-based filtering

---

## 1. Giriş

Modern üniversite deneyimi, kampüs ortamı içinde kendine özgü ve dinamik bir mikro-ekonomi yaratmaktadır. Öğrenciler, genellikle yurtlar veya paylaşımlı evler gibi geçici yaşam alanlarında, sürekli bir eşya döngüsü içindedirler. Eğitim materyalleri ve elektronik cihazlardan mobilya ve ev gereçlerine kadar birçok ürüne anlık ihtiyaç duymakta veya ellerindeki fazla eşyaları elden çıkarmak istemektedirler. Bu durum, güvenilir ve verimli bir ikinci el pazarı için belirgin ve yerel bir talep oluşturmaktadır.

Hâlihazırda öğrenciler, bu ihtiyacı karşılamak için Sahibinden.com veya Letgo gibi ulusal ölçekli genel platformlara ya da resmi olmayan sosyal medya gruplarına yönelmektedir. Ancak bu çözümler, iki önemli dezavantajı beraberinde getirmektedir: Açık platformların anonimliği nedeniyle ortaya çıkan güven eksikliği ve özellikle diğer öğrencilerden gelen yerel ve ilgili ilanları bulmayı zorlaştıran yüksek bilgi kirliliği (information overload).

Bu tez, belirtilen bu boşluğu doldurmak amacıyla, Pamukkale Üniversitesi topluluğuna özel bir C2C (tüketiciden tüketiciye) e-ticaret platformu olan "Paü Market"in tasarımını ve uygulanmasını önermektedir. Platform, kurumsal e-posta adresleri (`@posta.pau.edu.tr`) aracılığıyla kullanıcı doğrulaması zorunluluğu getirerek, temel bir güven katmanı oluşturmayı hedeflemektedir.

---

## 1.1 Tezin Amacı

Bu tezin temel amacı, Pamukkale Üniversitesi öğrencileri için kişiselleştirilmiş bir kullanıcı deneyimi sağlamak üzere makine öğrenmesi tabanlı bir Recommender Sistem kullanan akıllı C2C pazaryeri platformu "Paü Market"i tasarlamak, geliştirmek ve değerlendirmektir.

Bu kapsayıcı amaç, aşağıdaki temel hedeflere ve iş paketlerine ayrılmıştır:

### 1.1.1 Problem ve Gereksinim Analizi
Öğrenci pazaryerinin özel ihtiyaçlarını analiz etmek; platform ve recommender sistem için fonksiyonel ve fonksiyonel olmayan gereksinimleri tanımlamak.

### 1.1.2 Sistem Mimarisi Tasarımı
Web platformunu (veritabanı, arka-yüz, ön-yüz) ve recommender sistem için gerekli veri işlem hatlarını (data pipeline) kapsayan sağlam ve ölçeklenebilir bir mimari tasarlamak.

### 1.1.3 Platform Geliştirme (MVP)
"Paü Market" web uygulamasının temel işlevlerini (Minimum Viable Product - MVP) hayata geçirmek. Bu, güvenli kullanıcı kaydı, ilan gönderme, ilan görüntüleme ve en önemlisi kullanıcı etkileşimlerini kaydedecek (logging) mekanizmaları içerir.

### 1.1.4 İlk Veri Setinin Toplanması
Geliştirilen MVP platformunu kontrollü bir "beta testi" ortamında (örn. seçili bir öğrenci grubuyla) kullanarak, yapay olmayan, gerçek kullanıcı davranışlarını (görüntülemeler, favorilemeler, mesajlaşmalar) yansıtan ilk eğitim veri setini (Interactions tablosu) oluşturmak.

### 1.1.5 Recommender Sistem Modellemesi
Bu bağlama uygun recommender sistem algoritmaları (örn. İçerik Tabanlı Filtreleme, İşbirlikçi Filtreleme, Hibrit modeller) üzerine kapsamlı bir literatür taraması yapmak. Beta testiyle elde edilen bu gerçekçi veri setini kullanarak platformun hedeflerine en uygun modeli seçmek, tasarlamak ve eğitmek.

### 1.1.6 Entegrasyon ve Değerlendirme
Eğitilen recommender sistem modelini "Paü Market" platformuna entegre etmek ve modelin, kullanıcı etkileşimini ve öneri kalitesini iyileştirmedeki etkinliğini değerlendirmek için deneyler yapmak.

---

## 1.2 Literatür Araştırması

Recommender Sistemler (Öneri Sistemleri), bilgi aşırı yüklemesi (information overload) sorununa karşı geliştirilmiş en etkili çözümlerden biridir. Temel amaçları, kullanıcıların büyük ve karmaşık bilgi yığınları içerisinden ilgilerini çekebilecek ögeleri proaktif olarak keşfetmelerini sağlayan yazılım araçları ve algoritmalarıdır. Literatürdeki ilk temel yaklaşımlar İçerik Tabanlı Filtreleme (Content-Based Filtering) ve İşbirlikçi Filtreleme (Collaborative Filtering - CF) olmuştur.

İçerik tabanlı yaklaşım, bir kullanıcının geçmişte beğendiği ögelerin "içerik" özelliklerini analiz ederek bu özelliklere benzer yeni ögeler önerir. Pazzani ve Billsus [1] bu yaklaşımın temellerini incelemiş ve bir kullanıcının ilgi profilinin, beğendiği ögelerin özelliklerinden (kategori, anahtar kelimeler) oluşan ağırlıklı bir vektör olarak nasıl modellenebileceğini göstermiştir. Bu modelde, yeni bir ögenin skoru, o ögenin özellik vektörü ile kullanıcının profil vektörü arasındaki kosinüs benzerliği gibi metriklerle hesaplanır.

Diğer yandan, CF yaklaşımı ögelerin içeriğini dikkate almaz; bunun yerine, kullanıcı-öge etkileşim matrisindeki (user-item interaction matrix) kalıplara odaklanır. Sarwar ve arkadaşları [2], özellikle Amazon.com'un temelini oluşturan "Öge-tabanlı" (Item-Based) CF yaklaşımının, büyük veri setlerinde hem yüksek performanslı hem de ölçeklenebilir olduğunu kanıtlamıştır.

İşbirlikçi Filtrelemenin daha modern ve güçlü bir uygulaması Matris Ayrıştırma (Matrix Factorization) teknikleridir. Koren, Bell ve Volinsky [3], Netflix'in meşhur 1 milyon dolarlık ödüllü yarışmasını kazanan bu yöntemle, seyrek (sparse) olan kullanıcı-öge matrisinin, iki adet yoğun (dense) ve düşük boyutlu "gizli özellik" (latent factors) matrisine ayrılabileceğini göstermiştir.

Ancak bu yöntemlerin tek başlarına yetersiz kaldığı durumlar nedeniyle, Hibrit Sistemler popülerlik kazanmıştır. Burke [4], hibrit modellerin genellikle tekil yöntemlerin zayıf yönlerini telafi ederek daha sağlam sonuçlar verdiğini ortaya koymuştur. Burke, bu birleştirme stratejilerini:
- **Ağırlıklı (Weighted):** İki sistemin skorlarını birleştiren
- **Anahtarlamalı (Switching):** Bir durumda birini, başka durumda diğerini kullanan
- **Kademeli (Cascade):** Bir sistemin filtrelediğini diğerinin sıraladığı

olarak sınıflandırmıştır. **"Paü Market" projesinin "soğuk başlangıç" sorununu çözmek için "Anahtarlamalı" bir hibrit model (yeni kullanıcıya içerik tabanlı, eski kullanıcıya işbirlikçi filtreleme) kullanmak mantıklı bir strateji olarak öne çıkmaktadır.**

Adomavicius ve Tuzhilin [5], yaptıkları seminal derlemede "soğuk başlangıç" (cold-start) problemini ve "veri seyrekligi" (data sparsity) sorununu vurgulamıştır. Lika ve arkadaşları [6] bu soğuk başlangıç problemine karşı spesifik çözümleri kategorize etmiştir:
1. Kullanıcının demografik bilgilerini (bölüm, sınıf) kullanan stratejiler
2. Yeni kullanıcıya ilk etapta en popüler ögeleri göstermek
3. Yeni ilanlar için içerik tabanlı yöntemleri kullanan hibrit yaklaşımlar

Massa ve Avesani [7], kullanıcılar arasındaki güven ilişkilerinin (trust network) öneri kalitesini nasıl artırabileceğini araştırmıştır. Bu, `@posta.pau.edu.tr` ile doğrulanmış kapalı topluluk yapısıyla örtüşmektedir.

He ve arkadaşları [8], "Nöral İşbirlikçi Filtreleme" (Neural Collaborative Filtering - NCF) modelini önermiştir. Bu çalışma, gizli özellikleri basit bir iç çarpım yerine çok katmanlı bir sinir ağı üzerinden geçirerek sistemin çok daha karmaşık kalıpları öğrenmesini sağlamıştır.

Herlocker ve arkadaşları [9], basitçe "tahmin doğruluğuna" (örn. RMSE) odaklanmanın, özellikle "en iyi N" öneriyi listeleyen sistemler için yanıltıcı olabileceğini savunmuştur. Bunun yerine **Precision** ve **Recall** metriklerinin kullanılması gerektiğini belirtmişlerdir.

Zhang ve Chen [10], "Açıklanabilir Recommender Sistemler" (XAI-RS) üzerine yaptıkları derlemede, bir sistemin kullanıcıya "Bu ilanı sana şunun için önerdik..." şeklinde bir açıklama sunmasının, kullanıcının sisteme olan güvenini ve memnuniyetini artırdığını belirtmiştir. **"Paü Market" gibi güven temelli bir platformda bu özelliğin entegrasyonu, projenin akademik değerini ve kullanılabilirliğini artıracaktır.**

---

## 1.3 Hipotez

Bu tezin temel hipotezi, "Paü Market" gibi kapalı ve niş bir C2C e-ticaret platformunda, standart bir kronolojik veya popülerlik tabanlı ilan sıralama yönteminin, kullanıcıların ilgili ürünleri keşfetmesi için yetersiz kalacağıdır.

Bu temel sorundan yola çıkarak, iki ana test edilebilir iddia (hipotez) öne sürülmektedir:

### H1 (Ana Hipotez)
Platforma entegre edilecek makine öğrenmesi tabanlı bir Recommender Sistemin kullanılması, standart bir sıralama yöntemine kıyasla, kullanıcı başına düşen etkileşim (ilan görüntüleme, favorileme) sayısını ve öneri listelerinin isabetliliğini (Precision ve Recall) istatistiksel olarak anlamlı düzeyde artıracaktır.

### H2 (İkincil Hipotez)
Sadece tek bir yönteme (İçerik Tabanlı veya İşbirlikçi Filtreleme) dayalı modeller yerine, bu iki yaklaşımı birleştiren ve "Paü Market" platformunun "güven" ve "sosyal" (örn. aynı bölümdeki öğrenciler) gibi benzersiz verilerini de içeren bir Hibrit Modelin kullanılması, özellikle "soğuk başlangıç" problemine maruz kalan yeni kullanıcılar için en yüksek öneri performansını sağlayacaktır.

---

## Teknik Gereksinimler Özeti

| Gereksinim | Detay |
|---|---|
| **E-posta Doğrulama** | Yalnızca `@posta.pau.edu.tr` uzantılı e-postalar kabul edilir |
| **Platform Türü** | Kapalı C2C (sadece PAÜ öğrencileri) |
| **Öneri Yöntemi 1** | İçerik Tabanlı Filtreleme (kategori, fiyat, anahtar kelime) |
| **Öneri Yöntemi 2** | İşbirlikçi Filtreleme (Matris Ayrıştırma / NCF) |
| **Öneri Yöntemi 3** | Anahtarlamalı Hibrit (soğuk başlangıç → içerik tabanlı, aktif kullanıcı → işbirlikçi) |
| **Etkileşim Loglama** | Görüntüleme, favorileme, mesajlaşma, alım-satım kayıtları (Interactions tablosu) |
| **Değerlendirme Metrikleri** | Precision@K, Recall@K, RMSE |
| **Açıklanabilirlik** | XAI-RS: Her öneri için kullanıcıya açıklama sunulması |
| **Güven Katmanı** | Aynı bölüm/sınıf öğrencileri arasında güven ağı (trust network) |
| **Soğuk Başlangıç** | Demografik veriler (bölüm, sınıf) + popüler ögeler ile çözüm |
