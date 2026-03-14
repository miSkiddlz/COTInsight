import pandas as pd
import os

# dynamische TXT-Datei im data/ Ordner
txt_files = [f for f in os.listdir("data") if f.endswith(".txt")]
if not txt_files:
    raise FileNotFoundError("Keine TXT-Datei im data/ Ordner gefunden!")

csv_path = os.path.join("data", txt_files[0])
print(f"Verarbeite Datei: {csv_path}")

df = pd.read_csv(csv_path, delimiter='\t')  # Tab-delimited
df['Net_Position'] = df['Long_All'] - df['Short_All']
df.to_csv("data/cot_data.csv", index=False)
print("COT Daten verarbeitet und gespeichert in 'data/cot_data.csv'.")
