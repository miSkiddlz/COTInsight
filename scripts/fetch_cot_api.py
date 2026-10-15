"""Build the static dashboard data from official CFTC Legacy Futures archives.

Uses only the Python standard library. A failed build never replaces existing data.
"""
import csv
import io
import json
from datetime import date
from pathlib import Path
import time
from urllib.request import Request, urlopen
import zipfile

YEARS_BACK = 3
FILTER_MARKETS = ("S&P 500", "GOLD", "CRUDE OIL", "EURO", "NASDAQ")
OUTPUT_FILE = Path(__file__).resolve().parents[1] / "site/data/cot_data.json"
COLUMNS = {
    "Market and Exchange Names": "market_and_exchange_names",
    "As of Date in Form YYYY-MM-DD": "report_date_as_yyyymmdd",
    "Commercial Positions-Long (All)": "commercial_positions_long_all",
    "Commercial Positions-Short (All)": "commercial_positions_short_all",
    "Noncommercial Positions-Long (All)": "noncommercial_positions_long_all",
    "Noncommercial Positions-Short (All)": "noncommercial_positions_short_all",
    "Nonreportable Positions-Long (All)": "nonreportable_positions_long_all",
    "Nonreportable Positions-Short (All)": "nonreportable_positions_short_all",
}


def fetch_year(year):
    url = f"https://www.cftc.gov/files/dea/history/deacot{year}.zip"
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "COTInsight/1.0"})
            with urlopen(request, timeout=60) as response:
                content = response.read()
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                name = next(n for n in archive.namelist() if Path(n).name.lower() == "annual.txt")
                text = archive.read(name).decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
            reader.fieldnames = [name.strip() for name in (reader.fieldnames or [])]
            if not set(COLUMNS).issubset(reader.fieldnames):
                raise ValueError(f"Unexpected CFTC columns for {year}")
            return list(reader)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def build_records(rows):
    records = []
    for row in rows:
        market = row["Market and Exchange Names"].strip()
        if not any(term in market.upper() for term in FILTER_MARKETS):
            continue
        record = {}
        for source, target in COLUMNS.items():
            value = row[source].strip()
            if target == "market_and_exchange_names":
                record[target] = value
            elif target == "report_date_as_yyyymmdd":
                record[target] = date.fromisoformat(value[:10]).isoformat()
            else:
                number = int(value.replace(",", ""))
                if number < 0:
                    raise ValueError(f"Negative position count: {market}")
                record[target] = number
        records.append(record)
    if not records:
        raise ValueError("No matching COT records; refusing to publish an empty dashboard")
    for term in FILTER_MARKETS:
        if not any(term in r["market_and_exchange_names"].upper() for r in records):
            raise ValueError(f"Missing market group: {term}")
    keys = [(r["market_and_exchange_names"], r["report_date_as_yyyymmdd"]) for r in records]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate market/date records in CFTC data")
    return sorted(records, key=lambda r: (r["report_date_as_yyyymmdd"], r["market_and_exchange_names"]))


def main():
    rows = []
    current_year = date.today().year
    for year in range(current_year - YEARS_BACK + 1, current_year + 1):
        print(f"Loading CFTC archive: {year}", flush=True)
        year_rows = fetch_year(year)
        # Each archive must be usable; do not silently publish partial history.
        build_records(year_rows)
        rows.extend(year_rows)
    records = build_records(rows)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(records, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    temporary.replace(OUTPUT_FILE)
    print(f"Saved {len(records)} records; latest report: {records[-1]['report_date_as_yyyymmdd']}")


if __name__ == "__main__":
    main()
