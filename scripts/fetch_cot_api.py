import requests
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# TFF Futures Only Report (Finanzmärkte)
API_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json"
OUTPUT_FILE = DATA_DIR / "cot_data.json"

def fetch_cot_data():
    print("Starte Abruf der COT-Daten von Socrata-API...")
    params = {"$limit": 5000}  # optional anpassen
    r = requests.get(API_URL, params=params)
    if r.status_code != 200:
        raise Exception(f"API request failed with status {r.status_code}")
    data = r.json()
    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Daten gespeichert in {OUTPUT_FILE}")

def main():
    fetch_cot_data()

if __name__ == "__main__":
    main()
