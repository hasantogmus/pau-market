from fastapi import FastAPI
from fastapi.responses import JSONResponse
import pickle
import numpy as np
import lightfm
import pyodbc
from contextlib import asynccontextmanager

model = None
dataset = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, dataset
    try:
        with open("yapay_zeka_modeli.pkl", "rb") as f:
            model = pickle.load(f)
        with open("veri_haritasi.pkl", "rb") as f:
            dataset = pickle.load(f)
        print("Modeller başarıyla belleğe alındı.")
    except Exception as e:
        print(f"Model yüklenirken hata oluştu: {e}")
        # Uygulama demo ve geliştirme amaçlı olduğu için buradaki hatayı şimdilik sadece yazdırıyoruz, çökmeyi engelliyoruz.
    
    yield
    
    # Kapanışta belleği boşaltıyoruz
    model = None
    dataset = None

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"durum": "Sistem ayakta", "mesaj": "Yapay Zeka API çalışıyor."}

@app.get("/oneri-getir/{kullanici_id}")
def get_recommendations(kullanici_id: int):
    try:
        # Toplam ürün sayısını dataset üzerinden elde ediyoruz.
        # dataset.interactions_shape() genelde (user_count, item_count) döner.
        user_count, n_items = dataset.interactions_shape()
        
        # O kullanıcı için tüm ürünlere skor üretiyoruz
        # model.predict(kullanici_id, np.arange(n_items)) LightFM'in predict metodunu çağırır.
        item_ids = np.arange(n_items)
        skorlar = model.predict(kullanici_id, item_ids)
        
        # En yüksek skorlu 5 ürünün indisini alıyoruz
        top_indices = np.argsort(-skorlar)[:5]
        
        # dataset.mapping() fonksiyonundan item_id_map sözlüğünü çekiyoruz
        _, _, item_id_map, _ = dataset.mapping()
        
        # internal_index -> external_id formatında ters sözlük oluşturuyoruz
        inverse_item_map = {internal: external for external, internal in item_id_map.items()}
        
        # İç indeksleri gerçek SQL (external) ID'lerine çevir ve standart Python int tipine dönüştür
        top_items = [int(inverse_item_map[int(x)]) for x in top_indices]
        
        urun_detaylari = []
        if top_items:
            # pyodbc üzerinden SQL parametrik IN cümlesi için gereken placeholder'ı oluştur
            placeholders = ",".join("?" * len(top_items))
            # SQL Injection'ı önlemek için değerleri execute kısmına parametre ile veriyoruz
            query = f"SELECT Id, Title, Price, Condition, Category FROM dbo.Listings WHERE Id IN ({placeholders})"
            
            # Bağlantı ve güvenli with bloğu kullanımı
            conn_str = r'Driver={ODBC Driver 17 for SQL Server};Server=localhost\SQLEXPRESS;Database=PauMarketDb;Trusted_Connection=yes;'
            
            with pyodbc.connect(conn_str) as conn:
                cursor = conn.cursor()
                cursor.execute(query, top_items)
                
                # Sütun adlarını description ile dinamik al
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    urun_detaylari.append(dict(zip(columns, row)))
                    
        return {
            "kullanici_id": kullanici_id,
            "durum": "AI_Aktif",
            "onerilen_urunler": urun_detaylari
        }
        
    except ValueError:
        return {
            "kullanici_id": kullanici_id,
            "durum": "cold_start",
            "mesaj": "Kullanıcı modelde bulunamadı. Lütfen onboarding tercihlerine (kategori/kondisyon) göre veritabanından ürün getirin."
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"hata": str(e)})

