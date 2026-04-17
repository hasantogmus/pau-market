from __future__ import annotations

import json
import os
import pickle
import threading
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pyodbc
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

MODEL_FILE = Path(os.getenv("LIGHTFM_MODEL_FILE", "yapay_zeka_modeli.pkl"))
DATASET_FILE = Path(os.getenv("LIGHTFM_DATASET_FILE", "veri_haritasi.pkl"))
METADATA_FILE = Path(os.getenv("LIGHTFM_METADATA_FILE", "model_metadata.json"))
SQL_CONNECTION = os.getenv(
    "LIGHTFM_SQL_CONNECTION",
    r"Driver={ODBC Driver 17 for SQL Server};Server=localhost\SQLEXPRESS;Database=PauMarketDb;Trusted_Connection=yes;",
)
RELOAD_TOKEN = os.getenv("LIGHTFM_RELOAD_TOKEN")
LOCALHOSTS = {"127.0.0.1", "::1", "localhost"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ModelState:
    model: Any | None = None
    dataset: Any | None = None
    loaded_at: str | None = None
    model_trained_at: str | None = None
    training_summary: dict[str, Any] = field(default_factory=dict)


state = ModelState()
state_lock = threading.RLock()


def load_metadata() -> dict[str, Any]:
    if not METADATA_FILE.exists():
        return {}

    with METADATA_FILE.open("r", encoding="utf-8") as metadata_file:
        return json.load(metadata_file)


def load_model_bundle() -> dict[str, Any]:
    if not MODEL_FILE.exists() or not DATASET_FILE.exists():
        raise FileNotFoundError("Model veya dataset dosyasi bulunamadi.")

    with MODEL_FILE.open("rb") as model_file:
        loaded_model = pickle.load(model_file)

    with DATASET_FILE.open("rb") as dataset_file:
        loaded_dataset = pickle.load(dataset_file)

    metadata = load_metadata()
    return {
        "model": loaded_model,
        "dataset": loaded_dataset,
        "metadata": metadata,
    }


def replace_state(bundle: dict[str, Any]) -> None:
    metadata = bundle.get("metadata") or {}

    with state_lock:
        state.model = bundle["model"]
        state.dataset = bundle["dataset"]
        state.loaded_at = utc_now_iso()
        state.model_trained_at = metadata.get("trained_at")
        state.training_summary = metadata


def reload_model_bundle() -> dict[str, Any]:
    bundle = load_model_bundle()
    replace_state(bundle)
    return get_model_status()


def get_model_status() -> dict[str, Any]:
    with state_lock:
        return {
            "durum": "hazir" if state.model is not None and state.dataset is not None else "model_yok",
            "model_dosyasi": str(MODEL_FILE),
            "dataset_dosyasi": str(DATASET_FILE),
            "metadata_dosyasi": str(METADATA_FILE),
            "yuklenme_zamani": state.loaded_at,
            "egitim_zamani": state.model_trained_at,
            "egitim_ozeti": state.training_summary,
        }


def ensure_reload_allowed(request: Request) -> None:
    if RELOAD_TOKEN:
        provided_token = request.headers.get("x-reload-token")
        if provided_token != RELOAD_TOKEN:
            raise HTTPException(status_code=401, detail="Gecersiz reload token.")
        return

    client_host = request.client.host if request.client else None
    if client_host not in LOCALHOSTS:
        raise HTTPException(
            status_code=403,
            detail="Reload endpoint sadece localhost uzerinden veya token ile kullanilabilir.",
        )


def fetch_listing_details(listing_ids: list[int]) -> list[dict[str, Any]]:
    if not listing_ids:
        return []

    placeholders = ",".join("?" * len(listing_ids))
    query = (
        f"SELECT Id, Title, Price, Condition, Category "
        f"FROM dbo.Listings WHERE Id IN ({placeholders})"
    )

    with pyodbc.connect(SQL_CONNECTION) as conn:
        cursor = conn.cursor()
        cursor.execute(query, listing_ids)

        columns = [column[0] for column in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    rows_by_id = {int(row["Id"]): row for row in rows}
    return [rows_by_id[item_id] for item_id in listing_ids if item_id in rows_by_id]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        reload_model_bundle()
        print("LightFM model bundle basariyla yuklendi.")
    except Exception as exc:
        print(f"Model yuklenirken hata olustu: {exc}")

    yield

    with state_lock:
        state.model = None
        state.dataset = None


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    return {"durum": "Sistem ayakta", "mesaj": "Yapay Zeka API calisiyor."}


@app.get("/health/model-status")
def model_status():
    return get_model_status()


@app.post("/admin/reload-model")
def reload_model(request: Request):
    ensure_reload_allowed(request)

    try:
        return {
            "durum": "yenilendi",
            "model": reload_model_bundle(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model reload basarisiz: {exc}") from exc


@app.get("/oneri-getir/{kullanici_id}")
def get_recommendations(kullanici_id: int):
    try:
        with state_lock:
            current_model = state.model
            current_dataset = state.dataset

        if current_model is None or current_dataset is None:
            raise RuntimeError("Model henuz bellege yuklenmedi.")

        user_id_map, _, item_id_map, _ = current_dataset.mapping()

        if kullanici_id not in user_id_map:
            raise ValueError(f"Kullanici {kullanici_id} haritada bulunamadi.")

        internal_user_id = user_id_map[kullanici_id]
        _, item_count = current_dataset.interactions_shape()

        item_ids = np.arange(item_count)
        scores = current_model.predict(internal_user_id, item_ids)
        top_indices = np.argsort(-scores)[:5]

        inverse_item_map = {internal: external for external, internal in item_id_map.items()}
        top_items = [int(inverse_item_map[int(index)]) for index in top_indices if int(index) in inverse_item_map]
        product_details = fetch_listing_details(top_items)

        return {
            "kullanici_id": kullanici_id,
            "durum": "AI_Aktif",
            "onerilen_urunler": product_details,
        }

    except ValueError:
        return {
            "kullanici_id": kullanici_id,
            "durum": "cold_start",
            "mesaj": "Kullanici modelde bulunamadi. Lutfen onboarding tercihlerine (kategori/kondisyon) gore veritabanindan urun getirin.",
        }
    except Exception as exc:
        return JSONResponse(status_code=500, content={"hata": str(exc)})
