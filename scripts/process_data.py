import pandas as pd
import os

# TXT-Datei automatisch finden
txt_files = [f for f in os.listdir("data") if f.endswith(".txt")]
if not txt_files:
    raise FileNotFoundError("Keine TXT-Datei im data/ Ordner gefunden!")

txt_path = os.path.join("data", txt_files[0])
print(f"Verarbeite Datei: {txt_path}")

# Beispiel Fixed-Width Columns (anpassen!)
colspecs = [(0, 12), (12, 32), (32, 45), (45, 58), (58, 70)]
column_names = ['Date', 'Market', 'Trader_Type', 'Long', 'Short']

df = pd.read_fwf(txt_path, colspecs=colspecs, names=column_names, skiprows=1)

# Zahlen bereinigen: nur Ziffern, Kommas entfernen, fehlende Werte auf 0
for col in ['Long', 'Short']:
    df[col] = df[col].astype(str) \
                     .str.replace(',', '') \
                     .str.extract('(\d+)') \
                     .fillna(0) \
                     .astype(int)

# Netto-Position
df['Net_Position'] = df['Long'] - df['Short']

# CSV speichern
df.to_csv("data/cot_data.csv", index=False)
print("COT Daten verarbeitet und gespeichert in 'data/cot_data.csv'.")
