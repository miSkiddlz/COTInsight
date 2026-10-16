import csv
from datetime import date
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
import zipfile

from scripts import fetch_cot_data as cot


def fixture(report=cot.REPORTS[0], day="2026-01-06", code="001602", name="TEST MARKET - TEST EXCHANGE"):
    row = {"Market and Exchange Names": name, "As of Date in Form YYYY-MM-DD": day,
           "CFTC Contract Market Code": code, "CFTC Market Code in Initials": "CME ", "Contract Units": "(CONTRACTS OF 1 UNIT)"}
    for group in report.groups:
        row[group.long] = "100"
        row[group.short] = "100"
        if group.spreading:
            row[group.spreading] = "10"
    oi = 100 * len(report.groups) + 10 * sum(bool(g.spreading) for g in report.groups)
    row["Open Interest (All)"] = str(oi)
    row["Total Reportable Positions-Long (All)"] = str(oi - 100)
    row["Total Reportable Positions-Short (All)"] = str(oi - 100)
    row["Suppressed count (source)"] = "."
    row["Unknown extra column"] = "000123"
    return row


def archive(report, rows, headers=None):
    headers = headers or list(rows[0])
    text = io.StringIO()
    writer = csv.writer(text)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([row.get(key, "") for key in headers] if isinstance(row, dict) else row)
    content = io.BytesIO()
    with zipfile.ZipFile(content, "w") as z:
        z.writestr(report.member, text.getvalue())
    return content.getvalue()


