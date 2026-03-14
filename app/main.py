from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import pandas as pd
import os

app = FastAPI(title="COTInsight API")

# Statische Frontend-Dateien bereitstellen
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Test-Route
@app.get("/")
def read_root():
    return {"message": "COTInsight is running"}

# Route zum Abrufen der COT-Daten als JSON
@app.get("/data")
def get_cot_data():
    csv_path = "data/cot_data.csv"
    if not os.path.exists(csv_path):
        return JSONResponse({"error": "COT data not found"}, status_code=404)

    # CSV einlesen
    df = pd.read_csv(csv_path)

    return JSONResponse(df.to_dict(orient="records"))
