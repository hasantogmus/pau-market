from __future__ import annotations
"""
Değerlendirme Metrikleri
========================
Recommender System modellerinin performansını ölçen metrikler.

Metrikler:
    - Precision@K: Top-K önerideki isabet oranı
    - Recall@K: Tüm ilgili öğelerin ne kadarı top-K'da
    - NDCG@K: Sıralama pozisyonu kalitesi (üstteki isabetler daha değerli)
    - AUC: Sıralama kalitesi (LightFM built-in)

Referans:
    Herlocker, J. L., et al. (2004).
    Evaluating Collaborative Filtering Recommender Systems.
    ACM TOIS, 22(1), 5-53.
"""

import numpy as np
from typing import Optional


def precision_at_k(recommended: list[int], relevant: set[int], k: int) -> float:
    """
    Precision@K: Top-K önerideki doğru tahmin oranı.

    P@K = |{önerilenler ∩ ilgililer}| / K

    Args:
        recommended: Sıralı öneri listesi (item_idx)
        relevant: Gerçekte ilgili ürünler seti (test setinden)
        k: Kaç öneri değerlendirilecek

    Returns:
        float: 0.0 - 1.0 arası
    """
    if k == 0:
        return 0.0

    recommended_at_k = recommended[:k]
    hits = sum(1 for item in recommended_at_k if item in relevant)
    return hits / k


def recall_at_k(recommended: list[int], relevant: set[int], k: int) -> float:
    """
    Recall@K: İlgili ürünlerin kaçı top-K'da bulunuyor.

    R@K = |{önerilenler ∩ ilgililer}| / |ilgililer|

    Args:
        recommended: Sıralı öneri listesi
        relevant: Gerçekte ilgili ürünler seti
        k: Kaç öneri değerlendirilecek

    Returns:
        float: 0.0 - 1.0 arası
    """
    if len(relevant) == 0:
        return 0.0

    recommended_at_k = recommended[:k]
    hits = sum(1 for item in recommended_at_k if item in relevant)
    return hits / len(relevant)


def ndcg_at_k(recommended: list[int], relevant: set[int], k: int) -> float:
    """
    Normalized Discounted Cumulative Gain @ K.

    DCG@K = Σ (rel_i / log2(i + 1))  , i = 1..K
    NDCG@K = DCG@K / idealDCG@K

    Üstteki pozisyonlardaki isabetler daha değerlidir.

    Args:
        recommended: Sıralı öneri listesi
        relevant: Gerçekte ilgili ürünler seti
        k: Kaç öneri değerlendirilecek

    Returns:
        float: 0.0 - 1.0 arası
    """
    recommended_at_k = recommended[:k]

    # DCG hesapla
    dcg = 0.0
    for i, item in enumerate(recommended_at_k):
        if item in relevant:
            dcg += 1.0 / np.log2(i + 2)  # +2 çünkü i 0-indexed

    # İdeal DCG (tüm ilgililer en üstte olsaydı)
    ideal_hits = min(len(relevant), k)
    idcg = sum(1.0 / np.log2(i + 2) for i in range(ideal_hits))

    if idcg == 0:
        return 0.0

    return dcg / idcg


def hit_rate_at_k(recommended: list[int], relevant: set[int], k: int) -> float:
    """
    Hit Rate @ K: Top-K'da en az bir isabet var mı?

    HR@K = 1 if |{önerilenler ∩ ilgililer}| > 0 else 0

    Args:
        recommended: Sıralı öneri listesi
        relevant: Gerçekte ilgili ürünler seti
        k: Kaç öneri değerlendirilecek

    Returns:
        float: 0.0 veya 1.0
    """
    recommended_at_k = recommended[:k]
    return 1.0 if any(item in relevant for item in recommended_at_k) else 0.0


def mean_reciprocal_rank(recommended: list[int], relevant: set[int]) -> float:
    """
    Mean Reciprocal Rank (MRR): İlk doğru önerinin pozisyonunun tersi.

    MRR = 1 / rank_of_first_relevant_item

    Args:
        recommended: Sıralı öneri listesi
        relevant: Gerçekte ilgili ürünler seti

    Returns:
        float: 0.0 - 1.0 arası
    """
    for i, item in enumerate(recommended):
        if item in relevant:
            return 1.0 / (i + 1)
    return 0.0
