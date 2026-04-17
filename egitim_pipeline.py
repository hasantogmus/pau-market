from __future__ import annotations

import json
import os
import pickle
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

import pandas as pd
import pyodbc
from lightfm import LightFM
from lightfm.data import Dataset

CONN_STR = os.getenv(
    "LIGHTFM_SQL_CONNECTION",
    r"Driver={ODBC Driver 17 for SQL Server};Server=127.0.0.1,1433;Database=PauMarketDb;Trusted_Connection=yes;",
)
MODEL_FILE = Path(os.getenv("LIGHTFM_MODEL_FILE", "yapay_zeka_modeli.pkl"))
DATASET_FILE = Path(os.getenv("LIGHTFM_DATASET_FILE", "veri_haritasi.pkl"))
METADATA_FILE = Path(os.getenv("LIGHTFM_METADATA_FILE", "model_metadata.json"))
RELOAD_URL = os.getenv("LIGHTFM_RELOAD_URL", "http://127.0.0.1:8000/admin/reload-model")
RELOAD_TOKEN = os.getenv("LIGHTFM_RELOAD_TOKEN")
BACKUP_DIR = Path(os.getenv("LIGHTFM_BACKUP_DIR", "model_backups"))
LIGHTFM_LOSS = os.getenv("LIGHTFM_LOSS", "logistic")
LIGHTFM_COMPONENTS = int(os.getenv("LIGHTFM_COMPONENTS", "30"))
LIGHTFM_LEARNING_RATE = float(os.getenv("LIGHTFM_LEARNING_RATE", "0.05"))
LIGHTFM_EPOCHS = int(os.getenv("LIGHTFM_EPOCHS", "30"))
LIGHTFM_THREADS = int(os.getenv("LIGHTFM_THREADS", "1"))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def atomic_write_bytes(target: Path, data: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False, dir=target.parent, suffix=".tmp") as temp_file:
        temp_file.write(data)
        temp_path = Path(temp_file.name)

    temp_path.replace(target)


def atomic_write_json(target: Path, payload: dict) -> None:
    atomic_write_bytes(target, json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))


def backup_existing_models() -> None:
    if not MODEL_FILE.exists():
        return

    timestamp = now_utc().strftime("%Y%m%d_%H%M%S")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    shutil.copy(MODEL_FILE, BACKUP_DIR / f"{MODEL_FILE.name}_{timestamp}")
    if DATASET_FILE.exists():
        shutil.copy(DATASET_FILE, BACKUP_DIR / f"{DATASET_FILE.name}_{timestamp}")
    if METADATA_FILE.exists():
        shutil.copy(METADATA_FILE, BACKUP_DIR / f"{METADATA_FILE.name}_{timestamp}")

    print(f"Eski modeller '{BACKUP_DIR}' dizinine yedeklendi.")


def save_model_bundle(model: LightFM, dataset: Dataset, metadata: dict) -> None:
    backup_existing_models()

    atomic_write_bytes(MODEL_FILE, pickle.dumps(model))
    atomic_write_bytes(DATASET_FILE, pickle.dumps(dataset))
    atomic_write_json(METADATA_FILE, metadata)


def notify_fastapi_reload() -> bool:
    headers = {}
    if RELOAD_TOKEN:
        headers["X-Reload-Token"] = RELOAD_TOKEN

    reload_request = request.Request(RELOAD_URL, method="POST", headers=headers)

    try:
        with request.urlopen(reload_request, timeout=15) as response:
            body = response.read().decode("utf-8", errors="replace")
            print(f"FastAPI model reload cagrildi. HTTP {response.status}: {body}")
            return True
    except error.URLError as exc:
        print(f"FastAPI reload cagrisi basarisiz oldu: {exc}")
        return False


def build_metadata(
    trained_at: datetime,
    interaction_count: int,
    user_count: int,
    item_count: int,
) -> dict:
    return {
        "trained_at": trained_at.isoformat(),
        "interaction_count": interaction_count,
        "user_count": user_count,
        "item_count": item_count,
        "loss": LIGHTFM_LOSS,
        "epochs": LIGHTFM_EPOCHS,
        "components": LIGHTFM_COMPONENTS,
        "model_file": str(MODEL_FILE),
        "dataset_file": str(DATASET_FILE),
        "pipeline": "egitim_pipeline.py",
    }


def train_model() -> bool:
    start_time = now_utc()
    print(f"[{start_time.isoformat()}] Egitim pipeline baslatiliyor...")

    try:
        with pyodbc.connect(CONN_STR) as conn:
            df_interactions = pd.read_sql(
                "SELECT UserId, ListingId, InteractionType FROM dbo.Interactions",
                conn,
            )
            users_in_db = pd.read_sql("SELECT Id FROM dbo.Users", conn)["Id"].dropna().unique().astype(int).tolist()
            items_in_db = pd.read_sql("SELECT Id FROM dbo.Listings", conn)["Id"].dropna().unique().astype(int).tolist()

        if df_interactions.empty:
            print("Hata: Veritabaninda egitim icin etkilesim verisi bulunamadi.")
            return False

        df_interactions.columns = [column.lower() for column in df_interactions.columns]
        users_in_int = df_interactions["userid"].dropna().unique().astype(int).tolist()
        items_in_int = df_interactions["listingid"].dropna().unique().astype(int).tolist()

        all_user_ids = sorted(set(users_in_db + users_in_int))
        all_item_ids = sorted(set(items_in_db + items_in_int))

        print(f"Toplam {len(all_user_ids)} kullanici ve {len(all_item_ids)} urun haritalandi.")
        print(f"{len(df_interactions)} adet etkilesim verisi yuklendi.")

        dataset = Dataset()
        dataset.fit(users=all_user_ids, items=all_item_ids)

        interactions_list = [
            (int(row["userid"]), int(row["listingid"]), int(row["interactiontype"]))
            for _, row in df_interactions.iterrows()
        ]

        interactions, weights = dataset.build_interactions(interactions_list)
        print(f"Etkilesim matrisi olusturuldu. Sekil: {weights.shape}")

        print(f"Model egitiliyor (Loss={LIGHTFM_LOSS}, Epochs={LIGHTFM_EPOCHS}, Threads={LIGHTFM_THREADS})...")
        model = LightFM(
            loss=LIGHTFM_LOSS,
            no_components=LIGHTFM_COMPONENTS,
            learning_rate=LIGHTFM_LEARNING_RATE,
        )
        model.fit(interactions, sample_weight=weights, epochs=LIGHTFM_EPOCHS, num_threads=LIGHTFM_THREADS)

        metadata = build_metadata(
            trained_at=start_time,
            interaction_count=len(df_interactions),
            user_count=len(all_user_ids),
            item_count=len(all_item_ids),
        )
        save_model_bundle(model, dataset, metadata)
        print(f"[{now_utc().isoformat()}] Basarili! Yeni model ve veri haritasi kaydedildi.")

        notify_fastapi_reload()
        return True

    except Exception as exc:
        print(f"Pipeline sirasinda bir hata olustu: {exc}")
        return False


if __name__ == "__main__":
    raise SystemExit(0 if train_model() else 1)
