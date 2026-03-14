from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
import subprocess

app = FastAPI(title="COTInsight API")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

DATA_FILE = "data/cot_data.json"


def ensure_data():

    if not os.path.exists(DATA_FILE):

        print("Preparing COT data...")

        os.makedirs("data", exist_ok=True)

        subprocess.run(["python", "scripts/download_cot.py"])
        subprocess.run(["python", "scripts/process_cot_txt.py"])


@app.on_event("startup")
def startup_event():
    ensure_data()


@app.get("/")
def root():
    return RedirectResponse("/static/index.html")


@app.get("/assets")
def get_assets():

    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE) as f:
        data = json.load(f)

    markets = sorted(list(set(d["Market"] for d in data)))

    return markets


@app.get("/data")
def get_data(asset: str):

    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE) as f:
        data = json.load(f)

    filtered = [d for d in data if asset.lower() in d["Market"].lower()]

    return filtered
