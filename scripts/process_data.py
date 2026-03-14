import os
import re
import json
from datetime import datetime

txt_path = "data/cot_latest.txt"

if not os.path.exists(txt_path):
    raise FileNotFoundError("COT TXT file missing")

data = []

current_market = None
current_date = None

with open(txt_path) as f:

    for line in f:

        if "Disaggregated Commitments of Traders" in line:

            date_match = re.search(r'([A-Za-z]+\s+\d+,\s+\d+)', line)

            if date_match:
                current_date = datetime.strptime(
                    date_match.group(1), "%B %d, %Y"
                ).strftime("%Y-%m-%d")

        if "FUTURES EXCHANGE" in line:

            current_market = line.split("-")[0].strip()

        if line.startswith("All"):

            numbers = [
                int(x.replace(",", ""))
                for x in re.findall(r'\d[\d,]*', line)
            ]

            if len(numbers) < 12:
                continue

            producer_long = numbers[1]
            producer_short = numbers[2]

            swap_long = numbers[3]
            swap_short = numbers[4]

            managed_long = numbers[6]
            managed_short = numbers[7]

            other_long = numbers[9]
            other_short = numbers[10]

            rows = [
                ("Producer/Merchant", producer_long, producer_short),
                ("Swap Dealers", swap_long, swap_short),
                ("Managed Money", managed_long, managed_short),
                ("Other Reportables", other_long, other_short),
            ]

            for trader, long_pos, short_pos in rows:

                data.append({

                    "Date": current_date,
                    "Market": current_market,
                    "Trader_Type": trader,
                    "Long": long_pos,
                    "Short": short_pos,
                    "Net_Position": long_pos - short_pos
                })

with open("data/cot_data.json", "w") as f:
    json.dump(data, f)

print("COT data processed")
