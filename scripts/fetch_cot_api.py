import os
import json
import pandas as pd
from cot_reports import cot_all

# Ordnerstruktur
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(DATA_DIR, "cot_data.json")

print("Lade COT Daten...")

# WICHTIG: Legacy passt zu deinem Frontend
df = cot_all(cot_report_type="legacy_fut", store_txt=False, verbose=True)

print("Verarbeite Daten...")

# Datum formatieren
df["report_date_as_yyyymmdd"] = pd.to_datetime(
    df["Report_Date_as_YYYYMMDD"]
).dt.strftime("%Y-%m-%d")

# Spalten vereinheitlichen
df = df.rename(columns={
    "Market_and_Exchange_Names": "market_and_exchange_names",
    "Commercial_Positions_Long_All": "commercial_positions_long_all",
    "Commercial_Positions_Short_All": "commercial_positions_short_all",
    "Noncommercial_Positions_Long_All": "noncommercial_positions_long_all",
    "Noncommercial_Positions_Short_All": "noncommercial_positions_short_all"
})

# Nur benötigte Spalten
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

print("Speichere JSON...")

df.to_json(OUTPUT_FILE, orient="records")

print("Fertig:", OUTPUT_FILE)
