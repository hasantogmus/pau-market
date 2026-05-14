# PAUMarket Recommender Metric Protocol Update

Date: 2026-05-14

## Why This Change Was Needed

The earlier pilot evaluation was technically working, but it was hard to defend because too few users were evaluated after known listings were excluded. The recommender now uses a more thesis-safe evaluation protocol:

- User-level temporal holdout instead of a single global time split.
- User-listing duplicate events are aggregated into one observation with the strongest signal weight.
- LightFM receives event strength through `sample_weight`, not just binary positives.
- Popularity baseline is reported so the model is compared against a simple non-ML recommender.
- Strong-signal metrics are reported for `weight >= 3`, covering favorite, deal and purchase-like intent signals.

## Current Pilot Dataset

```text
source                         = paumarket
users                          = 12
listings                       = 53
raw_events                     = 251
model_observations             = 132
train_observations             = 111
test_observations              = 21
split_strategy                 = user_temporal_holdout
aggregation_strategy           = max_weight_per_user_listing
```

Raw event distribution:

```text
view                           = 123
favorite                       = 78
message                        = 25
deal_request                   = 13
deal_accepted                  = 12
```

## Main Results At K=5

| Model | Precision@5 | Recall@5 | NDCG@5 | HitRate@5 |
| --- | ---: | ---: | ---: | ---: |
| Popularity baseline | 0.066667 | 0.208333 | 0.113437 | 0.250000 |
| SVD collaborative | 0.050000 | 0.166667 | 0.105339 | 0.250000 |
| LightFM hybrid | 0.150000 | 0.416667 | 0.307267 | 0.666667 |

Strong signal results (`weight >= 3`) at K=5:

| Model | StrongPrecision@5 | StrongHitRate@5 |
| --- | ---: | ---: |
| Popularity baseline | 0.050000 | 0.250000 |
| SVD collaborative | 0.033333 | 0.166667 |
| LightFM hybrid | 0.133333 | 0.583333 |

Lift vs popularity baseline:

```text
LightFM Precision@5 lift       = +124.9989%
LightFM HitRate@5 lift         = +166.6668%
```

## Poster-Safe Interpretation

This should not be presented as final large-scale accuracy. The pilot set is still small. The safe claim is:

> Gerçek PAUMarket pilot verisinde LightFM hibrit model, basit popülerlik önerisine göre ilk 5 öneride daha fazla ilgili ilan yakaladı. Bu sonuç, modelin gerçek etkileşim export'u ile eğitilip değerlendirilebildiğini ve ölçek büyüdükçe daha kararlı metrikler üretmeye hazır olduğunu gösterir.

Use ranking metrics first:

- `Precision@5`: The share of the top 5 recommendations that match the user's held-out interests.
- `Recall@5`: The share of the user's held-out relevant listings found in the top 5.
- `NDCG@5`: Whether the relevant listings are placed near the top of the ranking.
- `HitRate@5`: Whether at least one relevant listing appears in the top 5.

Treat RMSE as secondary because LightFM WARP optimizes ranking, not exact rating prediction.

