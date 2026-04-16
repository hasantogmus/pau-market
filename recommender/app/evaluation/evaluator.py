from __future__ import annotations
"""
Model Değerlendirme Pipeline'ı (Evaluator)
============================================
Üç modeli aynı test seti üzerinde değerlendirir ve karşılaştırma raporu üretir.

Çıktı:
    - Tablo: Her model için Precision@K, Recall@K, NDCG@K, HitRate@K
    - Grafik: Karşılaştırma bar chart + K değerine göre line chart
    - JSON: API endpoint'i için metrik sonuçları

Kullanım:
    from app.evaluation.evaluator import ModelEvaluator
    evaluator = ModelEvaluator(recommender, preprocessor)
    results = evaluator.run()
"""

import time
import numpy as np
import pandas as pd
from typing import Optional

from app.config import EVAL_K_VALUES, PRIMARY_K
from app.data.preprocessor import RetailRocketPreprocessor
from app.models.recommender import HybridRecommender
from app.evaluation.metrics import (
    precision_at_k,
    recall_at_k,
    ndcg_at_k,
    hit_rate_at_k,
    mean_reciprocal_rank,
)


class ModelEvaluator:
    """
    Üç RS modelini karşılaştırmalı değerlendiren pipeline.
    """

    def __init__(
        self,
        recommender: HybridRecommender,
        preprocessor: RetailRocketPreprocessor,
        max_users: int = 500,
    ):
        """
        Args:
            recommender: Eğitilmiş hibrit recommender
            preprocessor: Ön-işlenmiş veri (train + test split)
            max_users: Değerlendirmede kullanılacak max kullanıcı sayısı
                       (tüm kullanıcılar çok yavaş olabilir)
        """
        self.recommender = recommender
        self.preprocessor = preprocessor
        self.max_users = max_users
        self.results: dict = {}

    def run(self) -> dict:
        """
        Tüm modelleri test seti üzerinde değerlendirir.

        Returns:
            dict: {
                "content_based": {5: {"precision": ..., "recall": ...}, 10: {...}},
                "collaborative": {...},
                "hybrid_lightfm": {...},
                "comparison_table": pd.DataFrame,
            }
        """
        print("\n" + "=" * 60)
        print("  Model Değerlendirme Pipeline")
        print("=" * 60)

        # Test setinde etkileşimi olan kullanıcıları bul
        test_users = self._get_test_users()
        print(f"\nDeğerlendirme: {len(test_users)} kullanıcı, K={EVAL_K_VALUES}")

        # Her model için değerlendir
        self.results = {}

        models = {
            "content_based": self.recommender.cb_model,
            "collaborative": self.recommender.cf_model,
            "hybrid_lightfm": self.recommender.hybrid_model,
        }

        for model_name, model in models.items():
            print(f"\n📏 {model_name} değerlendiriliyor...")
            start_time = time.time()

            model_results = self._evaluate_model(model, test_users)
            elapsed = time.time() - start_time

            model_results["evaluation_time_seconds"] = round(elapsed, 2)
            self.results[model_name] = model_results

            # Ana metriği yazdır
            pk = model_results.get(PRIMARY_K, {}).get("precision", 0)
            rk = model_results.get(PRIMARY_K, {}).get("recall", 0)
            nk = model_results.get(PRIMARY_K, {}).get("ndcg", 0)
            print(f"   P@{PRIMARY_K}={pk:.4f}  R@{PRIMARY_K}={rk:.4f}  NDCG@{PRIMARY_K}={nk:.4f}  ({elapsed:.1f}s)")

        # Karşılaştırma tablosu oluştur
        self.results["comparison_table"] = self._build_comparison_table()

        print("\n" + "=" * 60)
        print("  Değerlendirme Tamamlandı ✓")
        print("=" * 60)

        self._print_comparison_table()

        return self.results

    def _get_test_users(self) -> list[int]:
        """
        Test setinde etkileşimi olan VE train setinde de mevcut olan kullanıcıları bulur.
        Bu kullanıcılar için hem öneri üretebilir hem de doğrulama yapabiliriz.
        """
        train_users = set(self.preprocessor.train_df["user_idx"].unique())
        test_users = set(self.preprocessor.test_df["user_idx"].unique())

        # Her iki sette de olan kullanıcılar (soğuk başlangıç değil)
        valid_users = list(train_users & test_users)

        # Çok fazla kullanıcı varsa örnekle
        if len(valid_users) > self.max_users:
            rng = np.random.RandomState(42)
            valid_users = rng.choice(valid_users, size=self.max_users, replace=False).tolist()

        return sorted(valid_users)

    def _evaluate_model(self, model, test_users: list[int]) -> dict:
        """
        Tek bir modeli değerlendirir.

        Her kullanıcı için:
        1. Model'den top-K öneri al
        2. Test setindeki gerçek etkileşimlerle karşılaştır
        3. Metrikleri hesapla

        Returns:
            dict: {k_value: {"precision": float, "recall": float, ...}}
        """
        max_k = max(EVAL_K_VALUES)
        results_per_k = {k: {"precisions": [], "recalls": [], "ndcgs": [], "hit_rates": [], "mrrs": []} for k in EVAL_K_VALUES}

        for user_idx in test_users:
            try:
                # Model'den öneri al
                recs = model.recommend(user_idx, n=max_k, exclude_known=True)
                recommended_items = [r["item_idx"] for r in recs]

                # Test setindeki gerçek etkileşimler (ground truth)
                user_test = self.preprocessor.test_df[
                    self.preprocessor.test_df["user_idx"] == user_idx
                ]
                relevant_items = set(user_test["item_idx"].values.astype(int))

                if not relevant_items:
                    continue

                # Her K değeri için metrikleri hesapla
                for k in EVAL_K_VALUES:
                    results_per_k[k]["precisions"].append(
                        precision_at_k(recommended_items, relevant_items, k)
                    )
                    results_per_k[k]["recalls"].append(
                        recall_at_k(recommended_items, relevant_items, k)
                    )
                    results_per_k[k]["ndcgs"].append(
                        ndcg_at_k(recommended_items, relevant_items, k)
                    )
                    results_per_k[k]["hit_rates"].append(
                        hit_rate_at_k(recommended_items, relevant_items, k)
                    )
                    results_per_k[k]["mrrs"].append(
                        mean_reciprocal_rank(recommended_items, relevant_items)
                    )

            except Exception as e:
                # Bazı kullanıcılar için model hata verebilir, atla
                continue

        # Ortalama metrikleri hesapla
        final_results = {}
        for k in EVAL_K_VALUES:
            r = results_per_k[k]
            n_evaluated = len(r["precisions"])

            if n_evaluated == 0:
                final_results[k] = {
                    "precision": 0.0, "recall": 0.0, "ndcg": 0.0,
                    "hit_rate": 0.0, "mrr": 0.0, "n_users_evaluated": 0
                }
            else:
                final_results[k] = {
                    "precision": round(float(np.mean(r["precisions"])), 6),
                    "recall": round(float(np.mean(r["recalls"])), 6),
                    "ndcg": round(float(np.mean(r["ndcgs"])), 6),
                    "hit_rate": round(float(np.mean(r["hit_rates"])), 6),
                    "mrr": round(float(np.mean(r["mrrs"])), 6),
                    "n_users_evaluated": n_evaluated,
                }

        return final_results

    def _build_comparison_table(self) -> dict:
        """Karşılaştırma tablosu oluşturur (DataFrame-uyumlu dict)."""
        k = PRIMARY_K
        rows = []

        for model_name in ["content_based", "collaborative", "hybrid_lightfm"]:
            if model_name in self.results and k in self.results[model_name]:
                metrics = self.results[model_name][k]
                rows.append({
                    "Model": model_name,
                    f"Precision@{k}": metrics.get("precision", 0),
                    f"Recall@{k}": metrics.get("recall", 0),
                    f"NDCG@{k}": metrics.get("ndcg", 0),
                    f"HitRate@{k}": metrics.get("hit_rate", 0),
                    f"MRR": metrics.get("mrr", 0),
                })

        return rows

    def _print_comparison_table(self):
        """Karşılaştırma tablosunu konsola yazdırır."""
        table = self.results.get("comparison_table", [])
        if not table:
            return

        k = PRIMARY_K
        print(f"\n{'─' * 75}")
        print(f"{'Model':<20} {'P@' + str(k):<12} {'R@' + str(k):<12} {'NDCG@' + str(k):<12} {'HR@' + str(k):<12} {'MRR':<10}")
        print(f"{'─' * 75}")

        for row in table:
            print(
                f"{row['Model']:<20} "
                f"{row[f'Precision@{k}']:<12.4f} "
                f"{row[f'Recall@{k}']:<12.4f} "
                f"{row[f'NDCG@{k}']:<12.4f} "
                f"{row[f'HitRate@{k}']:<12.4f} "
                f"{row['MRR']:<10.4f}"
            )

        print(f"{'─' * 75}")

    def get_results_json(self) -> dict:
        """API endpoint'i için JSON-uyumlu sonuç."""
        output = {}
        for model_name in ["content_based", "collaborative", "hybrid_lightfm"]:
            if model_name in self.results:
                model_data = {}
                for key, value in self.results[model_name].items():
                    if isinstance(key, int):
                        model_data[f"k_{key}"] = value
                    elif key == "evaluation_time_seconds":
                        model_data[key] = value
                output[model_name] = model_data

        output["comparison_table"] = self.results.get("comparison_table", [])
        output["k_values"] = EVAL_K_VALUES
        output["primary_k"] = PRIMARY_K

        return output
