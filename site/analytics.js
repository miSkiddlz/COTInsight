/* Identical definitions to scripts/cot_analysis.py; pure, testable calculations. */
(function (root) {
  const WINDOWS = [26, 52, 104, 156];
  const valid = (x) => typeof x === "number" && Number.isFinite(x);
  const shift = (day, days) => {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const share = (net, oi) =>
    valid(net) && valid(oi) && oi > 0 ? (100 * net) / oi : null;
  function rankMetrics(values, current, weeks) {
    values = values.filter(valid);
    const result = {
      n: values.length,
      required: Math.ceil(weeks * 0.8),
      percentile: null,
      cot_index: null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
    if (values.length < result.required || !valid(current)) return result;
    result.percentile =
      (100 *
        (values.filter((x) => x < current).length +
          0.5 * values.filter((x) => x === current).length)) /
      values.length;
    if (result.max !== result.min)
      result.cot_index =
        (100 * (current - result.min)) / (result.max - result.min);
    return result;
  }
  function summarize(records, groups, asof) {
    const available = records.filter((r) => !asof || r.date <= asof);
    if (!available.length) return null;
    const latest = available[available.length - 1];
    let first = available.length - 1;
    while (first > 0 && available[first - 1].unit === latest.unit) first--;
    const comparable = available.slice(first),
      dates = new Map(comparable.map((r) => [r.date, r]));
    const previous = dates.get(shift(latest.date, -7));
    const out = {
      date: latest.date,
      unit: latest.unit,
      open_interest: latest.open_interest,
      comparable_since: comparable[0].date,
      oi_change_pct:
        previous && previous.open_interest > 0
          ? (latest.open_interest / previous.open_interest - 1) * 100
          : null,
      groups: {},
    };
    for (const group of groups) {
      const gid = typeof group === "string" ? group : group.id,
        now = latest.groups[gid];
      const currentShare = share(now.net, latest.open_interest);
      const value = {
        ...now,
        net_share: currentShare,
        changes: {},
        windows: {},
        sign_flip: false,
      };
      for (const weeks of [1, 4, 13]) {
        const earlier = dates.get(shift(latest.date, -weeks * 7)),
          old = earlier?.groups[gid];
        const oldShare = earlier ? share(old.net, earlier.open_interest) : null;
        value.changes[weeks] = {
          date: earlier?.date || null,
          net:
            old && valid(now.net) && valid(old.net) ? now.net - old.net : null,
          share_pp:
            valid(currentShare) && valid(oldShare)
              ? currentShare - oldShare
              : null,
        };
      }
      const oldNet = previous?.groups[gid]?.net;
      value.sign_flip = valid(now.net) && valid(oldNet) && now.net * oldNet < 0;
      for (const weeks of WINDOWS)
        value.windows[weeks] = rankMetrics(
          comparable
            .filter((r) => r.date > shift(latest.date, -weeks * 7))
            .map((r) => r.groups[gid].net),
          now.net,
          weeks,
        );
      out.groups[gid] = value;
    }
    return out;
  }
  function range(records, asof, weeks) {
    return records.filter(
      (r) =>
        r.date <= asof && (!weeks || r.date > shift(asof, -Number(weeks) * 7)),
    );
  }
  function rankHistory(records, group, weeks, asof) {
    if (!WINDOWS.includes(Number(weeks))) throw new Error("Unsupported rank window");
    const available = records.filter((r) => !asof || r.date <= asof);
    let first = 0;
    return available.map((record, index) => {
      if (index && record.unit !== available[index - 1].unit) first = index;
      const boundary = shift(record.date, -Number(weeks) * 7);
      while (first < index && available[first].date <= boundary) first++;
      const net = record.groups[group]?.net ?? null;
      return {
        date: record.date, unit: record.unit, net,
        open_interest: record.open_interest,
        ...rankMetrics(available.slice(first, index + 1).map((r) => r.groups[group]?.net), net, Number(weeks)),
      };
    });
  }
  const api = { WINDOWS, valid, shift, share, rankMetrics, summarize, range, rankHistory };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.COTMath = api;
})(typeof window !== "undefined" ? window : globalThis);
