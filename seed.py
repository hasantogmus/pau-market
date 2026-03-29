import pandas as pd
import pyodbc
import random
from datetime import datetime

# Veritabanı bağlantı ayarları
SERVER = r'localhost\SQLEXPRESS'
DATABASE = 'PauMarketDb'

def main():
    print("Veri hazırlığı başlatılıyor...")
    csv_path = 'lightfm_egitim_verisi.csv'
    
    # 1. CSV'yi oku
    try:
        df = pd.read_csv(csv_path)
        print(f"'{csv_path}' dosyası başarıyla okundu.")
    except FileNotFoundError:
        print(f"Hata: '{csv_path}' dosyası bulunamadı. Lütfen dosyanın dizinde olduğundan emin olun.")
        return

    # 2. Tekrar eden item_id'leri temizle ve ilk 500 ürün alınsın
    if 'item_id' not in df.columns:
        print("Hata: CSV dosyasında 'item_id' sütunu bulunamadı.")
        return

    # Sadece benzersiz item_id'leri tut
    df_to_insert = df.drop_duplicates(subset=['item_id'])
    
    print(f"Toplam {len(df_to_insert)} adet benzersiz ürün işlenecek.")

    # Başlık için sütun belirleme ('c0_name' kullan)
    title_col = 'c0_name'
    if title_col not in df_to_insert.columns:
         print(f"Hata: Başlık için CSV'de '{title_col}' sütunu bulunamadı.")
         return
         
    if 'item_condition_name' not in df_to_insert.columns:
         print("Hata: CSV dosyasında 'item_condition_name' sütunu bulunamadı.")
         return

    # 3. Veritabanına bağlan
    print(f"Veritabanına bağlanılıyor... (Server: {SERVER}, Database: {DATABASE})")
    
    # SQL Server için genellikle ODBC Driver 17 veya varsayılan SQL Server sürücüsü kullanılır
    connection_string = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;'
    
    try:
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
    except Exception as e:
        print("ODBC Driver 17 ile bağlantı kurulamadı, varsayılan sürücü deneniyor...")
        try:
             connection_string_alt = f'DRIVER={{SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;'
             conn = pyodbc.connect(connection_string_alt)
             cursor = conn.cursor()
        except Exception as e2:
             print(f"Veritabanı bağlantı hatası: {e2}")
             print("Lütfen SQL Server servisinin çalıştığından ve bağlantı ayarlarının doğru olduğundan emin olun.")
             return

    print("Veritabanı bağlantısı başarılı.")
    
    # Executemany hızlandırması
    cursor.fast_executemany = True

    try:
        # IDENTITY_INSERT özelliğini aktif et
        cursor.execute("SET IDENTITY_INSERT dbo.Listings ON")
        
        insert_query = """
            INSERT INTO dbo.Listings (Id, Title, Condition, Price, UserId, Category, IsActive, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        data_to_insert = []
        for index, row in df_to_insert.iterrows():
            item_id = int(row['item_id'])
            
            # Eksik veya boş başlıklar için varsayılan değer
            title_val = str(row[title_col])
            if pd.isna(row[title_col]) or title_val.strip() == '' or title_val.lower() == 'nan':
                title_val = "Genel Ürün"
            
            # Eksik durum satırları için varsayılan değer
            condition_val = str(row['item_condition_name'])
            if pd.isna(row['item_condition_name']) or condition_val.strip() == '':
                condition_val = "Belirtilmemiş"
            
            # Fiyat 100 ile 500 arasında rastgele bir değer olsun
            price = random.randint(100, 500)
            
            # Sistemde 2 numaralı admin kullanıcısı var sayılıyor
            user_id = 2
            category_val = "Yapay Zeka Testi"
            is_active = 1
            created_at = datetime.now()
            
            data_to_insert.append((item_id, title_val, condition_val, price, user_id, category_val, is_active, created_at))
            
        print(f"Toplam {len(data_to_insert)} adet benzersiz ürün toplu olarak ekleniyor...")
        cursor.executemany(insert_query, data_to_insert)
        
        # Değişiklikleri kaydet
        conn.commit()
        print(f"İşlem tamamlandı! {len(data_to_insert)} adet kayıt başarıyla veritabanına eklendi.")
        
    except Exception as e:
        print(f"Beklenmeyen bir hata oluştu: {e}")
        print("Yapılan değişiklikler geri alınıyor...")
        conn.rollback()
    finally:
        # IDENTITY_INSERT özelliğini devre dışı bırak
        try:
            cursor.execute("SET IDENTITY_INSERT dbo.Listings OFF")
            conn.commit()
        except:
            pass
        
        # Bağlantıları kapat
        cursor.close()
        conn.close()
        print("Veritabanı bağlantısı kapatıldı.")

if __name__ == "__main__":
    main()
