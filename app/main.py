from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI(title="COTInsight API")

# CORS für Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daten laden
df = pd.read_csv("data/cot_data.csv")

@app.get("/assets")
def get_assets():
    """Liste aller Assets für Dropdown"""
    return df["Asset"].unique().tolist()

@app.get("/data")
def get_data(asset: str, trader: str):
    """Net Position für ausgewähltes Asset & Trader"""
    filtered = df[(df["Asset"] == asset) & (df["Trader_Type"] == trader)]
    return {
        "dates": filtered["Report_Date"].tolist(),
        "net_position": filtered["Net_Position"].tolist()
    }
