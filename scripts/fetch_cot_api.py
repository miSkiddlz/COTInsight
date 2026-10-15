"""Import official CFTC archives, without third-party packages, tokens or scraping.

All seven COT report types, all published contract codes, three calendar years.
Builds a small catalog and separate histories/raw exports for each report/market.
Unknown columns remain available in raw exports; missing numbers never become 0.
"""
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import date, datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import zipfile

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = BASE_DIR / "site/data"
SOURCE_PAGE = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm"


@dataclass(frozen=True)
class Group:
    id: str
    label: str
    long: str
    short: str
    spreading: str | None = None


@dataclass(frozen=True)
class Report:
    id: str
    label: str
    prefix: str
    member: str
    family: str
    combined: bool
    groups: tuple[Group, ...]


LEGACY = (
    Group("commercial", "Commercials", "Commercial Positions-Long (All)", "Commercial Positions-Short (All)"),
    Group("noncommercial", "Non-Commercials", "Noncommercial Positions-Long (All)", "Noncommercial Positions-Short (All)", "Noncommercial Positions-Spreading (All)"),
    Group("nonreportable", "Nonreportable", "Nonreportable Positions-Long (All)", "Nonreportable Positions-Short (All)"),
)
DISAGG = (
    Group("producer", "Producer / Merchant / Processor / User", "Prod_Merc_Positions_Long_All", "Prod_Merc_Positions_Short_All"),
    Group("swap", "Swap Dealers", "Swap_Positions_Long_All", "Swap__Positions_Short_All", "Swap__Positions_Spread_All"),
    Group("managed", "Managed Money", "M_Money_Positions_Long_All", "M_Money_Positions_Short_All", "M_Money_Positions_Spread_All"),
    Group("other", "Other Reportables", "Other_Rept_Positions_Long_All", "Other_Rept_Positions_Short_All", "Other_Rept_Positions_Spread_All"),
    Group("nonreportable", "Nonreportable", "NonRept_Positions_Long_All", "NonRept_Positions_Short_All"),
)
TFF = (
    Group("dealer", "Dealer / Intermediary", "Dealer_Positions_Long_All", "Dealer_Positions_Short_All", "Dealer_Positions_Spread_All"),
    Group("asset", "Asset Manager / Institutional", "Asset_Mgr_Positions_Long_All", "Asset_Mgr_Positions_Short_All", "Asset_Mgr_Positions_Spread_All"),
    Group("leveraged", "Leveraged Funds", "Lev_Money_Positions_Long_All", "Lev_Money_Positions_Short_All", "Lev_Money_Positions_Spread_All"),
    Group("other", "Other Reportables", "Other_Rept_Positions_Long_All", "Other_Rept_Positions_Short_All", "Other_Rept_Positions_Spread_All"),
    Group("nonreportable", "Nonreportable", "NonRept_Positions_Long_All", "NonRept_Positions_Short_All"),
)
SUPPLEMENTAL = (
    Group("commercial", "Commercials (excluding CIT)", "Comm_Positions_Long_All_NoCIT", "Comm_Positions_Short_All_NoCIT"),
    # 'Postions' is the official column spelling, not a local typo.
    Group("noncommercial", "Non-Commercials (excluding CIT)", "NComm_Positions_Long_All_NoCIT", "NComm_Positions_Short_All_NoCIT", "NComm_Postions_Spread_All_NoCIT"),
    Group("index", "Commodity Index Traders", "CIT_Positions_Long_All", "CIT_Positions_Short_All"),
    Group("nonreportable", "Nonreportable", "NonRept_Positions_Long_All", "NonRept_Positions_Short_All"),
)
REPORTS = (
    Report("legacy_fut", "Legacy · Futures Only", "deacot", "annual.txt", "legacy", False, LEGACY),
    Report("legacy_combined", "Legacy · Futures + Options", "deahistfo", "annualof.txt", "legacy", True, LEGACY),
    Report("disagg_fut", "Disaggregated · Futures Only", "fut_disagg_txt_", "f_year.txt", "disaggregated", False, DISAGG),
    Report("disagg_combined", "Disaggregated · Futures + Options", "com_disagg_txt_", "c_year.txt", "disaggregated", True, DISAGG),
    Report("tff_fut", "Financial Futures (TFF) · Futures Only", "fut_fin_txt_", "FinFutYY.txt", "tff", False, TFF),
    Report("tff_combined", "Financial Futures (TFF) · Futures + Options", "com_fin_txt_", "FinComYY.txt", "tff", True, TFF),
    Report("supplemental", "Supplemental CIT · Futures + Options", "dea_cit_txt_", "annualci.txt", "supplemental", True, SUPPLEMENTAL),
)


