import requests
import pandas as pd
import os
import json
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DATA_FILE = os.path.join(DATA_DIR, "cot_data.json")

API_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=10000"

def fetch_cot_data():
    print("Starte Abruf der COT-Daten von Socrata-API...")
    r = requests.get(API_URL)
    if r.status_code != 200:
        raise Exception(f"API request failed with status {r.status_code}")
    data = r.json()
    
    # Einfach filtern und gruppieren: nur Finanzmärkte
    df = pd.DataFrame(data)
    if df.empty:
        print("Keine Daten erhalten.")
        return
    
    # Beispiel: nur Spalten, die wichtig sind
    columns_to_keep = ['market_and_exchange_names', 'report_date_as_yyyymmdd', 'open_interest_all', 
                       'commercial_positions_long_all', 'commercial_positions_short_all',
                       'noncommercial_positions_long_all', 'noncommercial_positions_short_all']
    df = df[columns_to_keep].copy()
    
    # Datum als ISO format
    df['report_date_as_yyyymmdd'] = pd.to_datetime(df['report_date_as_yyyymmdd'], format='%Y%m%d').dt.date
    
    # nach Market + Datum gruppieren und latest 20 Einträge
    df_grouped = df.sort_values(['market_and_exchange_names', 'report_date_as_yyyymmdd'])
    
    # Speichern als JSON
    df_grouped.to_json(DATA_FILE, orient='records', date_format='iso')
    print(f"Daten gespeichert in {DATA_FILE}")

def main():
    fetch_cot_data()

if __name__ == "__main__":
    main()
