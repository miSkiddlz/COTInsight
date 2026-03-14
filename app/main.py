from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import json

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(os.path.dirname(BASE_DIR), "data", "cot_data.json")

# Statische Dateien
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/")
def root():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

@app.get("/api/cot_data")
def get_cot_data():
    if not os.path.exists(DATA_FILE):
        return JSONResponse({"error": "Keine Daten gefunden. Bitte lade fetch_cot_api.py einmal ausführen."}, status_code=404)
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
    return JSONResponse(data)
