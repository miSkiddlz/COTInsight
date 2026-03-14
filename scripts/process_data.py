import pandas as pd

csv_path = "data/fut_disagg.txt"
df = pd.read_csv(csv_path, delimiter='\t')  # Tab-delimited
df['Net_Position'] = df['Long_All'] - df['Short_All']
df.to_csv("data/cot_data.csv", index=False)
print("COT Daten verarbeitet und in 'data/cot_data.csv' gespeichert.")
