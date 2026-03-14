from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
import requests
import re
from datetime import datetime

app = FastAPI(title="COTInsight API")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

DATA_FILE = "data/cot_data.json"


def build_cot_data():

    print("Building COT dataset...")

    os.makedirs("data", exist_ok=True)

    url = "https://www.cftc.gov/dea/newcot/f_disagg.txt"

    r = requests.get(url)

    if r.status_code != 200:
        print("Download failed")
        return

    txt = r.text.splitlines()

    data = []

    current_market = None
    current_date = None

    for line in txt:

        if "Disaggregated Commitments of Traders" in line:

            m = re.search(r'([A-Za-z]+\s+\d+,\s+\d+)', line)

            if m:
                current_date = datetime.strptime(
                    m.group(1),
                    "%B %d, %Y"
                ).strftime("%Y-%m-%d")

        if "-" in line and "EXCHANGE" in line:

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

            traders = [
                ("Producer/Merchant", producer_long, producer_short),
                ("Swap Dealers", swap_long, swap_short),
                ("Managed Money", managed_long, managed_short),
                ("Other Reportables", other_long, other_short),
            ]

            for trader, long_pos, short_pos in traders:

                data.append({
                    "Date": current_date,
                    "Market": current_market,
                    "Trader_Type": trader,
                    "Net_Position": long_pos - short_pos
                })

    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    print("COT dataset built:", len(data))


@app.on_event("startup")
def startup():

    if not os.path.exists(DATA_FILE):

        build_cot_data()


@app.get("/")
def root():
    return RedirectResponse("/static/index.html")


@app.get("/assets")
def get_assets():

    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE) as f:
        data = json.load(f)

    markets = sorted(list(set(d["Market"] for d in data)))

    return markets


@app.get("/data")
def get_data(asset: str):

    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE) as f:
        data = json.load(f)

    filtered = [d for d in data if asset.lower() in d["Market"].lower()]

    return filtered
