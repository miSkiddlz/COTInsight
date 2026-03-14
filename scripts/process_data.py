import pandas as pd

# TXT → CSV & Net Position berechnen
df = pd.read_csv("data/fut_disagg.txt", delimiter='\t')
df['Net_Position'] = df['Long_All'] - df['Short_All']
df.to_csv("data/cot_data.csv", index=False)
print("COT Daten verarbeitet und gespeichert.")
