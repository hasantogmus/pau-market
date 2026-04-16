from __future__ import annotations
"""
Veri Yükleyici (Data Loader)
============================
Kaggle'dan Retailrocket ve Mercari datasetlerini indirir ve pandas DataFrame olarak yükler.

Kullanım:
    from app.data.loader import load_retailrocket_events, load_mercari
    events_df = load_retailrocket_events()
    mercari_df = load_mercari()
"""

import os
import shutil
import zipfile
import pandas as pd
from pathlib import Path

from app.config import (
    DATA_DIR,
    RETAILROCKET_KAGGLE_DATASET,
    RETAILROCKET_EVENTS_FILE,
    RETAILROCKET_ITEM_PROPS_1,
    RETAILROCKET_ITEM_PROPS_2,
    RETAILROCKET_CATEGORY_TREE,
    MERCARI_KAGGLE_DATASET,
    MERCARI_TRAIN_FILE,
    MERCARI_TEST_FILE,
)


# ═══════════════════════════════════════════════════════════════════
#  RETAILROCKET
# ═══════════════════════════════════════════════════════════════════

def _download_retailrocket():
    """
    Kaggle'dan Retailrocket datasetini indirir.
    kagglehub kütüphanesi kullanılır — KAGGLE_USERNAME ve KAGGLE_KEY
    ortam değişkenleri veya ~/.kaggle/kaggle.json gereklidir.
    """
    if RETAILROCKET_EVENTS_FILE.exists():
        print(f"[loader] RetailRocket verileri zaten mevcut: {DATA_DIR}")
        return

    try:
        import kagglehub
        print("[loader] RetailRocket dataseti indiriliyor (Kaggle)...")
        path = kagglehub.dataset_download(RETAILROCKET_KAGGLE_DATASET)
        downloaded_path = Path(path)

        # İndirilen dosyaları DATA_DIR'e kopyala
        for f in downloaded_path.rglob("*"):
            if f.is_file():
                dest = DATA_DIR / f.name
                shutil.copy2(f, dest)
                print(f"  → {f.name} kopyalandı")

        print(f"[loader] RetailRocket indirme tamamlandı: {DATA_DIR}")

    except ImportError:
        print("[loader] HATA: kagglehub yüklü değil. 'pip install kagglehub' çalıştırın.")
        raise
    except Exception as e:
        print(f"[loader] HATA: RetailRocket indirilemedi: {e}")
        print("[loader] Manuel indirme:")
        print(f"  1. https://www.kaggle.com/datasets/{RETAILROCKET_KAGGLE_DATASET}")
        print(f"  2. İndirilen CSV dosyalarını şuraya koyun: {DATA_DIR}")
        raise


def load_retailrocket_events() -> pd.DataFrame:
    """
    RetailRocket events.csv dosyasını yükler.
    ~2,756,101 satır: view, addtocart, transaction logları.
    """
    _download_retailrocket()

    print("[loader] events.csv yükleniyor...")
    df = pd.read_csv(
        RETAILROCKET_EVENTS_FILE,
        dtype={
            "visitorid": "int64",
            "event": "category",
            "itemid": "int64",
        }
    )
    print(f"[loader] events.csv: {len(df):,} satır, "
          f"{df['visitorid'].nunique():,} kullanıcı, "
          f"{df['itemid'].nunique():,} ürün")
    return df


def load_retailrocket_item_properties() -> pd.DataFrame:
    """RetailRocket item_properties (part1 + part2) dosyalarını birleştirip yükler."""
    _download_retailrocket()

    print("[loader] item_properties yükleniyor...")
    dfs = []
    for fpath in [RETAILROCKET_ITEM_PROPS_1, RETAILROCKET_ITEM_PROPS_2]:
        if fpath.exists():
            dfs.append(pd.read_csv(fpath))

    if not dfs:
        print("[loader] UYARI: item_properties dosyaları bulunamadı.")
        return pd.DataFrame()

    df = pd.concat(dfs, ignore_index=True)
    print(f"[loader] item_properties: {len(df):,} satır")
    return df


