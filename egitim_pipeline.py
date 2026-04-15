import pyodbc
import pandas as pd
import pickle
import os
import shutil
from datetime import datetime
from lightfm import LightFM
from lightfm.data import Dataset

# 1. Ayarlar
CONN_STR = r'Driver={ODBC Driver 17 for SQL Server};Server=localhost\SQLEXPRESS;Database=PauMarketDb;Trusted_Connection=yes;'
MODEL_FILE = "yapay_zeka_modeli.pkl"
DATASET_FILE = "veri_haritasi.pkl"

def backup_existing_models():
    """Mevcut model dosyalarını zaman damgasıyla yedekler."""
    if os.path.exists(MODEL_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = "model_backups"
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        shutil.copy(MODEL_FILE, os.path.join(backup_dir, f"{MODEL_FILE}_{timestamp}"))
        if os.path.exists(DATASET_FILE):
            shutil.copy(DATASET_FILE, os.path.join(backup_dir, f"{DATASET_FILE}_{timestamp}"))
        print(f"Eski modeller '{backup_dir}' dizinine yedeklendi.")

def train_model():
    print(f"[{datetime.now()}] Eğitim pipeline başlatılıyor...")

    try:
        # 2. Veritabanından Etkileşimleri Çek
        conn = pyodbc.connect(CONN_STR)
        
        # Etkileşimleri çek (InteractionType: View=1, Favorite=3)
        query = "SELECT UserId, ListingId, InteractionType FROM dbo.Interactions"
        df_interactions = pd.read_sql(query, conn)
        
        # Tüm mevcut Kullanıcı ve İlan ID'lerini çek (Mapping için)
        users_query = "SELECT Id FROM dbo.Users"
        items_query = "SELECT Id FROM dbo.Listings"
        all_user_ids = pd.read_sql(users_query, conn)['Id'].unique()
        all_item_ids = pd.read_sql(items_query, conn)['Id'].unique()
        
        conn.close()
        
        if df_interactions.empty:
            print("Hata: Veritabanında eğitim için etkileşim verisi bulunamadı.")
            return

        print(f"{len(df_interactions)} adet etkileşim verisi yüklendi.")

        # 3. LightFM Dataset Oluşturma & Mapping
        dataset = Dataset()
        dataset.fit(
            users=all_user_ids,
            items=all_item_ids
        )

        # Matris oluşturma (Ağırlıklı)
        # build_interactions list of (user_id, item_id, weight) bekler
        interactions_list = []
        for _, row in df_interactions.iterrows():
            # InteractionType değerini ağırlık (rating) olarak kullanıyoruz
            interactions_list.append((row['UserId'], row['ListingId'], row['InteractionType']))

        (interactions, weights) = dataset.build_interactions(interactions_list)
        print(f"Etkileşim matrisi oluşturuldu. Şekil: {interactions.shape}")

        # 4. Modeli Eğit
        print("Model eğitiliyor (Loss=WARP, Epochs=30)...")
        model = LightFM(loss='warp', no_components=30, learning_rate=0.05)
        model.fit(weights, epochs=30, num_threads=2)

        # 5. Kaydet ve Yedekle
        backup_existing_models()
        
        with open(MODEL_FILE, 'wb') as f:
            pickle.dump(model, f)
            
        with open(DATASET_FILE, 'wb') as f:
            pickle.dump(dataset, f)

        print(f"[{datetime.now()}] Başarılı! Yeni model ve veri haritası kaydedildi.")

    except Exception as e:
        print(f"Pipeline sırasında bir hata oluştu: {e}")

if __name__ == "__main__":
    train_model()