class DataTests(unittest.TestCase):
    def test_all_seven_schemas_and_balances(self):
        for report in cot.REPORTS:
            with self.subTest(report=report.id):
                _, rows = cot.parse_archive(archive(report, [fixture(report)]), report, 2026)
                record = rows[0][0]
                self.assertEqual(record["code"], "001602")
                self.assertEqual(len(record["groups"]), len(report.groups))
                self.assertTrue(all(g["net"] == 0 for g in record["groups"].values()))

    def test_real_cftc_rows_have_expected_numbers(self):
        source = json.loads((Path(__file__).parent / "fixtures/reports.json").read_text())
        # Independent expected results from the published 2026-10-06 report rows.
        expected = {
            "legacy_fut": (497181, "commercial", 13670),
            "legacy_combined": (597861, "commercial", 22847),
            "disagg_fut": (497181, "producer", -56769),
            "disagg_combined": (597861, "producer", -47758),
            "tff_fut": (371048, "dealer", 119957),
            "tff_combined": (394570, "dealer", 121111),
            "supplemental": (597861, "index", 77416),
        }
        for report in cot.REPORTS:
            with self.subTest(report=report.id):
                original = source[report.id]
                _, rows = cot.parse_archive(archive(report, original["rows"], original["headers"]), report, 2026)
                oi, group, net = expected[report.id]
                self.assertEqual(rows[0][0]["open_interest"], oi)
                self.assertEqual(rows[0][0]["groups"][group]["net"], net)

    def test_archive_and_independent_official_api_agree(self):
        fixtures = Path(__file__).parent / "fixtures"
        source = json.loads((fixtures / "reports.json").read_text())["legacy_fut"]
        api = json.loads((fixtures / "api_gold_2026-10-06.json").read_text())["row"]
        _, rows = cot.parse_archive(archive(cot.REPORTS[0], source["rows"], source["headers"]), cot.REPORTS[0], 2026)
        gold = next(r for r, _ in rows if r["code"] == "088691")
        self.assertEqual(gold["open_interest"], int(api["open_interest_all"]))
        for group, prefix in (("commercial", "comm"), ("noncommercial", "noncomm"), ("nonreportable", "nonrept")):
            for side in ("long", "short"):
                self.assertEqual(gold["groups"][group][side], int(api[f"{prefix}_positions_{side}_all"]))

    def test_missing_positions_never_become_zero(self):
        row = fixture()
        row[cot.LEGACY[0].long] = "."
        _, rows = cot.parse_archive(archive(cot.REPORTS[0], [row]), cot.REPORTS[0], 2026)
        group = rows[0][0]["groups"]["commercial"]
        self.assertIsNone(group["long"])
        self.assertIsNone(group["net"])
        self.assertEqual(group["short"], 100)

    def test_numeric_rules_preserve_negative_zero(self):
        self.assertEqual(cot.number("-0", "test"), 0)
        self.assertEqual(cot.number("1,234", "test"), 1234)
        for value in ("-1", "nan", "1.5", "12,34"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                cot.number(value, "test")

    def test_contract_codes_keep_zeroes_letters_and_plus(self):
        for code in ("001602", "0063CU", "12460+"):
            with self.subTest(code=code):
                _, rows = cot.parse_archive(archive(cot.REPORTS[0], [fixture(code=code)]), cot.REPORTS[0], 2026)
                self.assertEqual(rows[0][0]["code"], code)
        with self.assertRaises(ValueError):
            cot.parse_archive(archive(cot.REPORTS[0], [fixture(code="../bad")]), cot.REPORTS[0], 2026)

    def test_no_market_name_filter_and_no_name_merging(self):
        report = cot.REPORTS[0]
        rows = [fixture(code="0063CU", name="ALUMINIUM EURO PREM DUTY-PAID"), fixture(code="001602", name="ALUMINIUM EURO PREM DUTY-PAID")]
        _, result = cot.parse_archive(archive(report, rows), report, 2026)
        self.assertEqual(len(result), 2)
        self.assertEqual({r[0]["code"] for r in result}, {"0063CU", "001602"})

    def test_large_balance_errors_rejected_and_small_rounding_retained(self):
        report = cot.REPORTS[0]
        for delta in (1, 50):
            row = fixture()
            row[cot.LEGACY[0].long] = str(100 + delta)
            if delta == 50:
                with self.assertRaisesRegex(ValueError, "reconciliation"):
                    cot.parse_archive(archive(report, [row]), report, 2026)
            else:
                _, rows = cot.parse_archive(archive(report, [row]), report, 2026)
                self.assertEqual(rows[0][0]["rounding_difference"]["long"], 1)

    def test_dates_duplicates_and_empty_files_rejected(self):
        report = cot.REPORTS[0]
        for rows in ([fixture(), fixture()], [fixture(day="2025-12-30")], [fixture(day="2026-02-30")], [fixture(day="2099-01-01")]):
            with self.subTest(day=rows[0]["As of Date in Form YYYY-MM-DD"]), self.assertRaises(ValueError):
                cot.parse_archive(archive(report, rows), report, 2026)
        with self.assertRaises(ValueError):
            cot.parse_archive(archive(report, [], headers=list(fixture())), report, 2026)

    def test_missing_ambiguous_columns_and_wrong_cell_count(self):
        report = cot.REPORTS[0]
        row = fixture()
        headers = list(row)
        for columns in (headers[1:], headers + ["Open_Interest_All"]):
            with self.assertRaises(ValueError):
                cot.resolve_columns(columns, report)
        with self.assertRaises(ValueError):
            cot.parse_archive(archive(report, [["wrong"]], headers), report, 2026)

    def test_unexpected_archive_contents(self):
        with self.assertRaises(zipfile.BadZipFile):
            cot.parse_archive(b"<html>Error</html>", cot.REPORTS[0], 2026)
        content = io.BytesIO()
        with zipfile.ZipFile(content, "w") as z:
            z.writestr("other.txt", "not the selected report")
        with self.assertRaises(ValueError):
            cot.parse_archive(content.getvalue(), cot.REPORTS[0], 2026)

    def test_failed_fetch_does_not_replace_previous_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/"data"
            target.mkdir()
            (target/"catalog.json").write_text('"previous"')
            def fail(report, year):
                if year == 2026:
                    raise RuntimeError("Source unavailable")
                return archive(report, [fixture(report, day=f"{year}-01-06")])
            with self.assertRaises(RuntimeError):
                cot.build(target, reports=(cot.REPORTS[0],), loader=fail)
            self.assertEqual(json.loads((target/"catalog.json").read_text()), "previous")
            self.assertEqual(list(target.iterdir()), [target/"catalog.json"])

    def test_complete_source_export_and_sorted_history(self):
        with tempfile.TemporaryDirectory() as folder:
            report = cot.REPORTS[0]
            def loader(rep, year):
                return archive(rep, [fixture(rep, day=f"{year}-01-13"), fixture(rep, day=f"{year}-01-06")])
            target = Path(folder)/"data"
            result = cot.build(target, reports=(report,), today=date(2026, 10, 15), loader=loader)
            market = result["reports"][0]["markets"][0]
            history = json.loads((target/market["path"]).read_text())
            self.assertEqual(len(history["records"]), 6)
            self.assertEqual(history["records"][0]["date"], "2024-01-06")
            raw = json.loads((target/market["raw_path"]).read_text())
            index = raw["schemas"][0].index("Unknown extra column")
            self.assertEqual(raw["rows"][0]["values"][index], "000123")
            index = raw["schemas"][0].index("Suppressed count (source)")
            self.assertEqual(raw["rows"][0]["values"][index], ".")
            self.assertEqual(len(raw["rows"]), 6)
            self.assertTrue(all(len(s["sha256"]) == 64 for s in result["reports"][0]["sources"]))

    def test_raw_only_correction_changes_file_hash(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/"data"
            def loader(report, year):
                return archive(report, [fixture(report)])
            first = cot.build(target, years_back=1, reports=(cot.REPORTS[0],), today=date(2026, 10, 15), loader=loader)
            def corrected(report, year):
                row = fixture(report)
                row["Unknown extra column"] = "source correction"
                return archive(report, [row])
            second = cot.build(target, years_back=1, reports=(cot.REPORTS[0],), today=date(2026, 10, 15), loader=corrected)
            self.assertNotEqual(first["reports"][0]["markets"][0]["path"], second["reports"][0]["markets"][0]["path"])

    def test_january_404_only_is_explicitly_allowed(self):
        def loader(report, year):
            if year == 2026:
                raise HTTPError("url", 404, "No new annual archive", {}, None)
            return archive(report, [fixture(report, day=f"{year}-01-06")])
        with tempfile.TemporaryDirectory() as folder:
            catalog = cot.build(Path(folder)/"data", reports=(cot.REPORTS[0],), today=date(2026, 1, 2), loader=loader)
            self.assertTrue(catalog["reports"][0]["warnings"])
            self.assertEqual(catalog["reports"][0]["latest_report_date"], "2025-01-06")
            with self.assertRaises(HTTPError):
                cot.build(Path(folder)/"data", reports=(cot.REPORTS[0],), today=date(2026, 2, 2), loader=loader)

    def test_retry_temporary_http_errors_but_not_404(self):
        report = cot.REPORTS[0]
        with patch.object(cot, "urlopen", side_effect=[HTTPError("url", 503, "temporary", {}, None), io.BytesIO(b"zip")]) as call, patch.object(cot.time, "sleep"):
            self.assertEqual(cot.download(report, 2026), b"zip")
            self.assertEqual(call.call_count, 2)
        with patch.object(cot, "urlopen", side_effect=HTTPError("url", 404, "missing", {}, None)) as call:
            with self.assertRaises(HTTPError):
                cot.download(report, 2026)
            self.assertEqual(call.call_count, 1)
        with patch.object(cot, "urlopen", side_effect=URLError("network")) as call, patch.object(cot.time, "sleep"):
            with self.assertRaises(URLError):
                cot.download(report, 2026)
            self.assertEqual(call.call_count, 3)


if __name__ == "__main__":
    unittest.main()
