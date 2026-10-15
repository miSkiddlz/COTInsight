import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import zipfile

from scripts import fetch_cot_api as cot


def fixtures(day="2026-01-06"):
    return [dict(zip(cot.COLUMNS, [market, day, "1,200", "300", "500", "700", "100", "800"]))
            for market in cot.FILTER_MARKETS]


class DataTests(unittest.TestCase):
    def test_numbers_dates_and_sorting(self):
        records = cot.build_records(fixtures("2026-01-13") + fixtures())
        self.assertEqual(records[0]["report_date_as_yyyymmdd"], "2026-01-06")
        self.assertEqual(records[0]["commercial_positions_long_all"], 1200)
        self.assertEqual(len(records), 10)

    def test_incomplete_and_duplicate_data_rejected(self):
        for rows in ([], fixtures()[:1], fixtures() + fixtures()):
            with self.subTest(rows=len(rows)), self.assertRaises(ValueError):
                cot.build_records(rows)

    def test_invalid_counts_rejected(self):
        for value in ("", "NaN", "-1"):
            rows = fixtures()
            rows[0]["Commercial Positions-Long (All)"] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                cot.build_records(rows)

    def test_archive_download(self):
        import csv
        text = io.StringIO()
        writer = csv.DictWriter(text, fieldnames=cot.COLUMNS)
        writer.writeheader()
        writer.writerows(fixtures())
        content = io.BytesIO()
        with zipfile.ZipFile(content, "w") as archive:
            archive.writestr("annual.txt", text.getvalue())
        with patch.object(cot, "urlopen", return_value=io.BytesIO(content.getvalue())):
            self.assertEqual(len(cot.build_records(cot.fetch_year(2026))), 5)

    def test_failed_fetch_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/"cot_data.json"
            target.write_text('["previous publication"]')
            with patch.object(cot, "OUTPUT_FILE", target), patch.object(cot, "fetch_year", side_effect=RuntimeError("unavailable")):
                with self.assertRaises(RuntimeError):
                    cot.main()
            self.assertEqual(json.loads(target.read_text()), ["previous publication"])

    def test_successful_build_writes_all_years(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/"data/cot_data.json"
            with patch.object(cot, "OUTPUT_FILE", target), patch.object(cot, "fetch_year", side_effect=lambda year: fixtures(f"{year}-01-06")):
                cot.main()
            self.assertEqual(len(json.loads(target.read_text())), 15)


if __name__ == "__main__":
    unittest.main()
