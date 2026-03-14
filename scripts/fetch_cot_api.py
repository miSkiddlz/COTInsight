import requests
import os
import json
from datetime import datetime

os.makedirs("data", exist_ok=True)

# Socrata API for COT Disaggregated Futures Only
API_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json"

# Latest week
params = {
    "$order": "report_date desc",
    "$limit": 5000
}

r = requests.get(API_URL, params=params)
if r.status_code != 200:
    raise Exception(f"API request failed with {r.status_code}")

raw_data = r.json()

cot_data = []
for entry in raw_data:
    market = entry.get("market_name")
    trader_type = entry.get("trader_category")
    
    # Long - Short
    try:
        long = int(entry.get("long_contracts", 0))
        short = int(entry.get("short_contracts", 0))
        net_position = long - short
    except ValueError:
        continue
    
    cot_data.append({
        "Market": market,
        "Trader_Type": trader_type,
        "Net_Position": net_position,
        "Date": entry.get("report_date")
    })

# save
with open("data/cot_data.json", "w") as f:
    json.dump(cot_data, f)

print(f"{len(cot_data)} COT Datensätze gespeichert.")
