from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os, json
from scripts import fetch_cot_api  
from fastapi.responses import HTMLResponse
from pathlib import Path

app = FastAPI(title="COTInsight API")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
DATA_DIR = Path(__file__).parent.parent / "data"

DATA_FILE = "data/cot_data.json"

@app.get("/", response_class=HTMLResponse)
async def index():
    index_file = Path(__file__).parent / "static" / "index.html"
    return index_file.read_text()
    
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
