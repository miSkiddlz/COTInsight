import requests
import os

os.makedirs("data", exist_ok=True)

URL = "https://www.cftc.gov/dea/newcot/f_disagg.txt"
FILE_PATH = "data/cot_latest.txt"

print("Lade aktuellen COT Report...")

r = requests.get(URL)

if r.status_code != 200:
    raise Exception("Download fehlgeschlagen")

with open(FILE_PATH, "wb") as f:
    f.write(r.content)

print("COT Report gespeichert:", FILE_PATH)
