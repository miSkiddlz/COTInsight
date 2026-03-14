import requests
import os

URL = "https://www.cftc.gov/dea/newcot/f_disagg.txt"

os.makedirs("data", exist_ok=True)

print("Downloading latest COT report...")

r = requests.get(URL)

if r.status_code != 200:
    raise Exception("Download failed")

with open("data/cot_latest.txt", "wb") as f:
    f.write(r.content)

print("COT report saved to data/cot_latest.txt")