def column_key(value):
    """Ignore source spacing/punctuation while rejecting ambiguous matches."""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def resolve_columns(headers, report):
    lookup = {}
    for index, header in enumerate(headers):
        key = column_key(header)
        if not key or key in lookup:
            raise ValueError(f"Empty or ambiguous source column: {header!r}")
        lookup[key] = index

    def find(*names):
        for name in names:
            if column_key(name) in lookup:
                return lookup[column_key(name)]
        raise ValueError(f"Missing required column for {report.id}: {names}")

    return {
        "name": find("Market and Exchange Names"),
        "date": find("As of Date in Form YYYY-MM-DD", "Report_Date_as_YYYY-MM-DD"),
        "code": find("CFTC Contract Market Code"),
        "exchange": find("CFTC Market Code in Initials", "CFTC_Market_Code"),
        "unit": find("Contract Units"),
        "oi": find("Open Interest (All)"),
        "reportable_long": find("Total Reportable Positions-Long (All)", "Tot_Rept_Positions_Long_All"),
        "reportable_short": find("Total Reportable Positions-Short (All)", "Tot_Rept_Positions_Short_All"),
        "groups": {g.id: {"long": find(g.long), "short": find(g.short),
                          "spreading": find(g.spreading) if g.spreading else None} for g in report.groups},
    }


def parse_archive(content, report, year):
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        matches = [n for n in archive.namelist() if Path(n).name.lower() == report.member.lower()]
        if len(matches) != 1:
            raise ValueError(f"Expected exactly one {report.member} in {report.id}/{year}")
        # No extraction to disk; no archive paths are trusted.
        content = archive.read(matches[0])
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("cp1252")
    reader = csv.reader(io.StringIO(text), skipinitialspace=True, strict=True)
    headers = next(reader, [])
    columns = resolve_columns(headers, report)
    rows = []
    seen = set()
    for line, values in enumerate(reader, start=2):
        if not values or all(not v.strip() for v in values):
            continue
        if len(values) != len(headers):
            raise ValueError(f"Wrong cell count in {report.id}/{year}, line {line}")
        record = normalize(values, columns, report)
        if not record["date"].startswith(f"{year}-"):
            raise ValueError(f"Report date outside archive year: {record['date']}")
        identity = (record["code"], record["date"])
        if identity in seen:
            raise ValueError(f"Duplicate contract/date in {report.id}: {identity}")
        seen.add(identity)
        rows.append((record, values))
    if not rows:
        raise ValueError(f"Empty CFTC archive: {report.id}/{year}")
    return headers, rows


def number(value, label):
    value = value.strip()
    # Missing/suppressed source values stay missing, including official '.' values.
    if value in ("", ".", "·", "-", "NA", "N/A"):
        return None
    if re.fullmatch(r"-0+", value):
        return 0
    if not re.fullmatch(r"\d+|\d{1,3}(?:,\d{3})+", value):
        raise ValueError(f"Invalid nonnegative contract count {label}: {value!r}")
    return int(value.replace(",", ""))


def normalize(values, columns, report):
    def text(key):
        return values[columns[key]].strip()
    code = text("code")
    if not re.fullmatch(r"[A-Z0-9+]{6}", code):
        raise ValueError(f"Unexpected CFTC contract code: {code!r}")
    name = text("name")
    if not name or not text("unit"):
        raise ValueError(f"Missing market name or unit: {code}")
    # Require an exact ISO report date, not a silently truncated timestamp.
    day = date.fromisoformat(text("date"))
    if day.isoformat() != text("date") or day > date.today():
        raise ValueError(f"Invalid/future report date: {text('date')}")
    oi = number(values[columns["oi"]], "open interest")
    if oi is None:
        raise ValueError(f"Missing open interest: {code}/{day}")
    groups = {}
    for group in report.groups:
        fields = columns["groups"][group.id]
        counts = {key: number(values[index], f"{code}/{group.id}/{key}") if index is not None else None
                  for key, index in fields.items()}
        counts["net"] = counts["long"] - counts["short"] if counts["long"] is not None and counts["short"] is not None else None
        if any(v is not None and v > oi for k, v in counts.items() if k != "net"):
            raise ValueError(f"Position count exceeds open interest: {code}/{day}")
        groups[group.id] = counts
    # Independently check both sides, including spreading. A zero net sum alone
    # would miss incorrectly mapped long and short values of equal magnitude.
    rounding = {}
    for side in ("long", "short"):
        terms = [g[side] for g in groups.values()]
        terms += [groups[g.id]["spreading"] for g in report.groups if g.spreading]
        if all(term is not None for term in terms):
            difference = sum(terms) - oi
            # Futures-equivalent/consolidated series may round each component.
            tolerance = (len(terms) + 2) // 2
            if difference:
                rounding[side] = difference
        else:
            difference, tolerance = 0, 0
        if abs(difference) > tolerance:
            raise ValueError(f"Open interest reconciliation failed ({side}): {report.id}/{code}/{day}: {sum(terms)} != {oi}")
        reported = number(values[columns[f"reportable_{side}"]], f"reportable {side}")
        nonreported = groups["nonreportable"][side]
        if reported is not None and nonreported is not None and abs(reported + nonreported - oi) > 1:
            raise ValueError(f"Reportable/nonreportable reconciliation failed: {code}/{day}")
    return {"code": code, "name": name, "date": day.isoformat(), "exchange": text("exchange"),
            "unit": text("unit"), "open_interest": oi, "groups": groups, "rounding_difference": rounding}


