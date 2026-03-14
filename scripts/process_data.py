import re
import json
import os

txt_path = "data/cot_latest.txt"

if not os.path.exists(txt_path):
    raise FileNotFoundError("COT Datei fehlt")

data = []
current_market = None

with open(txt_path) as f:
    for line in f:

        # Markt erkennen
        if "FUTURES EXCHANGE" in line:
            current_market = line.split("-")[0].strip()

        # Positions Zeilen
        if line.startswith("All"):

            numbers = [int(x.replace(",", "")) for x in re.findall(r'\d[\d,]*', line)]

            if len(numbers) > 6 and current_market:

                managed_money_long = numbers[5]
                managed_money_short = numbers[6]

                net = managed_money_long - managed_money_short

                data.append({
                    "Market": current_market,
                    "Trader_Type": "Managed Money",
                    "Net_Position": net
                })

with open("data/cot_data.json", "w") as f:
    json.dump(data, f)

print("JSON erstellt")
