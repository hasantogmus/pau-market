FROM python:3.10-slim

WORKDIR /app

# Upgrade pip and install core system dependencies if needed (for c libraries like numpy/scipy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY lightfm_source ./lightfm_source
RUN pip install --no-cache-dir --upgrade pip && \
    pip install setuptools==65.5.0 wheel cython numpy==1.26.4 && \
    grep -v '^lightfm==' requirements.txt > requirements.docker.txt && \
    pip install --no-cache-dir -r requirements.docker.txt --no-build-isolation && \
    pip install --no-cache-dir ./lightfm_source --no-build-isolation

# Copy application source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
