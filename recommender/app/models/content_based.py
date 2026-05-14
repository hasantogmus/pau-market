from __future__ import annotations
"""
Model 1: İçerik Tabanlı NLP Filtreleme — TF-IDF + Cosine Similarity
=====================================================================
Mercari veri setindeki ~4.9 milyon C2C ürün açıklaması üzerinden
TF-IDF vektörleri oluşturur ve ürünler arası metin benzerliği hesaplar.

⚠️ RAM KORUMALEMMA: N×N (4.9M × 4.9M = 24 Trilyon) similarity matrisi
   ÖNCEden hesaplanMAZ. Bunun yerine "Lazy Computation" (Anlık Hesaplama)
   kullanılır: Sadece sorgulanan ürünün diğer ürünlerle benzerliği anlık
   olarak hesaplanır.

Referans:
    Pazzani, M. J., & Billsus, D. (2007).
    Content-Based Recommendation Systems.
    The Adaptive Web, Springer.

Kullanım:
    from app.models.content_based import ContentBasedModel
    model = ContentBasedModel()
    model.train_with_mercari(mercari_df)
    similar = model.get_similar_items(item_idx=42, n=5)
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

# ── TF-IDF Hiperparametreleri ──
TFIDF_MAX_FEATURES = 25_000   # Kelime haznesi limiti (RAM koruması)
TFIDF_NGRAM_RANGE = (1, 2)    # Unigram + Bigram ("iphone" + "iphone pro")
TFIDF_MIN_DF = 5              # En az 5 ilanda geçen kelimeler
TFIDF_MAX_DF = 0.95           # İlanların %95'inden fazlasında geçen kelimeleri at


class ContentBasedModel:
    """
    Mercari C2C verisinden eğitilen TF-IDF + Cosine Similarity modeli.

    Önemli:
        - Bu model RetailRocket'ten BAĞIMSIZ çalışır.
        - Eğitim: Mercari ürün açıklamaları üzerinden TF-IDF fit.
        - Öneri: Sorgulanan ürüne en yakın ilanları anlık (lazy) hesaplar.
        - Değerlendirme: Mercari'nin kendi category_name sütunu üzerinden
          "aynı kategorideki ürünleri ne kadar iyi yakalıyor?" testi yapılır.
    """

    def __init__(self):
        self.tfidf_matrix: csr_matrix | None = None
        self.vectorizer: TfidfVectorizer | None = None
        self.mercari_df: pd.DataFrame | None = None
        self.is_trained = False
        self._n_items = 0

    def train(self, mercari_df: pd.DataFrame) -> dict:
        """
        Mercari C2C verisi üzerinden TF-IDF modelini eğitir.

        Her ilan için zengin bir metin profili oluşturur:
            "{name} {category_name} {brand_name} {item_description}"

        Ardından TF-IDF ile vektörleştirir (N×N matris HESAPLANMAZ).

        Args:
            mercari_df: load_mercari() tarafından dönen DataFrame

        Returns:
            dict: Eğitim istatistikleri
        """
        self.mercari_df = mercari_df
        self._n_items = len(mercari_df)

        print("\n📄 [CB] Mercari NLP Modeli (TF-IDF) eğitiliyor...")
        print(f"   Toplam ilan sayısı: {self._n_items:,}")

        # ── Her ilan için zengin metin profili oluştur ──
        print("   1/3 → Metin profilleri oluşturuluyor...")
        texts = self._build_text_profiles(mercari_df)

        # ── TF-IDF Vektörizasyonu ──
        print(f"   2/3 → TF-IDF vektörizasyonu (max_features={TFIDF_MAX_FEATURES:,})...")
        self.vectorizer = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
            min_df=TFIDF_MIN_DF,
            max_df=TFIDF_MAX_DF,
            strip_accents="unicode",
            stop_words="english",
            sublinear_tf=True,     # log(1 + tf) → daha düzgün dağılım
            dtype=np.float32,      # RAM tasarrufu (float64 yerine)
        )

        self.tfidf_matrix = self.vectorizer.fit_transform(texts)

        self.is_trained = True

        # ── İstatistikler ──
        vocab_size = len(self.vectorizer.vocabulary_)
        matrix_size_mb = (
            self.tfidf_matrix.data.nbytes +
            self.tfidf_matrix.indices.nbytes +
            self.tfidf_matrix.indptr.nbytes
        ) / (1024 * 1024)

        stats = {
            "model": "Content-Based (Mercari NLP TF-IDF)",
            "n_items": self._n_items,
            "vocab_size": vocab_size,
            "tfidf_shape": list(self.tfidf_matrix.shape),
            "matrix_size_mb": round(matrix_size_mb, 1),
            "max_features": TFIDF_MAX_FEATURES,
            "ngram_range": list(TFIDF_NGRAM_RANGE),
            "lazy_computation": True,  # N×N matris OLUŞTURULMADI
        }

        print(f"   3/3 → ✅ Eğitim tamamlandı!")
        print(f"         Kelime dağarcığı: {vocab_size:,} terim")
        print(f"         TF-IDF matrisi: {self.tfidf_matrix.shape} "
              f"({matrix_size_mb:.1f} MB RAM)")
        print(f"         ⚡ N×N similarity HESAPLANMADI (Lazy mode aktif)")

        return stats

    def _build_text_profiles(self, df: pd.DataFrame) -> list:
        """
        Her ilan için metin profili oluşturur.
        Birden fazla sütunu birleştirerek zengin bir metin temsili sağlar.

        Format: "{name} {category_tokens} {brand} {description}"
        Örnek: "iphone 11 pro electronics cell_phones iphone apple like new 64gb"
        """
        # Kategori ağacını tokenize et (Electronics/Cell Phones → electronics cell_phones)
        categories = (
            df["category_name"]
            .str.replace("/", " ", regex=False)
            .str.lower()
            .fillna("")
        )

        # Zengin metin profili
        texts = (
            df["name"].str.lower().fillna("") + " " +
            categories + " " +
            df["brand_name"].str.lower().fillna("") + " " +
            df["item_description"].str.lower().fillna("")
        )

        return texts.tolist()

    def get_similar_items(self, item_idx: int, n: int = 5) -> list[dict]:
        """
        Belirtilen ürüne en benzer N ürünü bulur (LAZY / Anlık Hesaplama).

        ⚡ Bu metod, SADECE sorgulanan ürünün diğer ürünlerle benzerliğini
        hesaplar. 4.9M × 4.9M matris OLUŞTURULMAZ.

        Maliyet: O(N × d) — sadece 1 vektörün çarpımı, d = kelime dağarcığı

        Args:
            item_idx: Ürünün index'i (0-indexed)
            n: Döndürülecek benzer ürün sayısı

        Returns:
            list[dict]: [{"item_idx": int, "similarity": float}, ...]
        """
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi.")

        if item_idx < 0 or item_idx >= self._n_items:
            raise ValueError(f"Geçersiz item_idx: {item_idx}. Aralık: 0-{self._n_items - 1}")

        # Sorgulanan ürünün TF-IDF vektörü (1 × D sparse vektör)
        query_vector = self.tfidf_matrix[item_idx]

        # Sadece bu 1 vektörün TÜM diğer ürünlerle benzerliğini hesapla
        # Bu işlem O(N×D) = 4.9M × 25K ≈ birkaç saniye (M5'te)
        similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()

        # Kendisini hariç tut
        similarities[item_idx] = -1.0

        # En yüksek benzerlik skorlu N ürünü bul
        top_indices = np.argpartition(-similarities, n)[:n]
        top_indices = top_indices[np.argsort(-similarities[top_indices])]

        return [
            {
                "item_idx": int(idx),
                "similarity": float(similarities[idx]),
                "name": self.mercari_df.iloc[idx]["name"] if self.mercari_df is not None else "",
            }
            for idx in top_indices
        ]

    def recommend(self, user_idx: int, n: int = 5, exclude_known: bool = True) -> list[dict]:
        """
        İçerik tabanlı öneri üretir.

        Bu model RetailRocket'ten bağımsız çalıştığı için,
        user_idx parametresi burada "Mercari'nin kendi iç dünyası"
        üzerinden çalışır.

        Gerçek Paü Market entegrasyonunda, .NET backend kullanıcının
        görüntülediği/favorileddiği ürünlerin açıklamalarını gönderir,
        bu model benzer ürünleri döndürür.

        Benchmark amaçlı: Rastgele bir ürün seçip ona benzer ürünleri döndürür.

        Args:
            user_idx: Simüle edilmiş kullanıcı index'i
            n: Kaç öneri döndürülecek
            exclude_known: Bilinen ürünleri hariç tut (benchmark'ta uygulanmaz)

        Returns:
            list[dict]: [{"item_idx": int, "score": float}, ...]
        """
        if not self.is_trained:
            raise RuntimeError("Model henüz eğitilmedi.")

        # Benchmark: user_idx'i deterministik olarak bir ürüne eşle
        seed_item = user_idx % self._n_items
        similar = self.get_similar_items(seed_item, n)

        return [
            {"item_idx": s["item_idx"], "score": s["similarity"]}
            for s in similar
        ]

    def evaluate_category_accuracy(self, n_samples: int = 1000, k: int = 5) -> dict:
        """
        Mercari'nin kendi verisinde Content-Based modelin kalitesini ölçer.

        Yöntem: Rastgele N ürün seç → her birinin top-K benzer ürününü bul →
        benzer ürünlerin kaçı AYNI KATEGORİDE?

        Bu, "NLP benzerlik algoritması gerçekten benzer ürünleri mi buluyor?"
        sorusuna doğrudan cevap verir.

        Args:
            n_samples: Test edilecek ürün sayısı
            k: Her ürün için kaç benzer bakılacak

        Returns:
            dict: {
                "category_precision": float,
                "n_samples": int,
                "k": int,
            }
        """
        if not self.is_trained or self.mercari_df is None:
            raise RuntimeError("Model henüz eğitilmedi.")

        print(f"\n📊 [CB] Kategori doğruluk testi ({n_samples:,} ürün, top-{k})...")

        # Kategorisi olan ürünleri filtrele
        has_category = self.mercari_df["category_name"].str.len() > 0
        valid_indices = self.mercari_df[has_category].index.tolist()

        if len(valid_indices) < n_samples:
            n_samples = len(valid_indices)

        # Deterministik örnekleme
        rng = np.random.RandomState(42)
        sample_indices = rng.choice(valid_indices, size=n_samples, replace=False)

        hits = 0
        total = 0

        for idx in sample_indices:
            source_category = self.mercari_df.iloc[idx]["category_name"]
            # Ana kategoriyi al (Electronics/Cell Phones → Electronics)
            source_main_cat = source_category.split("/")[0] if "/" in source_category else source_category

            similar = self.get_similar_items(int(idx), n=k)

            for s in similar:
                target_category = self.mercari_df.iloc[s["item_idx"]]["category_name"]
                target_main_cat = target_category.split("/")[0] if "/" in target_category else target_category

                total += 1
                if source_main_cat == target_main_cat:
                    hits += 1

        precision = hits / max(total, 1)

        result = {
            "category_precision_at_k": round(precision, 4),
            "n_samples": n_samples,
            "k": k,
            "total_comparisons": total,
            "correct_category_matches": hits,
        }

        print(f"   ✅ Kategori Precision@{k}: {precision:.2%}")
        print(f"      ({hits:,}/{total:,} benzer ürün doğru kategoride)")

        return result
