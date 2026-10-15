"""Descriptive positioning metrics; no forecasts or trading signals.

Windows are calendar weeks, require 80% weekly observations, and never cross
an exact source-unit-description boundary. Percentiles use empirical midranks.
"""
from datetime import date, timedelta
import math

WINDOWS = (26, 52, 104, 156)


def valid(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def share(net, oi):
    return 100 * net / oi if valid(net) and valid(oi) and oi > 0 else None


def rank_metrics(values, current, weeks):
    values = [x for x in values if valid(x)]
    required = math.ceil(weeks * 0.8)
    result = {"n": len(values), "required": required, "percentile": None, "cot_index": None,
              "min": min(values) if values else None, "max": max(values) if values else None}
    if len(values) < required or not valid(current):
        return result
    lower = sum(x < current for x in values)
    equal = sum(x == current for x in values)
    result["percentile"] = 100 * (lower + 0.5 * equal) / len(values)
    lo, hi = result["min"], result["max"]
    if hi != lo:
        result["cot_index"] = 100 * (current - lo) / (hi - lo)
    return result


def summarize(records, groups, asof=None):
    """Summarize sorted records up to asof, without looking into the future."""
    available = [r for r in records if asof is None or r["date"] <= asof]
    if not available:
        return None
    latest = available[-1]
    # Only a contiguous same-unit segment is comparable, even if an older
    # description later reappears. Pure wording changes are conservatively split.
    first = len(available) - 1
    while first > 0 and available[first - 1]["unit"] == latest["unit"]:
        first -= 1
    comparable = available[first:]
    dates = {r["date"]: r for r in comparable}
    day = date.fromisoformat(latest["date"])
    summary = {"date": latest["date"], "unit": latest["unit"], "open_interest": latest["open_interest"],
               "comparable_since": comparable[0]["date"], "groups": {}}
    previous = dates.get((day - timedelta(weeks=1)).isoformat())
    summary["oi_change_pct"] = ((latest["open_interest"] / previous["open_interest"] - 1) * 100
                                if previous and previous["open_interest"] > 0 else None)
    for group in groups:
        gid = group.id if hasattr(group, "id") else group["id"]
        now = latest["groups"][gid]
        current_share = share(now["net"], latest["open_interest"])
        values = {**now, "net_share": current_share, "changes": {}, "windows": {}, "sign_flip": False}
        for weeks in (1, 4, 13):
            earlier = dates.get((day - timedelta(weeks=weeks)).isoformat())
            old = earlier["groups"][gid] if earlier else None
            old_share = share(old["net"], earlier["open_interest"]) if old else None
            values["changes"][str(weeks)] = {
                "date": earlier["date"] if earlier else None,
                "net": now["net"] - old["net"] if old and valid(now["net"]) and valid(old["net"]) else None,
                "share_pp": current_share - old_share if valid(current_share) and valid(old_share) else None,
            }
        if previous:
            old_net = previous["groups"][gid]["net"]
            values["sign_flip"] = valid(now["net"]) and valid(old_net) and now["net"] * old_net < 0
        for weeks in WINDOWS:
            boundary = (day - timedelta(weeks=weeks)).isoformat()
            window = [r["groups"][gid]["net"] for r in comparable if r["date"] > boundary]
            values["windows"][str(weeks)] = rank_metrics(window, now["net"], weeks)
        summary["groups"][gid] = values
    return summary
