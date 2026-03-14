# Base image mit stabilem Python (3.11)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Systemabhängigkeiten für pandas und plotly
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools und wheel
RUN pip install --upgrade pip setuptools wheel

# Kopiere Projektdateien
COPY requirements.txt .
COPY main.py .
COPY scripts/ ./scripts
COPY static/ ./static
COPY templates/ ./templates

# Installiere Python-Abhängigkeiten
RUN pip install --no-cache-dir -r requirements.txt

# Port für FastAPI
EXPOSE 10000

# Startbefehl
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
