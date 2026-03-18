import os
import json
import pandas as pd
from datetime import date
from cot_reports import cot_year

# ========== CONFIG ==========
YEARS_BACK = 3
FILTER_MARKETS = ["GOLD", "S&P"]  # optional, kannst du erweitern oder leer lassen

# ========== PATHS ==========
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(DATA_DIR, "cot_data.json")

# ========== LOAD DATA ==========
print("Lade COT Daten...")

current_year = date.today().year
years = [current_year - i for i in range(YEARS_BACK)]

dfs = []

for y in years:
    print(f"Lade Jahr: {y}")
    try:
        df_year = cot_year(
            year=y,
            cot_report_type="legacy_fut",
            store_txt=False,
            verbose=False
        )
        dfs.append(df_year)
    except Exception as e:
        print(f"Fehler bei Jahr {y}: {e}")

df = pd.concat(dfs)

# ========== CLEAN DATA ==========
print("Verarbeite Daten...")

# Debug: echte Spalten anzeigen
print("Gefundene Spalten:")
print(df.columns.tolist())

# KORREKTE Spaltennamen (für legacy_fut)
df = df.rename(columns={
    "Market and Exchange Names": "market_and_exchange_names",
    "Report Date as YYYY-MM-DD": "report_date",
    "Commercial Positions-Long (All)": "commercial_positions_long_all",
    "Commercial Positions-Short (All)": "commercial_positions_short_all",
    "Noncommercial Positions-Long (All)": "noncommercial_positions_long_all",
    "Noncommercial Positions-Short (All)": "noncommercial_positions_short_all"
})

# Prüfen ob wichtige Spalten existieren
required_cols = [
    "market_and_exchange_names",
    "report_date",
    "commercial_positions_long_all",
    "commercial_positions_short_all",
    "noncommercial_positions_long_all",
    "noncommercial_positions_short_all"
]

missing = [col for col in required_cols if col not in df.columns]
if missing:
    raise Exception(f"Fehlende Spalten: {missing}")

# Datum formatieren
df["report_date_as_yyyymmdd"] = pd.to_datetime(
    df["report_date"]
).dt.strftime("%Y-%m-%d")

# ========== FILTER ==========
if FILTER_MARKETS:
    print("Filtere Märkte...")
    df = df[df["market_and_exchange_names"].str.contains("|".join(FILTER_MARKETS), na=False)]

# ========== FINAL COLUMNS ==========
df = df[
    [
        "market_and_exchange_names",
        "report_date_as_yyyymmdd",
        "commercial_positions_long_all",
        "commercial_positions_short_all",
        "noncommercial_positions_long_all",
        "noncommercial_positions_short_all"
    ]
]

# Zahlen fixen
for col in df.columns:
    if "positions" in col:
        df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.fillna(0)

# ========== SAVE ==========
print("Speichere JSON...")

df.to_json(OUTPUT_FILE, orient="records")

print(f"Fertig: {OUTPUT_FILE}")
