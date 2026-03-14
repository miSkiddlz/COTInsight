from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
import requests
import re

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")

DATA_FILE = "data/cot_data.json"


def build_cot_data():

    print("Downloading COT report...")

    os.makedirs("data", exist_ok=True)

    url = "https://www.cftc.gov/dea/newcot/f_disagg.txt"

    r = requests.get(url)

    if r.status_code != 200:
        print("Download failed")
        return

    lines = r.text.splitlines()

    data = []

    current_market = None

    for line in lines:

        # Market erkennen
        if "FUTURES EXCHANGE" in line:

            current_market = line.split("-")[0].strip()

        # Positions erkennen
        if line.startswith("All"):

            nums = re.findall(r'\d[\d,]*', line)

            nums = [int(x.replace(",", "")) for x in nums]

            if len(nums) < 11:
                continue

            producer = nums[1] - nums[2]
            swap = nums[3] - nums[4]
            managed = nums[6] - nums[7]
            other = nums[9] - nums[10]

            data.append({
                "Market": current_market,
                "Trader_Type": "Producer/Merchant",
                "Net_Position": producer
            })

            data.append({
                "Market": current_market,
                "Trader_Type": "Swap Dealers",
                "Net_Position": swap
            })

            data.append({
                "Market": current_market,
                "Trader_Type": "Managed Money",
                "Net_Position": managed
            })

            data.append({
                "Market": current_market,
                "Trader_Type": "Other Reportables",
                "Net_Position": other
            })

    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    print("Markets parsed:", len(data))


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

    markets = sorted(set(d["Market"] for d in data if d["Market"]))

    return markets


@app.get("/data")
def get_data(asset: str):

    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE) as f:
        data = json.load(f)

    filtered = [d for d in data if asset.lower() in d["Market"].lower()]

    return filtered
