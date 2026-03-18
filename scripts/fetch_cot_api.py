import os
import json
import pandas as pd
from datetime import date
from cot_reports import cot_year

# ========== CONFIG ==========
YEARS_BACK = 3

# Optional: nur wichtige Märkte (empfohlen für Performance)
FILTER_MARKETS = ["GOLD", "S&P"]  # kannst du erweitern

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

# Spaltennamen debuggen
print("Spalten im DataFrame:")
print(df.columns.tolist())

# Richtige Datumsspalte finden
date_col = None
for col in df.columns:
    if "date" in col.lower():
        date_col = col
        break

if not date_col:
    raise Exception("Keine Datumsspalte gefunden!")

print(f"Verwende Datumsspalte: {date_col}")

df["report_date_as_yyyymmdd"] = pd.to_datetime(
    df[date_col]
).dt.strftime("%Y-%m-%d")

# Spalten umbenennen (wichtig fürs Frontend)
df = df.rename(columns={
    "Market_and_Exchange_Names": "market_and_exchange_names",
    "Commercial_Positions_Long_All": "commercial_positions_long_all",
    "Commercial_Positions_Short_All": "commercial_positions_short_all",
    "Noncommercial_Positions_Long_All": "noncommercial_positions_long_all",
    "Noncommercial_Positions_Short_All": "noncommercial_positions_short_all"
})

# ========== OPTIONAL: FILTER ==========
if FILTER_MARKETS:
    print("Filtere Märkte...")
    df = df[df["market_and_exchange_names"].str.contains("|".join(FILTER_MARKETS))]

# ========== KEEP ONLY NEEDED COLUMNS ==========
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

# NaN entfernen
df = df.fillna(0)

# ========== SAVE ==========
print("Speichere JSON...")

df.to_json(OUTPUT_FILE, orient="records")

print(f"Fertig: {OUTPUT_FILE}")
