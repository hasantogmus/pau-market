# PAU Market

## Nightly LightFM Retraining

Kullanici etkilesimleri `dbo.Interactions` tablosunda birikir. `egitim_pipeline.py` bu veriyi kullanarak:

- guncel kullanici ve ilan mapping'ini yeniden olusturur,
- yeni LightFM modelini egitir,
- model dosyalarini atomik olarak kaydeder,
- ardindan calisan FastAPI servisine model reload cagrisi yapar.

FastAPI tarafinda:

- `GET /health/model-status` ile aktif model durumu gorulebilir,
- `POST /admin/reload-model` ile model bundle yeniden yuklenebilir.

Yerel makinede gece 03:00 gorevi kurmak icin:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register_nightly_retrain.ps1
```

Farkli saat veya Python yolu ile:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register_nightly_retrain.ps1 -RunAt "02:30" -PythonExe "C:\Python310\python.exe"
```
