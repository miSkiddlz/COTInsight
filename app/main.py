from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import subprocess
import json

app = FastAPI(title="COTInsight API")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

DATA_PATH = "data/cot_data.json"


def ensure_data():
    
    if not os.path.exists(DATA_PATH):

        print("Keine COT Daten gefunden → lade herunter")

        os.makedirs("data", exist_ok=True)

        subprocess.run(["python", "scripts/download_cot.py"])
        subprocess.run(["python", "scripts/process_cot_txt.py"])


@app.on_event("startup")
def startup_event():
    ensure_data()


@app.get("/")
def root():
    return RedirectResponse("/static/index.html")


@app.get("/data")
def get_data():
    if not os.path.exists(DATA_PATH):
        return {"error": "no data"}

    with open(DATA_PATH) as f:
        return json.load(f)


@app.get("/assets")
def assets():
    return ["WHEAT", "CORN", "SOYBEAN"]


@app.get("/traders")
def traders():
    return [
        "Producer/Merchant",
        "Swap Dealers",
        "Managed Money",
        "Other Reportables"
    ]
