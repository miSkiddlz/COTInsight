import os
import json
import pandas as pd
from datetime import date
from cot_reports import cot_year

# ========== CONFIG ==========
YEARS_BACK = 3

FILTER_MARKETS = [
    "S&P 500",
    "GOLD",
    "CRUDE OIL",
    "EURO",
    "NASDAQ"
]

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

df = df[[
    "Market and Exchange Names",
    "As of Date in Form YYYY-MM-DD",
    "Commercial Positions-Long (All)",
    "Commercial Positions-Short (All)",
    "Noncommercial Positions-Long (All)",
    "Noncommercial Positions-Short (All)",
    "Nonreportable Positions-Long (All)",
    "Nonreportable Positions-Short (All)"
]]

df = df.rename(columns={
    "Market and Exchange Names": "market_and_exchange_names",
    "As of Date in Form YYYY-MM-DD": "report_date_as_yyyymmdd",
    "Commercial Positions-Long (All)": "commercial_positions_long_all",
    "Commercial Positions-Short (All)": "commercial_positions_short_all",
    "Noncommercial Positions-Long (All)": "noncommercial_positions_long_all",
    "Noncommercial Positions-Short (All)": "noncommercial_positions_short_all",
    "Nonreportable Positions-Long (All)": "nonreportable_positions_long_all",
    "Nonreportable Positions-Short (All)": "nonreportable_positions_short_all"
})

# Datum fixen
df["report_date_as_yyyymmdd"] = pd.to_datetime(df["report_date_as_yyyymmdd"])

# ========== FILTER ==========
print("Filtere Märkte...")

df = df[
    df["market_and_exchange_names"].str.contains(
        "|".join(FILTER_MARKETS),
        na=False
    )
]

# Zahlen fixen
for col in df.columns:
    if "positions" in col:
        df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.fillna(0)

# Sortieren (wichtig für Plot!)
df = df.sort_values("report_date_as_yyyymmdd")

# ========== SAVE ==========
print("Speichere JSON...")

df.to_json(OUTPUT_FILE, orient="records", date_format="iso")

print(f"Fertig: {OUTPUT_FILE}")
