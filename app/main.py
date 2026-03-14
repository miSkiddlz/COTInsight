from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json

app = FastAPI()

DATA_DIR = Path(__file__).parent.parent / "data"
STATIC_DIR = Path(__file__).parent / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    index_file = STATIC_DIR / "index.html"
    return index_file.read_text()

@app.get("/api/cot_data")
async def cot_data():
    data_file = DATA_DIR / "cot_data.json"
    if not data_file.exists():
        return JSONResponse({"rows": 0})
    with open(data_file, "r") as f:
        data = json.load(f)
    return data
