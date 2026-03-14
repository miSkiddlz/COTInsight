import requests
import os
import json

os.makedirs("data", exist_ok=True)

DATA_FILE = "data/cot_data.json"

# Socrata API URL for Disaggregated Futures Only COT-Daten
API_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json"

def fetch_cot_data():
    """
    Holt die neuesten COT-Daten von der Socrata-API
    und speichert sie als JSON in data/cot_data.json.
    """
    print("Starte Abruf der COT-Daten von Socrata-API...")
    params = {
        "$order": "report_date desc",
        "$limit": 5000  
    }

    r = requests.get(API_URL, params=params)
    if r.status_code != 200:
        raise Exception(f"API request failed with status {r.status_code}")

    raw_data = r.json()
    cot_data = []

    for entry in raw_data:
        market = entry.get("market_name")
        trader_type = entry.get("trader_category")

        try:
            long = int(entry.get("long_contracts", 0))
            short = int(entry.get("short_contracts", 0))
            net_position = long - short
        except ValueError:
            continue  

        cot_data.append({
            "Market": market,
            "Trader_Type": trader_type,
            "Long": long,
            "Short": short,
            "Net_Position": net_position,
            "Date": entry.get("report_date")
        })

    # Save as JSON
    with open(DATA_FILE, "w") as f:
        json.dump(cot_data, f, indent=2)

    print(f"{len(cot_data)} COT-Datensätze erfolgreich gespeichert in {DATA_FILE}.")

def main():
    fetch_cot_data()

if __name__ == "__main__":
    main()
