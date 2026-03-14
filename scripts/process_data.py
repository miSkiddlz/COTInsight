import os
import re
import json

txt_path = "data/cot_latest.txt"
if not txt_files:
    raise FileNotFoundError("Keine TXT-Datei im data/ Ordner gefunden!")

txt_path = os.path.join("data", txt_files[0])
print(f"Verarbeite Datei: {txt_path}")

# result JSON
cot_json = {}

current_block = None

with open(txt_path, "r") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        if "Positions" in line and "All" not in line:
            current_block = "positions"
            cot_json[current_block] = []
            continue
        elif "Changes in Commitments" in line:
            current_block = "changes"
            cot_json[current_block] = []
            continue
        elif "Percent of Open Interest" in line:
            current_block = "percent"
            cot_json[current_block] = []
            continue
        elif "Number of Traders" in line:
            current_block = "traders"
            cot_json[current_block] = []
            continue
        elif "Percent of Open Interest Held" in line:
            current_block = "largest_traders"
            cot_json[current_block] = []
            continue

        m = re.match(r'^(All|Old|Other)\s*:\s*(.*)$', line)
        if m and current_block:
            category = m.group(1)
            rest = m.group(2)

            numbers = [int(n.replace(",", "")) for n in re.findall(r'\d+', rest)]

            cot_json[current_block].append({
                "category": category,
                "values": numbers
            })

# JSON save
with open("data/cot_data.json", "w") as f:
    json.dump(cot_json, f, indent=2)

print("COT JSON erzeugt in 'data/cot_data.json'")
