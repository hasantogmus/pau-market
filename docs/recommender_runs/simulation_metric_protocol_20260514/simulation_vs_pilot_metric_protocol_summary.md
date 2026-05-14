# PAUMarket Recommender Metric Protocol - Pilot vs Simulation

Bu rapor, ayni yeni degerlendirme protokoluyle iki farkli kosuyu ayirir:

- **Gercek pilot veri:** PAUMarket uygulamasindan toplanan gercek kullanici, ilan ve etkilesim akisi.
- **Simulasyon veri:** Modelin daha buyuk olcekte davranisini gostermek icin uretilen, gercek veri olarak sunulmamasi gereken kontrollu test verisi.

## Ortak Degerlendirme Mantigi

- Split: `user_temporal_holdout`
- Aggregation: `max_weight_per_user_listing`
- Model: LightFM WARP, PAUMarket event agirliklari `sample_weight` olarak kullanildi.
- Baseline: Populerlik tabanli oneriler.
- Ana metrik: `Precision@5`, `Recall@5`, `NDCG@5`, `HitRate@5`

## Veri Ozeti

| Kosu | Kullanici | Ilan | Ham Event | Model Gozlemi | Train | Test | Sparsity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gercek pilot | 12 | 53 | 251 | 132 | 111 | 21 | 79.25% |
| Simulasyon | 250 | 180 | 12,425 | 4,939 | 4,439 | 500 | 89.02% |

## LightFM Sonuclari

| Kosu | Precision@5 | Recall@5 | NDCG@5 | HitRate@5 | StrongPrecision@5 | StrongHitRate@5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Gercek pilot | 0.1500 | 0.4167 | 0.3073 | 0.6667 | 0.1333 | 0.5833 |
| Simulasyon | 0.1048 | 0.2620 | 0.1966 | 0.4520 | 0.0980 | 0.4257 |

## Populerlik Baseline Karsilastirmasi

| Kosu | Baseline P@5 | LightFM P@5 | P@5 Lift | Baseline HitRate@5 | LightFM HitRate@5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gercek pilot | 0.0667 | 0.1500 | +125% | 0.2500 | 0.6667 |
| Simulasyon | 0.0136 | 0.1048 | +671% | 0.0640 | 0.4520 |

## Sunumda Kullanilacak Kisa Yorum

Gercek pilot veri, sistemin canli PAUMarket akisi uzerinden calistigini ve LightFM modelinin populerlik tabanli basit yaklasima gore daha isabetli oneriler uretebildigini gosterir. Simulasyon verisi ise ayni pipeline'in daha buyuk kullanici-ilan-etkilesim hacminde de calistigini ve LightFM'in populerlik baseline'ina gore anlamli ustunluk sagladigini gostermek icin kullanilmistir.

Poster uzerinde bu ayrim net yazilmalidir: **pilot veri gercek kullanici akisini**, **simulasyon veri ise olceklenebilirlik ve model davranisi testini** temsil eder.
