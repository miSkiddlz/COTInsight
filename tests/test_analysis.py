from datetime import date, timedelta
import unittest
from scripts import cot_analysis as a


def records(n=53):
    end = date(2026, 10, 6)
    return [{"date": (end - timedelta(weeks=n-1-i)).isoformat(), "unit": "CONTRACT UNIT A", "open_interest": 1000,
             "groups": {"test": {"long": 100+i, "short": 100, "net": i, "spreading": None}}} for i in range(n)]


class AnalysisTests(unittest.TestCase):
    def test_calendar_window_excludes_exact_old_boundary(self):
        result = a.summarize(records(), [{"id":"test"}])["groups"]["test"]["windows"]["52"]
        self.assertEqual(result["n"], 52)
        self.assertEqual(result["min"], 1)
        self.assertEqual(result["max"], 52)
        self.assertEqual(result["cot_index"], 100)
        self.assertAlmostEqual(result["percentile"], 100*51.5/52)

    def test_ties_midrank_and_flat_range(self):
        result = a.rank_metrics([5]*52, 5, 52)
        self.assertEqual(result["percentile"], 50)
        self.assertIsNone(result["cot_index"])
        result = a.rank_metrics([0]*26+[1]*26, 1, 52)
        self.assertEqual(result["percentile"], 75)

    def test_insufficient_missing_and_zero_values(self):
        self.assertIsNone(a.rank_metrics([1]*41, 1, 52)["percentile"])
        self.assertEqual(a.rank_metrics([0]*42, 0, 52)["percentile"], 50)
        self.assertIsNone(a.rank_metrics([1]*52, None, 52)["cot_index"])
        self.assertEqual(a.rank_metrics([None, float('nan')]+[0]*42, 0, 52)["n"], 42)
        self.assertIsNone(a.share(1, 0))
        self.assertIsNone(a.share(None, 100))
        self.assertEqual(a.share(-25, 100), -25)

    def test_no_lookahead(self):
        data = records()
        day = data[43]["date"]
        result = a.summarize(data, [{"id":"test"}], day)
        self.assertEqual(result["date"], day)
        self.assertEqual(result["groups"]["test"]["net"], 43)
        self.assertEqual(result["groups"]["test"]["windows"]["52"]["max"],43)
        self.assertIsNone(a.summarize(data, [{"id":"test"}], "1900-01-01"))

    def test_unit_boundary_is_contiguous(self):
        data = records()
        data[-2]["unit"]="OTHER UNIT"
        result=a.summarize(data,[{"id":"test"}])
        self.assertEqual(result["comparable_since"],data[-1]["date"])
        self.assertEqual(result["groups"]["test"]["windows"]["52"]["n"],1)
        self.assertIsNone(result["groups"]["test"]["changes"]["1"]["net"])

    def test_exact_weekly_comparisons_and_share_denominators(self):
        data=records()
        data[-2]["open_interest"]=500
        result=a.summarize(data,[{"id":"test"}])
        self.assertAlmostEqual(result["oi_change_pct"],100)
        self.assertEqual(result["groups"]["test"]["changes"]["4"]["net"],4)
        self.assertAlmostEqual(result["groups"]["test"]["changes"]["1"]["share_pp"],5.2-10.2)
        del data[-2]
        result=a.summarize(data,[{"id":"test"}])
        self.assertIsNone(result["groups"]["test"]["changes"]["1"]["net"])
        self.assertIsNone(result["oi_change_pct"])
        self.assertEqual(result["groups"]["test"]["changes"]["4"]["net"],4)

    def test_sign_change_and_missing_positions(self):
        data=records()
        data[-2]["groups"]["test"]["net"]=-1
        self.assertTrue(a.summarize(data,[{"id":"test"}])["groups"]["test"]["sign_flip"])
        data[-1]["groups"]["test"]["net"]=None
        result=a.summarize(data,[{"id":"test"}])["groups"]["test"]
        self.assertIsNone(result["net_share"])
        self.assertIsNone(result["changes"]["1"]["net"])
        self.assertFalse(result["sign_flip"])


if __name__ == '__main__': unittest.main()