def archive_url(report, year):
    return f"https://www.cftc.gov/files/dea/history/{report.prefix}{year}.zip"


def download(report, year):
    url = archive_url(report, year)
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "COTInsight/2.0 (public CFTC archives)"})
            with urlopen(request, timeout=60) as response:
                content = response.read()
            return content
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(2 ** attempt)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def build_report(report, years, output, today, loader):
    markets = {}
    raw = {}
    schemas = []
    sources = []
    warnings = []
    for year in years:
        print(f"Loading {report.id}/{year}", flush=True)
        try:
            content = loader(report, year)
        except HTTPError as error:
            # At the beginning of January no new annual file may exist yet.
            # Historical 404s and other network errors must never be hidden.
            if error.code == 404 and year == today.year and today.month == 1:
                warnings.append(f"{year} archive not yet available (HTTP 404).")
                continue
            raise
        headers, rows = parse_archive(content, report, year)
        if headers not in schemas:
            schemas.append(headers)
        schema = schemas.index(headers)
        sources.append({"year": year, "url": archive_url(report, year), "sha256": hashlib.sha256(content).hexdigest(), "rows": len(rows)})
        for record, source_values in rows:
            code = record["code"]
            markets.setdefault(code, []).append(record)
            raw.setdefault(code, []).append({"date": record["date"], "schema": schema, "values": source_values})
    if not markets:
        raise ValueError(f"No data for {report.id}")
    latest_report = max(r["date"] for records in markets.values() for r in records)
    metadata = []
    for code, records in sorted(markets.items()):
        records.sort(key=lambda r: r["date"])
        if len({r["date"] for r in records}) != len(records):
            raise ValueError(f"Duplicate market history: {report.id}/{code}")
        filename = code.replace("+", "-") + ".json"
        latest = records[-1]
        payload = {"schema_version": 2, "report": report.id, "code": code, "records": records}
        raw_payload = {"report": report.id, "code": code, "schemas": schemas,
                       "rows": sorted(raw[code], key=lambda r: r["date"]), "sources": sources}
        # Include raw fields too, so source-only corrections invalidate exports.
        digest = hashlib.sha256(json.dumps([payload, raw_payload], sort_keys=True).encode()).hexdigest()[:12]
        path = f"{report.id}/{filename[:-5]}-{digest}.json"
        raw_path = f"raw/{report.id}/{filename[:-5]}-{digest}.json"
        write_json(output / path, payload)
        write_json(output / raw_path, raw_payload)
        metadata.append({"code": code, "name": latest["name"], "exchange": latest["exchange"], "unit": latest["unit"],
                         "first_date": records[0]["date"], "last_date": latest["date"], "observations": len(records),
                         "current": latest["date"] == latest_report, "path": path, "raw_path": raw_path})
    missing_rows = sum(any(g[side] is None for g in record["groups"].values() for side in ("long", "short"))
                       for records in markets.values() for record in records)
    rounded_rows = sum(bool(record["rounding_difference"]) for records in markets.values() for record in records)
    return {"id": report.id, "label": report.label, "family": report.family, "combined": report.combined,
            "groups": [{"id": g.id, "label": g.label, "has_spreading": bool(g.spreading)} for g in report.groups],
            "latest_report_date": latest_report, "markets": sorted(metadata, key=lambda m: (not m["current"], m["name"], m["code"])),
            "rows": sum(source["rows"] for source in sources), "quality": {"rows_with_missing_positions": missing_rows, "rows_with_rounding_differences": rounded_rows},
            "sources": sources, "warnings": warnings}


def build(output=OUTPUT_DIR, years_back=3, reports=REPORTS, today=None, loader=download):
    today = today or date.today()
    if not 1 <= years_back <= 10:
        raise ValueError("years_back must be between 1 and 10")
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    years = list(range(today.year - years_back + 1, today.year + 1))
    # Validation and every export complete before replacing an existing build.
    with tempfile.TemporaryDirectory(prefix="cot-build-", dir=output.parent.parent) as folder:
        stage = Path(folder) / "data"
        stage.mkdir()
        report_data = [build_report(report, years, stage, today, loader) for report in reports]
        if not report_data:
            raise ValueError("No report types selected")
        catalog = {"schema_version": 2, "generated_at": datetime.now(timezone.utc).isoformat(),
                   "years": years, "source": SOURCE_PAGE, "reports": report_data}
        write_json(stage / "catalog.json", catalog)
        backup = Path(folder) / "previous"
        if output.exists():
            output.rename(backup)
        try:
            stage.rename(output)
        except Exception:
            if backup.exists():
                backup.rename(output)
            raise
    print(f"Built {len(report_data)} report types; {sum(r['rows'] for r in report_data):,} source rows", flush=True)
    return catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", type=int, default=3, help="Calendar years including the current year (default: 3)")
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR)
    args = parser.parse_args()
    build(output=args.output, years_back=args.years)


if __name__ == "__main__":
    main()
