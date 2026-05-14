from __future__ import annotations
"""
Model Değerlendirme Pipeline'ı (Evaluator)
============================================
Üç modeli aynı test seti üzerinde değerlendirir ve karşılaştırma raporu üretir.

Çıktı:
    - Tablo: Her model için Precision@K, Recall@K, NDCG@K, HitRate@K, RMSE
    - Grafik: Karşılaştırma bar chart + K değerine göre line chart
    - JSON: API endpoint'i için metrik sonuçları

Kullanım:
    from app.evaluation.evaluator import ModelEvaluator
    evaluator = ModelEvaluator(recommender, preprocessor)
    results = evaluator.run()
"""

import time
import numpy as np
from typing import Any, Optional

from app.config import EVAL_K_VALUES, PRIMARY_K
from app.models.recommender import HybridRecommender
from app.evaluation.metrics import (
    precision_at_k,
    recall_at_k,
    ndcg_at_k,
    hit_rate_at_k,
    mean_reciprocal_rank,
    root_mean_squared_error,
)


class ModelEvaluator:
    """
    Üç RS modelini karşılaştırmalı değerlendiren pipeline.
    """

    STRONG_SIGNAL_WEIGHT_THRESHOLD = 3.0

    def __init__(
        self,
        recommender: HybridRecommender,
        preprocessor: Any,
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

        # Test setinde etkileşimi olan sıcak kullanıcıları bul
        warm_test_users = self._get_warm_test_users()
        cold_start_users = self._get_cold_start_test_users()
        print(f"\nDeğerlendirme: {len(warm_test_users)} sıcak kullanıcı, K={EVAL_K_VALUES}")
        print(f"Soğuk başlangıç kapsamı: {len(cold_start_users)} kullanıcı (ayrı raporlanır)")

        # Her model için değerlendir
        self.results = {}

        models = {
            "collaborative": self.recommender.cf_model,
            "hybrid_lightfm": self.recommender.hybrid_model,
        }

        for model_name, model in models.items():
            print(f"\n📏 {model_name} değerlendiriliyor...")
            start_time = time.time()

            model_results = self._evaluate_model(model, warm_test_users, relevance_mode="all")
            strong_results = self._evaluate_model(model, warm_test_users, relevance_mode="strong")
            elapsed = time.time() - start_time

            model_results["rmse"] = self._evaluate_rmse(model, warm_test_users)
            model_results["strong_signals_weight_gte_3"] = strong_results
            model_results["evaluation_time_seconds"] = round(elapsed, 2)
            self.results[model_name] = model_results

            # Ana metriği yazdır
            pk = model_results.get(PRIMARY_K, {}).get("precision", 0)
            rk = model_results.get(PRIMARY_K, {}).get("recall", 0)
            nk = model_results.get(PRIMARY_K, {}).get("ndcg", 0)
            strong_pk = strong_results.get(PRIMARY_K, {}).get("precision", 0)
            strong_hr = strong_results.get(PRIMARY_K, {}).get("hit_rate", 0)
            rmse = model_results.get("rmse")
            rmse_text = f"  RMSE={rmse:.4f}" if rmse is not None else ""
            print(
                f"   P@{PRIMARY_K}={pk:.4f}  R@{PRIMARY_K}={rk:.4f}  "
                f"NDCG@{PRIMARY_K}={nk:.4f}  "
                f"StrongP@{PRIMARY_K}={strong_pk:.4f}  StrongHR@{PRIMARY_K}={strong_hr:.4f}"
                f"{rmse_text}  ({elapsed:.1f}s)"
            )

        print("\n📏 popularity_baseline değerlendiriliyor...")
        popularity_all = self._evaluate_popularity_baseline(warm_test_users, relevance_mode="all")
        popularity_strong = self._evaluate_popularity_baseline(warm_test_users, relevance_mode="strong")
        popularity_all["strong_signals_weight_gte_3"] = popularity_strong
        popularity_all["rmse"] = None
        popularity_all["evaluation_time_seconds"] = 0
        self.results["popularity_baseline"] = popularity_all
        baseline_pk = popularity_all.get(PRIMARY_K, {}).get("precision", 0)
        baseline_strong_pk = popularity_strong.get(PRIMARY_K, {}).get("precision", 0)
        print(
            f"   P@{PRIMARY_K}={baseline_pk:.4f}  "
            f"StrongP@{PRIMARY_K}={baseline_strong_pk:.4f}"
        )

        self.results["content_based_benchmark"] = (
            self.recommender.training_stats.get("content_based_evaluation", {}) or {}
        )
        self.results["evaluation_scope"] = {
            "warm_test_users": len(warm_test_users),
            "cold_start_test_users": len(cold_start_users),
            "ranking_models": list(models.keys()),
            "baseline_models": ["popularity_baseline"],
            "strong_signal_threshold": self.STRONG_SIGNAL_WEIGHT_THRESHOLD,
            "content_based_in_live_ranking": False,
        }
        self.results["lift_vs_popularity"] = self._build_lift_summary()

        # Karşılaştırma tablosu oluştur
        self.results["comparison_table"] = self._build_comparison_table()

        print("\n" + "=" * 60)
        print("  Değerlendirme Tamamlandı ✓")
        print("=" * 60)

        self._print_comparison_table()

        return self.results

    def _get_warm_test_users(self) -> list[int]:
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

    def _get_cold_start_test_users(self) -> list[int]:
        """
        Test setinde olup train setinde olmayan kullanıcıları raporlar.
        Canlı sistem bu kullanıcılar için backend fallback kullandığından,
        bunlar ranking metriğine dahil edilmez.
        """
        train_users = set(self.preprocessor.train_df["user_idx"].unique())
        test_users = set(self.preprocessor.test_df["user_idx"].unique())
        return sorted(test_users - train_users)

    def _evaluate_model(self, model, test_users: list[int], relevance_mode: str = "all") -> dict:
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
                if relevance_mode == "strong":
                    user_test = user_test[
                        user_test["weight"] >= self.STRONG_SIGNAL_WEIGHT_THRESHOLD
                    ]
                relevant_items = set(user_test["item_idx"].values.astype(int))

                # Öneri üretirken train'de görülen ilanları özellikle hariç
                # tutuyoruz. Bu yüzden ground truth içinde de yalnızca
                # kullanıcının train'de görmediği yeni test ilanları kalmalı.
                user_train = self.preprocessor.train_df[
                    self.preprocessor.train_df["user_idx"] == user_idx
                ]
                known_items = set(user_train["item_idx"].values.astype(int))
                relevant_items = relevant_items - known_items

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

    def _evaluate_popularity_baseline(self, test_users: list[int], relevance_mode: str = "all") -> dict:
        """
        Model karşılaştırması için global popülerlik baseline'ı.

        Her kullanıcıya train setinde toplam ağırlığı en yüksek ilanları önerir;
        kullanıcının train'de gördüğü ilanlar yine hariç tutulur.
        """
        max_k = max(EVAL_K_VALUES)
        results_per_k = {k: {"precisions": [], "recalls": [], "ndcgs": [], "hit_rates": [], "mrrs": []} for k in EVAL_K_VALUES}
        ranked_items = self._get_popularity_ranked_items()

        for user_idx in test_users:
            user_train = self.preprocessor.train_df[
                self.preprocessor.train_df["user_idx"] == user_idx
            ]
            known_items = set(user_train["item_idx"].values.astype(int))
            recommended_items = [item_idx for item_idx in ranked_items if item_idx not in known_items][:max_k]

            user_test = self.preprocessor.test_df[
                self.preprocessor.test_df["user_idx"] == user_idx
            ]
            if relevance_mode == "strong":
                user_test = user_test[
                    user_test["weight"] >= self.STRONG_SIGNAL_WEIGHT_THRESHOLD
                ]

            relevant_items = set(user_test["item_idx"].values.astype(int)) - known_items
            if not relevant_items:
                continue

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

    def _get_popularity_ranked_items(self) -> list[int]:
        popularity = (
            self.preprocessor.train_df
            .groupby("item_idx")
            .agg(score=("weight", "sum"), count=("item_idx", "count"))
            .reset_index()
            .sort_values(["score", "count", "item_idx"], ascending=[False, False, True])
        )
        return popularity["item_idx"].astype(int).tolist()

    def _evaluate_rmse(self, model, test_users: list[int]) -> Optional[float]:
        """
        Skor tahmini yapabilen modeller için RMSE hesaplar.

        Content-based modelde kalibre edilmiş tahmin skoru olmadığı için
        sahte bir RMSE üretmek yerine None döndürürüz.
        """
        if not hasattr(model, "predict"):
            return None

        test_subset = self.preprocessor.test_df[
            self.preprocessor.test_df["user_idx"].isin(test_users)
        ]

        y_true: list[float] = []
        y_pred: list[float] = []

        for row in test_subset.itertuples(index=False):
            try:
                predicted_score = float(model.predict(int(row.user_idx), int(row.item_idx)))
            except Exception:
                continue

            y_true.append(float(row.weight))
            y_pred.append(predicted_score)

        if not y_true:
            return None

        return round(root_mean_squared_error(y_true, y_pred), 6)

    def _build_lift_summary(self) -> dict:
        """Model metriklerini popülerlik baseline'ına göre kıyaslar."""
        k = PRIMARY_K
        baseline = self.results.get("popularity_baseline", {}).get(k, {}) or {}
        baseline_precision = float(baseline.get("precision", 0) or 0)
        baseline_hit_rate = float(baseline.get("hit_rate", 0) or 0)
        summary = {}

        for model_name in ["collaborative", "hybrid_lightfm"]:
            metrics = self.results.get(model_name, {}).get(k, {}) or {}
            precision = float(metrics.get("precision", 0) or 0)
            hit_rate = float(metrics.get("hit_rate", 0) or 0)

            summary[model_name] = {
                f"precision_lift_at_{k}": self._safe_lift(precision, baseline_precision),
                f"hit_rate_lift_at_{k}": self._safe_lift(hit_rate, baseline_hit_rate),
                f"baseline_precision_at_{k}": baseline_precision,
                f"baseline_hit_rate_at_{k}": baseline_hit_rate,
            }

        return summary

    @staticmethod
    def _safe_lift(value: float, baseline: float) -> Optional[float]:
        if baseline == 0:
            return None
        return round((value - baseline) / baseline, 6)

    def _build_comparison_table(self) -> dict:
        """Karşılaştırma tablosu oluşturur (DataFrame-uyumlu dict)."""
        k = PRIMARY_K
        rows = []

        for model_name in ["collaborative", "hybrid_lightfm", "popularity_baseline"]:
            if model_name in self.results and k in self.results[model_name]:
                metrics = self.results[model_name][k]
                strong_metrics = (
                    self.results[model_name]
                    .get("strong_signals_weight_gte_3", {})
                    .get(k, {})
                )
                lift = (
                    self.results.get("lift_vs_popularity", {})
                    .get(model_name, {})
                    .get(f"precision_lift_at_{k}")
                )
                rows.append({
                    "Model": model_name,
                    f"Precision@{k}": metrics.get("precision", 0),
                    f"Recall@{k}": metrics.get("recall", 0),
                    f"NDCG@{k}": metrics.get("ndcg", 0),
                    f"HitRate@{k}": metrics.get("hit_rate", 0),
                    f"StrongPrecision@{k}": strong_metrics.get("precision", 0),
                    f"StrongHitRate@{k}": strong_metrics.get("hit_rate", 0),
                    f"PrecisionLiftVsPopularity@{k}": lift,
                    f"MRR": metrics.get("mrr", 0),
                    "RMSE": self.results[model_name].get("rmse"),
                })

        return rows

    def _print_comparison_table(self):
        """Karşılaştırma tablosunu konsola yazdırır."""
        table = self.results.get("comparison_table", [])
        if not table:
            return

        k = PRIMARY_K
        print(f"\n{'─' * 124}")
        print(
            f"{'Model':<20} {'P@' + str(k):<10} {'R@' + str(k):<10} "
            f"{'NDCG@' + str(k):<12} {'HR@' + str(k):<10} "
            f"{'StrongP@' + str(k):<12} {'StrongHR@' + str(k):<12} "
            f"{'LiftP':<10} {'MRR':<10} {'RMSE':<10}"
        )
        print(f"{'─' * 124}")

        for row in table:
            rmse = row["RMSE"]
            rmse_text = f"{rmse:.4f}" if rmse is not None else "N/A"
            lift = row.get(f"PrecisionLiftVsPopularity@{k}")
            lift_text = "N/A" if lift is None else f"{lift:+.2%}"
            print(
                f"{row['Model']:<20} "
                f"{row[f'Precision@{k}']:<10.4f} "
                f"{row[f'Recall@{k}']:<10.4f} "
                f"{row[f'NDCG@{k}']:<12.4f} "
                f"{row[f'HitRate@{k}']:<10.4f} "
                f"{row[f'StrongPrecision@{k}']:<12.4f} "
                f"{row[f'StrongHitRate@{k}']:<12.4f} "
                f"{lift_text:<10} "
                f"{row['MRR']:<10.4f} "
                f"{rmse_text:<10}"
            )

        print(f"{'─' * 124}")

    def get_results_json(self) -> dict:
        """API endpoint'i için JSON-uyumlu sonuç."""
        output = {}
        for model_name in ["collaborative", "hybrid_lightfm", "popularity_baseline"]:
            if model_name in self.results:
                output[model_name] = self._serialize_model_metrics(self.results[model_name])

        output["comparison_table"] = self.results.get("comparison_table", [])
        output["content_based_benchmark"] = self.results.get("content_based_benchmark", {})
        output["evaluation_scope"] = self.results.get("evaluation_scope", {})
        output["lift_vs_popularity"] = self.results.get("lift_vs_popularity", {})
        output["k_values"] = EVAL_K_VALUES
        output["primary_k"] = PRIMARY_K
        output["dataset_summary"] = self._build_dataset_summary()
        output["training_summary"] = self._build_training_summary()
        output["thesis_notes"] = self._build_thesis_notes()

        return output

    def _serialize_model_metrics(self, results: dict) -> dict:
        model_data = {}

        for key, value in results.items():
            if isinstance(key, int):
                model_data[f"k_{key}"] = value
            elif key == "strong_signals_weight_gte_3":
                model_data[key] = {
                    f"k_{nested_key}": nested_value
                    for nested_key, nested_value in value.items()
                    if isinstance(nested_key, int)
                }
            elif key in {"evaluation_time_seconds", "rmse"}:
                model_data[key] = value

        return model_data

    def _build_dataset_summary(self) -> dict:
        stats = getattr(self.preprocessor, "stats", {}) or {}
        n_interactions = int(stats.get("n_interactions", 0) or 0)
        n_train = int(stats.get("n_train", 0) or 0)
        n_test = int(stats.get("n_test", 0) or 0)
        sparsity = float(stats.get("sparsity", 0.0) or 0.0)

        summary = {
            "source": stats.get("source", self._infer_dataset_source()),
            "interaction_source": self.recommender.training_stats.get("interaction_source"),
            "n_users": int(stats.get("n_users", 0) or 0),
            "n_items": int(stats.get("n_items", 0) or 0),
            "n_raw_events": int(stats.get("n_raw_events", n_interactions) or 0),
            "n_interactions": n_interactions,
            "n_observed_pairs": int(stats.get("n_observed_pairs", n_interactions) or 0),
            "n_train": n_train,
            "n_test": n_test,
            "n_raw_train": int(stats.get("n_raw_train", n_train) or 0),
            "n_raw_test": int(stats.get("n_raw_test", n_test) or 0),
            "train_ratio": round(n_train / max(n_interactions, 1), 4),
            "test_ratio": round(n_test / max(n_interactions, 1), 4),
            "sparsity": round(sparsity, 6),
            "sparsity_percent": round(sparsity * 100, 4),
            "n_categories": int(stats.get("n_categories", 0) or 0),
            "split_strategy": stats.get("split_strategy"),
            "aggregation_strategy": stats.get("aggregation_strategy"),
            "event_distribution": self._json_safe_distribution(
                stats.get("event_distribution", {})
            ),
        }

        if "raw_event_distribution" in stats:
            summary["raw_event_distribution"] = self._json_safe_distribution(
                stats.get("raw_event_distribution", {})
            )

        if "weight_distribution" in stats:
            summary["weight_distribution"] = self._json_safe_distribution(
                stats.get("weight_distribution", {})
            )

        return summary

    def _build_training_summary(self) -> dict:
        training_stats = self.recommender.training_stats or {}

        return {
            "interaction_source": training_stats.get("interaction_source"),
            "data_sources": training_stats.get("data_sources", {}),
            "cold_start_threshold": training_stats.get("cold_start_threshold"),
            "evaluated_models": [
                model_name
                for model_name in ["collaborative", "hybrid_lightfm", "popularity_baseline"]
                if model_name in self.results
            ],
            "benchmark_only_models": [
                "content_based"
            ] if self.results.get("content_based_benchmark") else [],
            "ranking_metrics": [f"precision@{k}" for k in EVAL_K_VALUES]
            + [f"recall@{k}" for k in EVAL_K_VALUES]
            + [f"ndcg@{k}" for k in EVAL_K_VALUES],
            "strong_signal_metrics": [
                f"strong_precision@{k}" for k in EVAL_K_VALUES
            ] + [
                f"strong_hit_rate@{k}" for k in EVAL_K_VALUES
            ],
            "baseline": "popularity_baseline",
            "rating_metric": "rmse",
        }

    def _build_thesis_notes(self) -> list[str]:
        dataset_source = self._infer_dataset_source()

        notes = [
            (
                "Precision, Recall, NDCG, HitRate and MRR evaluate the ranking "
                "quality of the generated recommendation list."
            ),
            (
                "Ranking metrics are reported only for models that return the same "
                "PAÜ listing namespace used in production."
            ),
            (
                "RMSE is reported only for models that can predict an explicit "
                "user-item score; content-based similarity does not receive a fake RMSE."
            ),
            (
                "The Mercari content-based model is reported separately as a benchmark "
                "and is not mixed into PAÜ live ranking metrics."
            ),
        ]

        if dataset_source == "paumarket":
            notes.append(
                "This run uses PAÜ Market interaction exports, so event distribution "
                "and sparsity describe the real platform pilot data."
            )
        else:
            notes.append(
                "This run uses benchmark interaction data, so the metrics validate "
                "the algorithmic pipeline before enough PAÜ Market pilot data exists."
            )

        return notes

    def _infer_dataset_source(self) -> str:
        stats = getattr(self.preprocessor, "stats", {}) or {}
        if stats.get("source"):
            return str(stats["source"])

        interaction_source = str(
            self.recommender.training_stats.get("interaction_source", "")
        ).lower()

        if "paü" in interaction_source or "pau" in interaction_source:
            return "paumarket"

        return "retailrocket"

    @staticmethod
    def _json_safe_distribution(distribution: dict) -> dict:
        safe_distribution = {}

        for key, value in distribution.items():
            if hasattr(value, "item"):
                value = value.item()

            if isinstance(value, float):
                safe_distribution[str(key)] = round(value, 6)
            else:
                safe_distribution[str(key)] = int(value)

        return safe_distribution
