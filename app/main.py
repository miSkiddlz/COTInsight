from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import os
import pandas as pd

app = FastAPI(title="COTInsight API")

# Statics
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Redirect
@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

# CSV as JSON 
@app.get("/data")
def get_cot_data(asset: str = None, trader: str = None):
    csv_path = "data/cot_data.csv"
    if not os.path.exists(csv_path):
        return {"error": "COT data not found"}
    
    df = pd.read_csv(csv_path)
    if asset:
        df = df[df['Market'].str.contains(asset, case=False, na=False)]
    if trader:
        df = df[df['Trader_Type'].str.contains(trader, case=False, na=False)]
    
    return df.to_dict(orient="records")

# Dropdown
@app.get("/assets")
def get_assets():
    csv_path = "data/cot_data.csv"
    df = pd.read_csv(csv_path)
    return sorted(df['Market'].dropna().unique())

@app.get("/traders")
def get_traders():
    csv_path = "data/cot_data.csv"
    df = pd.read_csv(csv_path)
    return sorted(df['Trader_Type'].dropna().unique())
