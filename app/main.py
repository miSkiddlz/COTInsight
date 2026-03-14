from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os, json
from scripts import fetch_cot_api  

app = FastAPI(title="COTInsight API")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

DATA_FILE = "data/cot_data.json"

@app.on_event("startup")
def startup():
    if not os.path.exists(DATA_FILE):
        fetch_cot_api.main()

@app.get("/")
def root():
    return RedirectResponse("/static/index.html")

@app.get("/assets")
def get_assets():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE) as f:
        data = json.load(f)
    markets = sorted(set(d["Market"] for d in data if d["Market"]))
    return markets

@app.get("/data")
def get_data(asset: str):
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE) as f:
        data = json.load(f)
    filtered = [d for d in data if asset.lower() in d["Market"].lower()]
    return filtered