def load_retailrocket_categories() -> pd.DataFrame:
    """RetailRocket category_tree.csv dosyasını yükler."""
    _download_retailrocket()

    if not RETAILROCKET_CATEGORY_TREE.exists():
        print("[loader] UYARI: category_tree.csv bulunamadı.")
        return pd.DataFrame()

    print("[loader] category_tree.csv yükleniyor...")
    df = pd.read_csv(RETAILROCKET_CATEGORY_TREE)
    print(f"[loader] category_tree: {len(df):,} kategori")
    return df


# ═══════════════════════════════════════════════════════════════════
#  MERCARI (C2C İkinci El Pazar Verisi)
# ═══════════════════════════════════════════════════════════════════

def _download_mercari():
    """
    Kaggle'dan Mercari yarışma verisini indirir.

    Mercari bir 'competition' olduğu için kagglehub.competition_download
    kullanılır. Eğer bu başarısız olursa Kaggle CLI'ya düşer.
    """
    if MERCARI_TRAIN_FILE.exists():
        print(f"[loader] Mercari verileri zaten mevcut: {DATA_DIR}")
        return

    print("[loader] Mercari dataseti indiriliyor...")
    print("[loader] ⚠️ Mercari bir Kaggle yarışmasıdır (competition).")
    print("[loader]   → https://www.kaggle.com/c/mercari-price-suggestion-challenge/rules")
    print("[loader]   → Yarışma kurallarını kabul etmiş olmanız gerekir.")

    try:
        # Yöntem 1: kagglehub ile dene
        import kagglehub
        try:
            path = kagglehub.competition_download(MERCARI_KAGGLE_DATASET)
            downloaded_path = Path(path)
            _extract_mercari_files(downloaded_path)
            return
        except AttributeError:
            print("[loader] kagglehub.competition_download desteklemiyor, CLI'ya geçiliyor...")
        except Exception as e:
            print(f"[loader] kagglehub ile indirme başarısız: {e}")

        # Yöntem 2: Kaggle CLI
        print("[loader] Kaggle CLI ile indirme deneniyor...")
        import subprocess
        result = subprocess.run(
            [
                "kaggle", "competitions", "download",
                "-c", "mercari-price-suggestion-challenge",
                "-p", str(DATA_DIR),
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            print(f"[loader] CLI hatası: {result.stderr}")
            _print_mercari_manual_instructions()
            raise RuntimeError("Mercari otomatik indirilemedi")

        # ZIP dosyalarını aç
        for zf in DATA_DIR.glob("*.zip"):
            print(f"  → {zf.name} açılıyor...")
            with zipfile.ZipFile(zf, "r") as z:
                z.extractall(DATA_DIR)
            zf.unlink()  # ZIP'i sil

        # 7z dosyası varsa (Mercari bazen 7z kullanır)
        for sz in DATA_DIR.glob("*.7z"):
            print(f"  → {sz.name} açılıyor (7z)...")
            subprocess.run(["7z", "x", str(sz), f"-o{DATA_DIR}"], check=True)
            sz.unlink()

        print(f"[loader] Mercari indirme tamamlandı: {DATA_DIR}")

    except Exception as e:
        print(f"[loader] Mercari indirme hatası: {e}")
        _print_mercari_manual_instructions()
        raise


def _extract_mercari_files(downloaded_path: Path):
    """İndirilen Mercari dosyalarını DATA_DIR'e kopyalar/açar."""
    for f in downloaded_path.rglob("*"):
        if f.is_file():
            if f.suffix == ".zip":
                print(f"  → {f.name} açılıyor...")
                with zipfile.ZipFile(f, "r") as z:
                    z.extractall(DATA_DIR)
            else:
                dest = DATA_DIR / f.name
                shutil.copy2(f, dest)
                print(f"  → {f.name} kopyalandı")


def _print_mercari_manual_instructions():
    """Manuel Mercari indirme talimatlarını yazdırır."""
    print("\n" + "=" * 60)
    print("  MANUEL İNDİRME TALİMATLARI (Mercari)")
    print("=" * 60)
    print("  1. Şu adrese gidin:")
    print("     https://www.kaggle.com/c/mercari-price-suggestion-challenge/data")
    print("  2. 'Download All' butonuna tıklayın")
    print("  3. İndirilen dosyaları açıp şuraya koyun:")
    print(f"     {DATA_DIR}")
    print("  4. Gerekli dosyalar: train.tsv, test_stg2.tsv")
    print("=" * 60 + "\n")


def load_mercari() -> pd.DataFrame:
    """
    Mercari veri setini yükler — train.tsv ve test_stg2.tsv birleştirilir.

    train.tsv   : ~1,482,535 ürün ilanı (fiyat etiketli)
    test_stg2.tsv: ~3,460,725 ürün ilanı (fiyatsız ama metin açıklamalı)
    TOPLAM      : ~4,943,260 C2C ikinci el ürün metni

    Sütunlar (kullanılacak):
        - name: İlan başlığı (ör: "iPhone 11 Pro 64GB Like New")
        - category_name: Kategori ağacı (ör: "Electronics/Cell Phones/iPhone")
        - item_description: Satıcının yazdığı açıklama metni
        - item_condition_id: Ürün durumu (1=yeni, 5=kötü)
        - brand_name: Marka (varsa)
        - price: Fiyat (sadece train.tsv'de var)

    Returns:
        pd.DataFrame: Birleştirilmiş ~4.9 milyon satırlık DataFrame
    """
    _download_mercari()

    dfs = []

    # ── train.tsv (~1.48M satır) ──
    if MERCARI_TRAIN_FILE.exists():
        print("[loader] Mercari train.tsv yükleniyor...")
        df_train = pd.read_csv(MERCARI_TRAIN_FILE, sep="\t")
        df_train["source"] = "train"
        dfs.append(df_train)
        print(f"  → train.tsv: {len(df_train):,} satır")
    else:
        print("[loader] UYARI: train.tsv bulunamadı!")

    # ── test_stg2.tsv (~3.46M satır) ──
    if MERCARI_TEST_FILE.exists():
        print("[loader] Mercari test_stg2.tsv yükleniyor...")
        df_test = pd.read_csv(MERCARI_TEST_FILE, sep="\t")
        df_test["source"] = "test"
        # Test setinde price yok, NaN olarak kalacak
        if "price" not in df_test.columns:
            df_test["price"] = float("nan")
        dfs.append(df_test)
        print(f"  → test_stg2.tsv: {len(df_test):,} satır")
    else:
        print("[loader] UYARI: test_stg2.tsv bulunamadı, sadece train.tsv kullanılacak.")

    if not dfs:
        raise FileNotFoundError(
            f"Mercari dosyaları bulunamadı: {DATA_DIR}\n"
            f"Beklenen: train.tsv ve/veya test_stg2.tsv"
        )

    # ── Birleştir ──
    df = pd.concat(dfs, ignore_index=True)

    # ── Temel temizlik ──
    # Boş açıklamaları ("No description yet") temizle
    df["item_description"] = df["item_description"].fillna("")
    df["item_description"] = df["item_description"].replace("No description yet", "")

    df["name"] = df["name"].fillna("")
    df["category_name"] = df["category_name"].fillna("")
    df["brand_name"] = df["brand_name"].fillna("")

    print(f"\n[loader] ✅ Mercari toplam: {len(df):,} ürün ilanı yüklendi")
    print(f"   → Train: {len(df[df['source'] == 'train']):,}")
    test_count = len(df[df['source'] == 'test'])
    if test_count > 0:
        print(f"   → Test (stage2): {test_count:,}")

    return df
