/* Browser-local workspace and research tools. No account or remote writes. */
const STORE_KEY = "cotinsight.workspace.v1";
const DEFAULT_GROUP = {
  legacy: "noncommercial",
  disaggregated: "managed",
  tff: "leveraged",
  supplemental: "index",
};
const workspaceState = {
  initialMarket: null,
  pendingAsOf: null,
  pendingCompare: [],
  page: 0,
  activeSection: "radar",
  compareController: null,
  snapshots: new Map(),
  researchVersion: 0,
  compareVersion: 0,
  personalVersion: 0,
  alertsVersion: 0,
  briefing: "",
  filtered: [],
  storage: { version: 1, watchlist: [], views: [], alerts: [] },
};
const pct = (value, signed = false) =>
  finite(value) ? `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}%` : "—";
const pp = (value) =>
  finite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(2)} pp` : "—";
const focusID = () => el("focusGroup").value;
const lookback = () => el("lookbackSelect").value;
const watchKey = (report, code) => `${report}/${code}`;
const isWatched = (report, code) =>
  workspaceState.storage.watchlist.some(
    (w) => w.report === report && w.code === code,
  );
function notice(text) {
  el("workspaceNotice").textContent = text;
}

function safeView(input) {
  if (!input || typeof input !== "object") return null;
  const report = catalog.reports.find((r) => r.id === input.report);
  if (!report || typeof input.market !== "string" || !/^[A-Z0-9+]{6}$/.test(input.market)) return null;
  const choose = (value, options, fallback) =>
    options.includes(String(value)) ? String(value) : fallback;
  return {
    report: report.id,
    market: input.market,
    metric: choose(input.metric, ["net", "long", "short", "spreading"], "net"),
    range: choose(input.range, ["13", "26", "52", "104", "all"], "52"),
    scale: choose(input.scale, ["contracts", "share"], "contracts"),
    lookback: choose(input.lookback, ["26", "52", "104", "156"], "52"),
    group: report.groups.some((g) => g.id === input.group)
      ? input.group
      : DEFAULT_GROUP[report.family],
    asof: /^\d{4}-\d{2}-\d{2}$/.test(input.asof || "") ? input.asof : null,
    oi: input.oi === true,
    compare: Array.isArray(input.compare)
      ? [
          ...new Set(input.compare.filter((c) => typeof c === "string" && /^[A-Z0-9+]{6}$/.test(c))),
        ].slice(0, 3)
      : [],
  };
}
function validateStore(input) {
  if (
    !input ||
    input.version !== 1 ||
    !Array.isArray(input.watchlist) ||
    !Array.isArray(input.views) ||
    !Array.isArray(input.alerts)
  )
    throw new Error("Unsupported workspace backup");
  const output = { version: 1, watchlist: [], views: [], alerts: [], preferences: {screenView: input.preferences?.screenView === "heatmap" ? "heatmap" : "table"} },
    seen = new Set();
  for (const item of input.watchlist.slice(0, 100)) {
    const report = catalog.reports.find((r) => r.id === item?.report);
    if (!report || typeof item.code !== "string" || !/^[A-Z0-9+]{6}$/.test(item.code)) continue;
    const key = watchKey(report.id, item.code);
    if (seen.has(key)) continue;
    seen.add(key);
    output.watchlist.push({
      report: report.id,
      code: item.code,
      group: report.groups.some((g) => g.id === item.group)
        ? item.group
        : DEFAULT_GROUP[report.family],
    });
  }
  for (const item of input.views.slice(0, 20)) {
    const state = safeView(item?.state);
    if (state && typeof item.name === "string" && item.name.trim())
      output.views.push({ name: item.name.trim().slice(0, 60), state });
  }
  for (const item of input.alerts.slice(0, 50)) {
    const report = catalog.reports.find((r) => r.id === item?.report);
    if (
      !report ||
      typeof item.code !== "string" ||
      !/^[A-Z0-9+]{6}$/.test(item.code || "") ||
      !report.groups.some((g) => g.id === item.group) ||
      !["high", "low", "move", "flip"].includes(item.type) ||
      ![26, 52, 104, 156].includes(Number(item.window)) ||
      !finite(item.threshold) ||
      item.threshold < 0 ||
      item.threshold > 200
    )
      continue;
    if (["high", "low"].includes(item.type) && item.threshold > 100) continue;
    output.alerts.push({
      report: report.id,
      code: item.code,
      group: item.group,
      type: item.type,
      threshold: item.threshold,
      window: Number(item.window),
    });
  }
  return output;
}
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(workspaceState.storage));
  } catch {
    notice(
      "Browser storage is unavailable or full. Changes work for this visit; export a workspace backup to keep them.",
    );
  }
}
function saveFile(name, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = node("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function csv(rows) {
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
function currentView() {
  if (!activeMarket) return null;
  return safeView({
    report: activeReport.id,
    market: activeMarket.code,
    metric: el("metricSelect").value,
    range: el("rangeSelect").value,
    scale: el("scaleSelect").value,
    group: focusID(),
    lookback: lookback(),
    asof:
      el("observationSelect").selectedIndex > 0
        ? el("observationSelect").value
        : null,
    oi: el("showOI").checked,
    compare: Array.from(el("compareSelect").selectedOptions).map(
      (o) => o.value,
    ),
  });
}
function updateURL() {
  const view = currentView();
  if (!view) return;
  const url = new URL(window.location.href);
  url.search = "";
  for (const key of [
    "report",
    "market",
    "metric",
    "range",
    "scale",
    "group",
    "lookback",
  ])
    url.searchParams.set(key, view[key]);
  if (view.asof) url.searchParams.set("asof", view.asof);
  if (view.oi) url.searchParams.set("oi", "1");
  if (view.compare.length)
    url.searchParams.set("compare", view.compare.join(","));
  url.hash = workspaceState.activeSection;
  try { window.history.replaceState(null, "", url); } catch {}
  el("shareLink").value = url.href;
}
function applyView(view) {
  if (!view) return;
  el("reportSelect").value = view.report;
  for (const [key, id] of [
    ["metric", "metricSelect"],
    ["range", "rangeSelect"],
    ["scale", "scaleSelect"],
    ["lookback", "lookbackSelect"],
  ])
    el(id).value = view[key];
  el("showOI").checked = view.oi;
  workspaceState.pendingAsOf = view.asof;
  workspaceState.pendingCompare = view.compare;
  workspaceState.pendingGroup = view.group;
  el("latestOnly").checked = false;
  if (
    !catalog.reports
      .find((r) => r.id === view.report)
      .markets.some((m) => m.code === view.market)
  )
    notice(
      "The saved contract is outside this import window. Showing an available market.",
    );
  showSection("dashboard");
  changeReport(view.market);
}
function openMarket(report, code) {
  workspaceState.pendingAsOf = null;
  workspaceState.pendingCompare = [];
  el("latestOnly").checked = false;
  el("reportSelect").value = report;
  showSection("dashboard");
  changeReport(code);
  el("dashboard").scrollIntoView?.({ behavior: "smooth", block: "start" });
}
async function loadSummary(report) {
  if (workspaceState.snapshots.has(report.id))
    return workspaceState.snapshots.get(report.id);
  const task = getJSON(dataURL(report.summary_path))
    .then((data) => {
      if (
        data.schema_version !== 1 ||
        data.report !== report.id ||
        !Array.isArray(data.markets)
      )
        throw new Error("Invalid research snapshot");
      return new Map(data.markets.map((item) => [item.code, item.snapshot]));
    })
    .catch((error) => {
      workspaceState.snapshots.delete(report.id);
      throw error;
    });
  workspaceState.snapshots.set(report.id, task);
  return task;
}
function setupReportWorkspace(report) {
  const wanted = workspaceState.pendingGroup || focusID();
  workspaceState.pendingGroup = null;
  el("focusGroup").replaceChildren();
  for (const group of report.groups) {
    const option = node("option", "", group.label);
    option.value = group.id;
    el("focusGroup").appendChild(option);
  }
  el("focusGroup").value = report.groups.some((g) => g.id === wanted)
    ? wanted
    : DEFAULT_GROUP[report.family];
  el("focusGroup").disabled = false;
  workspaceState.page = 0;
  el("radarScope").textContent = `${report.label} · loading research…`;
  el("radarNarrative").textContent = "";
  for (const id of ["radarMoves", "radarExtremes", "radarOI", "screenBody"])
    el(id).replaceChildren();
  renderResearch();
}
function prepareMarketWorkspace() {
  el("observationSelect").replaceChildren();
  history
    .slice()
    .reverse()
    .forEach((record, index) => {
      const option = node(
        "option",
        "",
        `${record.date}${index ? "" : " · latest"}`,
      );
      option.value = record.date;
      el("observationSelect").appendChild(option);
    });
  if (
    workspaceState.pendingAsOf &&
    history.some((r) => r.date === workspaceState.pendingAsOf)
  )
    el("observationSelect").value = workspaceState.pendingAsOf;
  else if (workspaceState.pendingAsOf)
    notice(
      "That saved reference date is unavailable in the imported history. Showing the latest observation.",
    );
  workspaceState.pendingAsOf = null;
  el("observationSelect").disabled = false;
  el("watchToggle").disabled = false;
  el("csvDownload").disabled = false;
  for (const id of ["shareButton", "saveView", "addAlert"])
    el(id).disabled = false;
  el("compareSelect").replaceChildren();
  for (const market of activeReport.markets.filter(
    (m) => m.current && m.code !== activeMarket.code,
  )) {
    const option = node("option", "", `${market.name} [${market.code}]`);
    option.value = market.code;
    option.selected = workspaceState.pendingCompare.includes(market.code);
    el("compareSelect").appendChild(option);
  }
  workspaceState.pendingCompare = [];
  renderComparePicker();
}
function analysisHistory() {
  return history
    ? history.filter(
        (r) =>
          r.date <=
          (el("observationSelect").value || history[history.length - 1].date),
      )
    : [];
}
function chartHistory(records = analysisHistory()) {
  if (!records.length) return [];
  return COTMath.range(
    records,
    records[records.length - 1].date,
    el("rangeSelect").value === "all" ? null : Number(el("rangeSelect").value),
  );
}
function clearWorkspaceMarket() {
  clearMarketResearch();
  el("watchToggle").disabled = true;
  el("csvDownload").disabled = true;
  el("observationSelect").disabled = true;
  for (const id of ["shareButton", "saveView", "addAlert"])
    el(id).disabled = true;
  el("insightStats").replaceChildren();
  el("insightNotes").textContent = "";
  el("historicalBanner").hidden = true;
  el("compareChart").hidden = true;
  el("compareSelect").replaceChildren();
  workspaceState.compareVersion++;
  workspaceState.compareController?.abort();
  el("compareCandidate").replaceChildren(); el("compareChips").replaceChildren(); el("compareAdd").disabled=true;
}
function renderWorkspaceMarket(series, summary) {
  const group = activeReport.groups.find((g) => g.id === focusID()),
    value = summary.groups[group.id],
    window = value.windows[lookback()];
  el("insightCategory").textContent = group.label;
  el("insightStats").replaceChildren();
  const items = [
    [
      "Historical percentile",
      pct(window.percentile),
      `${lookback()}W · empirical midrank`,
    ],
    [
      "COT range index",
      finite(window.cot_index) ? window.cot_index.toFixed(1) : "—",
      "0 = range low · 100 = range high",
    ],
    [
      "4W Δ net / OI",
      pp(value.changes["4"].share_pp),
      `Net change: ${format(value.changes["4"].net, true)}`,
    ],
    [
      "13W Δ net / OI",
      pp(value.changes["13"].share_pp),
      `Net change: ${format(value.changes["13"].net, true)}`,
    ],
  ];
  for (const [label, value, caption] of items) {
    const stat = node("div", "insight-stat");
    stat.append(
      node("span", "stat-label", label),
      node("strong", "", value),
      node("span", "stat-caption", caption),
    );
    el("insightStats").appendChild(stat);
  }
  el("insightNotes").textContent =
    `${window.n} valid observations; ${window.required} required in the ${lookback()}-calendar-week window. Comparable unit segment begins ${summary.comparable_since}. ${window.n < window.required ? "Insufficient comparable history: percentile and COT index are withheld." : window.min === window.max ? "Flat net-position range: COT index is undefined." : "Historical extremes describe positioning, not a future price reversal."}`;
  el("historicalBanner").hidden = el("observationSelect").selectedIndex === 0;
  el("historicalBanner").textContent =
    `Historical analysis as of ${summary.date}. Market cards, statistics and charts exclude later observations. Radar, screener, watchlist and local rules continue to use the latest dataset.`;
  el("watchToggle").textContent = isWatched(activeReport.id, activeMarket.code)
    ? "★ In watchlist · remove"
    : "☆ Add to watchlist";
  renderComparison();
  renderMarketResearch(series, summary);
  updateURL();
}
function toggleWatch(report, code, group) {
  if (isWatched(report, code))
    workspaceState.storage.watchlist = workspaceState.storage.watchlist.filter(
      (w) => watchKey(w.report, w.code) !== watchKey(report, code),
    );
  else {
    if (workspaceState.storage.watchlist.length >= 100) {
      notice("The local watchlist supports up to 100 markets.");
      return;
    }
    workspaceState.storage.watchlist.push({ report, code, group });
  }
  persist();
  if (activeMarket)
    el("watchToggle").textContent = isWatched(
      activeReport.id,
      activeMarket.code,
    )
      ? "★ In watchlist · remove"
      : "☆ Add to watchlist";
  renderPersonal();
  renderResearch();
}
function miniMarketButton(market, report, value, caption) {
  const button = node("button", "radar-item");
  button.type = "button";
  const name = node("span", "radar-name", market.name);
  name.title = market.name;
  const left = node("span", "");
  left.append(name, node("small", "", `${market.code} · ${caption}`));
  button.append(left, node("strong", "", value));
  button.addEventListener("click", () => openMarket(report.id, market.code));
  return button;
}
function researchRows(report, snapshots) {
  const minimum = Math.max(0, Number(el("minOI").value) || 0),
    group = focusID();
  return report.markets
    .map((market) => ({ market, snapshot: snapshots.get(market.code) }))
    .filter((row) => row.snapshot && row.snapshot.open_interest >= minimum)
    .map((row) => ({
      ...row,
      value: row.snapshot.groups[group],
      window: row.snapshot.groups[group].windows[lookback()],
    }));
}
async function renderResearch() {
  if (!activeReport) return;
  const version = ++workspaceState.researchVersion,
    report = activeReport;
  workspaceState.filtered = [];
  workspaceState.briefing = "";
  el("radarExport").disabled = true;
  el("screenExport").disabled = true;
  try {
    const snapshots = await loadSummary(report);
    if (version !== workspaceState.researchVersion || report !== activeReport)
      return;
    const rows = researchRows(report, snapshots),
      current = rows.filter((r) => r.market.current);
    const category = report.groups.find((g) => g.id === focusID()).label;
    el("radarScope").textContent =
      `${report.label} · ${report.latest_report_date} · ${category} · ${lookback()}W history · OI ≥ ${format(Math.max(0, Number(el("minOI").value) || 0))}`;
    const moves = current
      .filter((r) => finite(r.value.changes["1"].share_pp))
      .sort(
        (a, b) =>
          Math.abs(b.value.changes["1"].share_pp) -
          Math.abs(a.value.changes["1"].share_pp),
      )
      .slice(0, 5);
    const extremes = current
      .filter(
        (r) =>
          finite(r.window.percentile) &&
          (r.window.percentile <= 10 || r.window.percentile >= 90),
      )
      .sort(
        (a, b) =>
          Math.min(a.window.percentile, 100 - a.window.percentile) -
          Math.min(b.window.percentile, 100 - b.window.percentile),
      )
      .slice(0, 5);
    const oi = current
      .filter((r) => finite(r.snapshot.oi_change_pct))
      .sort(
        (a, b) =>
          Math.abs(b.snapshot.oi_change_pct) -
          Math.abs(a.snapshot.oi_change_pct),
      )
      .slice(0, 5);
    for (const id of ["radarMoves", "radarExtremes", "radarOI"])
      el(id).replaceChildren();
    for (const row of moves)
      el("radarMoves").appendChild(
        miniMarketButton(
          row.market,
          report,
          pp(row.value.changes["1"].share_pp),
          "1W Δ net / OI",
        ),
      );
    for (const row of extremes)
      el("radarExtremes").appendChild(
        miniMarketButton(
          row.market,
          report,
          pct(row.window.percentile),
          `${lookback()}W percentile · n=${row.window.n}`,
        ),
      );
    for (const row of oi)
      el("radarOI").appendChild(
        miniMarketButton(
          row.market,
          report,
          pct(row.snapshot.oi_change_pct, true),
          "1W open interest",
        ),
      );
    for (const id of ["radarMoves", "radarExtremes", "radarOI"])
      if (!el(id).children.length)
        el(id).appendChild(
          node(
            "p",
            "empty-state",
            "No qualifying observations with sufficient comparable data.",
          ),
        );
    const qualified = current.filter((r) => finite(r.window.percentile)),
      tails = qualified.filter(
        (r) => r.window.percentile <= 10 || r.window.percentile >= 90,
      );
    const narrative = `${current.length} current markets meet the open-interest filter. ${qualified.length} have enough comparable history; ${tails.length} fall in the lower or upper 10% of their own net-position history. ${moves.length ? `The largest absolute weekly relative shift is ${moves[0].market.name} (${moves[0].market.code}): ${pp(moves[0].value.changes["1"].share_pp)}.` : "No exact one-week comparisons are available."}`;
    el("radarNarrative").textContent = narrative;
    workspaceState.briefing =
      `# COTInsight positioning briefing\n\n${el("radarScope").textContent}\n\n${narrative}\n\n` +
      [
        [
          "Largest weekly position shifts",
          moves,
          (r) => pp(r.value.changes["1"].share_pp),
        ],
        ["Historical tails", extremes, (r) => pct(r.window.percentile)],
        [
          "Open interest changes",
          oi,
          (r) => pct(r.snapshot.oi_change_pct, true),
        ],
      ]
        .map(
          ([title, items, metric]) =>
            `## ${title}\n\n${items.map((r) => `- ${r.market.name} [${r.market.code}]: ${metric(r)}`).join("\n") || "No qualifying data."}`,
        )
        .join("\n\n") +
      `\n\nSource: CFTC official archives. Windows require 80% of expected weekly observations in a same-unit segment. Descriptive data, not forecasts.\n${window.location.origin}${window.location.pathname}\n`;
    renderScreener(rows, report);
    el("radarExport").disabled = false;
    el("screenExport").disabled = false;
  } catch (error) {
    if (version !== workspaceState.researchVersion) return;
    console.error(error);
    el("radarNarrative").textContent =
      "Research snapshots could not be loaded. Refresh after the latest GitHub build succeeds.";
    el("screenBody").replaceChildren();
    for (const id of ["radarMoves", "radarExtremes", "radarOI"])
      el(id).replaceChildren();
  }
}
function renderScreener(rows, report) {
  const query = el("screenSearch").value.trim().toLocaleLowerCase(),
    filter = el("screenFilter").value;
  let filtered = rows.filter(
    (r) =>
      (!el("screenLatest").checked || r.market.current) &&
      `${r.market.name} ${r.market.code} ${r.market.exchange}`
        .toLocaleLowerCase()
        .includes(query),
  );
  filtered = filtered.filter(
    (r) =>
      filter === "all" ||
      (filter === "watch" && isWatched(report.id, r.market.code)) ||
      (filter === "flip" && r.value.sign_flip) ||
      (finite(r.window.percentile) &&
        ((filter === "upper" && r.window.percentile >= 90) ||
          (filter === "lower" && r.window.percentile <= 10) ||
          (filter === "extreme" &&
            (r.window.percentile >= 90 || r.window.percentile <= 10)))),
  );
  const sort = el("screenSort").value;
  const val = (r) =>
    sort === "move"
      ? finite(r.value.changes["1"].share_pp)
        ? Math.abs(r.value.changes["1"].share_pp)
        : null
      : sort === "oi"
        ? r.snapshot.open_interest
        : sort === "net"
          ? r.value.net_share
          : r.window.percentile;
  filtered.sort((a, b) => {
    if (sort === "name")
      return (
        a.market.name.localeCompare(b.market.name) ||
        a.market.code.localeCompare(b.market.code)
      );
    const x = val(a),
      y = val(b);
    if (!finite(x)) return finite(y) ? 1 : 0;
    if (!finite(y)) return -1;
    return sort === "lower" ? x - y : y - x;
  });
  workspaceState.filtered = filtered;
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  workspaceState.page = Math.min(workspaceState.page, pages - 1);
  el("screenBody").replaceChildren();
  for (const row of filtered.slice(
    workspaceState.page * 20,
    (workspaceState.page + 1) * 20,
  )) {
    const tr = node("tr"),
      th = node("th");
    th.scope = "row";
    const button = node("button", "market-link", row.market.name);
    button.type = "button";
    button.addEventListener("click", () =>
      openMarket(report.id, row.market.code),
    );
    th.append(button, node("small", "market-code", row.market.code));
    tr.appendChild(th);
    for (const value of [
      pct(row.value.net_share, true),
      pp(row.value.changes["1"].share_pp),
      pp(row.value.changes["4"].share_pp),
      pct(row.window.percentile),
      finite(row.window.cot_index) ? row.window.cot_index.toFixed(1) : "—",
      format(row.snapshot.open_interest),
      row.snapshot.date,
    ])
      tr.appendChild(node("td", "", value));
    const td = node("td"),
      save = node(
        "button",
        "star-button",
        isWatched(report.id, row.market.code) ? "★" : "☆",
      );
    save.type = "button";
    save.setAttribute(
      "aria-label",
      `${isWatched(report.id, row.market.code) ? "Remove" : "Add"} ${row.market.name} ${isWatched(report.id, row.market.code) ? "from" : "to"} watchlist`,
    );
    save.addEventListener("click", () =>
      toggleWatch(report.id, row.market.code, focusID()),
    );
    td.appendChild(save);
    tr.appendChild(td);
    el("screenBody").appendChild(tr);
  }
  if (!filtered.length) {
    const tr = node("tr"),
      td = node("td", "empty-state", "No markets match these filters.");
    td.colSpan = 9;
    tr.appendChild(td);
    el("screenBody").appendChild(tr);
  }
  el("screenScope").textContent =
    `${report.label} · ${report.groups.find((g) => g.id === focusID()).label} · ${lookback()}W historical window. Snapshots use each contract’s latest available observation.`;
  el("screenCount").textContent = `${filtered.length} matching markets`;
  el("screenPage").textContent = `Page ${workspaceState.page + 1} of ${pages}`;
  el("screenPrevious").disabled = workspaceState.page === 0;
  el("screenNext").disabled = workspaceState.page >= pages - 1;
  renderHeatmap(filtered, report);
}
async function renderComparison() {
  const version = ++workspaceState.compareVersion;
  workspaceState.compareController?.abort();
  workspaceState.compareController = new AbortController();
  if (!activeMarket || !history) return;
  const selected = Array.from(el("compareSelect").selectedOptions);
  if (selected.length > 3) {
    selected.slice(3).forEach((o) => (o.selected = false));
    notice(
      "Comparison supports the selected market plus three additional contracts.",
    );
  }
  const codes = Array.from(el("compareSelect").selectedOptions).map(
    (o) => o.value,
  );
  renderComparePicker();
  updateURL();
  if (!codes.length) {
    el("compareChart").hidden = true;
    el("compareStatus").textContent = "Select additional markets to compare.";
    return;
  }
  const report = activeReport,
    market = activeMarket,
    group = focusID(),
    asof = el("observationSelect").value;
  el("compareStatus").textContent = "Loading comparison histories…";
  try {
    const extras = await Promise.all(codes.map(async code => {
      const m = report.markets.find(item=>item.code===code);
      if(!m) throw Error('Unknown comparison contract');
      const data = await loadMarketData(report,m,workspaceState.compareController.signal);
      return {market:m,records:data.records};
    }));
    const sets = [{market,records:history}, ...extras];
    if (version !== workspaceState.compareVersion || market !== activeMarket)
      return;
    const weeks =
      el("rangeSelect").value === "all"
        ? null
        : Number(el("rangeSelect").value);
    const traces = sets.map((set, index) => {
      const records = COTMath.range(set.records, asof, weeks),
        points = [];
      records.forEach((r, i) => {
        if (i && r.unit !== records[i - 1].unit)
          points.push({ date: r.date, record: null });
        points.push({ date: r.date, record: r });
      });
      return {
        x: points.map((p) => p.date),
        y: points.map((p) =>
          p.record
            ? COTMath.share(p.record.groups[group].net, p.record.open_interest)
            : null,
        ),
        name: `${set.market.name} [${set.market.code}]`,
        type: "scatter",
        mode: "lines",
        connectgaps: false,
        line: { color: COLORS[index], width: 2 },
      };
    });
    el("compareChart").hidden = false;
    await Plotly.react(
      "compareChart",
      traces,
      {
        paper_bgcolor: "#1b1825",
        plot_bgcolor: "#1b1825",
        font: { color: "#aaa3ba", size: 10 },
        margin: { l: 55, r: 20, t: 100, b: 45 },
        legend: { orientation: "h", y: 1.25, font: { size: 9 } },
        xaxis: { gridcolor: "#ffffff08" },
        yaxis: {
          ticksuffix: "%",
          title: "Net / OI",
          gridcolor: "#ffffff08",
          zerolinecolor: "#c197ff44",
        },
        hovermode: "x unified",
      },
      { responsive: true, displayModeBar: false },
    );
    if (version !== workspaceState.compareVersion) return;
    el("compareStatus").textContent =
      `${report.groups.find((g) => g.id === group).label} · net % of open interest · through ${asof}. Each series retains its own available dates; missing values are not filled. Relative positioning is not equal economic exposure.`;
  } catch (error) {
    if (version !== workspaceState.compareVersion || error.name === "AbortError") return;
    console.error(error);
    el("compareChart").hidden = true;
    el("compareStatus").textContent =
      "Comparison unavailable. Refresh and try again.";
  }
}
async function renderPersonal() {
  const version = ++workspaceState.personalVersion;
  const list = el("watchlistItems");
  list.replaceChildren();
  const pending = [];
  for (const item of workspaceState.storage.watchlist) {
    const report = catalog.reports.find((r) => r.id === item.report),
      market = report?.markets.find((m) => m.code === item.code);
    const card = node("article", "watch-card"),
      top = node("div", "table-heading"),
      title = node(
        "button",
        "market-link",
        market?.name || `Unavailable contract ${item.code}`,
      );
    title.type = "button";
    title.disabled = !market;
    if (market)
      title.addEventListener("click", () => openMarket(item.report, item.code));
    const remove = node("button", "icon-button", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${item.code} from watchlist`);
    remove.addEventListener("click", () =>
      toggleWatch(item.report, item.code, item.group),
    );
    top.append(title, remove);
    card.append(
      top,
      node("p", "data-note", `${report?.label || item.report} · ${item.code}`),
    );
    const stats = node("p", "watch-stats", "Loading snapshot…");
    card.appendChild(stats);
    list.appendChild(card);
    if (!market) {
      stats.textContent = "Not present in the current import window.";
      continue;
    }
    pending.push(
      (async () => {
        try {
          const snapshots = await loadSummary(report),
            snapshot = snapshots.get(item.code),
            value = snapshot?.groups[item.group];
          if (version !== workspaceState.personalVersion) return;
          if (!value) throw Error("No category snapshot");
          stats.textContent = `${report.groups.find((g) => g.id === item.group).label}: ${pct(value.net_share, true)} net/OI · ${pp(value.changes["1"].share_pp)} 1W · ${pct(value.windows[lookback()].percentile)} percentile · ${snapshot.date}${market.current ? "" : " · historical series"}`;
        } catch {
          if (version === workspaceState.personalVersion)
            stats.textContent =
              "Snapshot unavailable; the saved market is retained.";
        }
      })(),
    );
  }
  if (!list.children.length)
    list.appendChild(
      node(
        "p",
        "empty-state",
        "Your watchlist is empty. Save markets with ☆ in the analysis view or screener.",
      ),
    );
  renderViews();
  renderAlerts();
  await Promise.allSettled(pending);
}

function renderViews() {
  el("savedViews").replaceChildren();
  workspaceState.storage.views.forEach((view, index) => {
    const chip = node("div", "view-chip"),
      apply = node("button", "text-button", view.name),
      remove = node("button", "icon-button", "×");
    apply.type = remove.type = "button";
    apply.addEventListener("click", () => applyView(view.state));
    remove.setAttribute("aria-label", `Delete saved view ${view.name}`);
    remove.addEventListener("click", () => {
      workspaceState.storage.views.splice(index, 1);
      persist();
      renderViews();
    });
    chip.append(apply, remove);
    el("savedViews").appendChild(chip);
  });
  if (!workspaceState.storage.views.length)
    el("savedViews").appendChild(
      node(
        "p",
        "empty-state",
        "Save a named view to keep the market, category, date, chart settings and comparison.",
      ),
    );
}
async function renderAlerts() {
  const version = ++workspaceState.alertsVersion;
  const list = el("alertItems");
  list.replaceChildren();
  for (const [index, rule] of workspaceState.storage.alerts.entries()) {
    if (version !== workspaceState.alertsVersion) return;
    const report = catalog.reports.find((r) => r.id === rule.report),
      market = report?.markets.find((m) => m.code === rule.code),
      group = report?.groups.find((g) => g.id === rule.group);
    const card = node("div", "rule-card"),
      condition =
        rule.type === "flip"
          ? "Net sign changed in 1W"
          : rule.type === "move"
            ? `Absolute 1W Δ net/OI ≥ ${rule.threshold} pp`
            : `${rule.window}W percentile ${rule.type === "high" ? "≥" : "≤"} ${rule.threshold}`;
    const description = node(
        "span",
        "",
        `${market?.name || rule.code} · ${group?.label || rule.group} · ${condition}`,
      ),
      state = node("strong", "rule-state", "Checking…"),
      remove = node("button", "icon-button", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", "Delete rule");
    remove.addEventListener("click", () => {
      workspaceState.storage.alerts.splice(index, 1);
      persist();
      renderAlerts();
    });
    card.append(description, state, remove);
    list.appendChild(card);
    if (!market?.current) {
      state.textContent = "No current observation";
      continue;
    }
    try {
      const snapshots = await loadSummary(report),
        value = snapshots.get(rule.code)?.groups[rule.group];
      if (version !== workspaceState.alertsVersion) return;
      if (!value) throw Error("No snapshot");
      const numeric =
        rule.type === "flip"
          ? finite(value.changes["1"].net)
            ? Number(value.sign_flip)
            : null
          : rule.type === "move"
            ? finite(value.changes["1"].share_pp)
              ? Math.abs(value.changes["1"].share_pp)
              : null
            : value.windows[rule.window].percentile;
      if (!finite(numeric)) {
        state.textContent = "Insufficient comparable data";
        continue;
      }
      const met =
        rule.type === "low"
          ? numeric <= rule.threshold
          : rule.type === "flip"
            ? numeric === 1
            : numeric >= rule.threshold;
      state.textContent = `${met ? "Threshold met" : "Not met"} · ${snapshots.get(rule.code).date}`;
      state.dataset.met = String(met);
    } catch {
      state.textContent = "Snapshot unavailable";
    }
  }
  if (!list.children.length)
    list.appendChild(
      node(
        "p",
        "empty-state",
        "No local rules yet. Conditions are checked on this page only.",
      ),
    );
}
function initializeWorkspace() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) workspaceState.storage = validateStore(JSON.parse(raw));
  } catch {
    notice(
      "Saved workspace could not be read. Export backups help preserve local settings.",
    );
  }
  const params = new URLSearchParams(window.location.search),
    initial = safeView({
      report: params.get("report") || "legacy_fut",
      market: params.get("market") || "088691",
      metric: params.get("metric"),
      range: params.get("range"),
      scale: params.get("scale"),
      group: params.get("group"),
      lookback: params.get("lookback"),
      asof: params.get("asof"),
      oi: params.get("oi") === "1",
      compare: (params.get("compare") || "").split(","),
    });
  if (initial) {
    el("reportSelect").value = initial.report;
    workspaceState.initialMarket = initial.market;
    workspaceState.pendingAsOf = initial.asof;
    workspaceState.pendingGroup = initial.group;
    workspaceState.pendingCompare = initial.compare;
    for (const [key, id] of [
      ["metric", "metricSelect"],
      ["range", "rangeSelect"],
      ["scale", "scaleSelect"],
      ["lookback", "lookbackSelect"],
    ])
      el(id).value = initial[key];
    el("showOI").checked = initial.oi;
    if (initial.asof || params.has("market")) el("latestOnly").checked = false;
  }
  const refresh = () => {
    if (history)
      Promise.resolve(renderMarket()).catch((error) => {
        console.error(error);
        notice("Analysis could not be rendered. Refresh the page.");
      });
  };
  for (const id of [
    "rangeSelect",
    "scaleSelect",
    "showOI",
    "observationSelect",
  ])
    el(id).addEventListener("change", refresh);
  for (const id of ["focusGroup", "lookbackSelect"])
    el(id).addEventListener("change", () => {
      refresh();
      workspaceState.page = 0;
      renderResearch();
      renderPersonal();
    });
  for (const id of [
    "screenSearch",
    "screenSort",
    "screenFilter",
    "screenLatest",
    "minOI",
  ])
    el(id).addEventListener(id === "screenSearch" ? "input" : "change", () => {
      workspaceState.page = 0;
      renderResearch();
    });
  el("screenPrevious").addEventListener("click", () => {
    workspaceState.page = Math.max(0, workspaceState.page - 1);
    renderResearch();
  });
  el("screenNext").addEventListener("click", () => {
    workspaceState.page++;
    renderResearch();
  });
  el("compareSelect").addEventListener("change", renderComparison);
  el("watchToggle").addEventListener("click", () => {
    if (activeMarket)
      toggleWatch(activeReport.id, activeMarket.code, focusID());
  });
  el("shareButton").addEventListener("click", async () => {
    updateURL();
    el("shareLink").hidden = false;
    try {
      await navigator.clipboard.writeText(el("shareLink").value);
      notice("Analysis link copied.");
    } catch {
      el("shareLink").select();
      notice("Copy the link from the displayed field.");
    }
  });
  el("saveView").addEventListener("click", () => {
    const state = currentView(),
      name = el("viewName").value.trim();
    if (!state || !name) {
      notice("Load a market and enter a view name first.");
      return;
    }
    if (workspaceState.storage.views.length >= 20) {
      notice("Up to 20 local saved views are supported.");
      return;
    }
    workspaceState.storage.views.push({ name: name.slice(0, 60), state });
    persist();
    el("viewName").value = "";
    renderViews();
    notice("Analysis view saved in this browser.");
  });
  el("csvDownload").addEventListener("click", () => {
    if (!history) return;
    const header = [
        "date",
        "report",
        "code",
        "market",
        "unit",
        "open_interest",
        ...activeReport.groups.flatMap((g) =>
          ["long", "short", "spreading", "net"].map((key) => `${g.id}_${key}`),
        ),
      ],
      rows = chartHistory().map((r) => [
        r.date,
        activeReport.id,
        r.code,
        r.name,
        r.unit,
        r.open_interest,
        ...activeReport.groups.flatMap((g) =>
          ["long", "short", "spreading", "net"].map(
            (key) => r.groups[g.id][key],
          ),
        ),
      ]);
    saveFile(
      `COTInsight-${activeReport.id}-${activeMarket.code}-${el("observationSelect").value}.csv`,
      csv([header, ...rows]),
      "text/csv;charset=utf-8",
    );
  });
  el("screenExport").addEventListener("click", exportScreener);
  el("radarExport").addEventListener("click", () => {
    if (workspaceState.briefing)
      saveFile(
        `COTInsight-briefing-${activeReport.id}.md`,
        workspaceState.briefing,
        "text/markdown;charset=utf-8",
      );
  });
  el("refreshDataset").addEventListener("click", checkPublishedUpdate);
  el("backupExport").addEventListener("click", () =>
    saveFile(
      "COTInsight-workspace.json",
      JSON.stringify(workspaceState.storage, null, 2),
      "application/json",
    ),
  );
  el("backupImportButton").addEventListener("click", () =>
    el("backupImport").click(),
  );
  el("backupImport").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw Error("Backup exceeds 1 MiB");
      const imported = validateStore(JSON.parse(await file.text()));
      workspaceState.storage = validateStore({
        version: 1,
        watchlist: [...workspaceState.storage.watchlist, ...imported.watchlist],
        views: [...workspaceState.storage.views, ...imported.views],
        alerts: [...workspaceState.storage.alerts, ...imported.alerts],
        preferences: workspaceState.storage.preferences,
      });
      persist();
      renderPersonal();
      renderResearch();
      if (activeMarket)
        el("watchToggle").textContent = isWatched(
          activeReport.id,
          activeMarket.code,
        )
          ? "★ In watchlist · remove"
          : "☆ Add to watchlist";
      notice(
        "Workspace backup imported and merged with this browser’s settings.",
      );
    } catch (error) {
      notice(`Could not import workspace: ${error.message}`);
    }
    event.target.value = "";
  });
  el("alertType").addEventListener("change", () => {
    el("alertThreshold").disabled = el("alertType").value === "flip";
    el("alertThreshold").max = el("alertType").value === "move" ? "200" : "100";
    el("alertThreshold").value =
      el("alertType").value === "move"
        ? "3"
        : el("alertType").value === "low"
          ? "10"
          : "90";
  });
  el("addAlert").addEventListener("click", () => {
    if (!activeMarket) {
      notice("Load a market first.");
      return;
    }
    const threshold = Number(el("alertThreshold").value),
      type = el("alertType").value;
    if (
      !finite(threshold) ||
      threshold < 0 ||
      threshold > (type === "move" ? 200 : 100)
    ) {
      notice("Enter a valid threshold.");
      return;
    }
    if (workspaceState.storage.alerts.length >= 50) {
      notice("Up to 50 local rules are supported.");
      return;
    }
    workspaceState.storage.alerts.push({
      report: activeReport.id,
      code: activeMarket.code,
      group: focusID(),
      type,
      threshold,
      window: Number(lookback()),
    });
    persist();
    renderAlerts();
    notice(
      "Local rule added. It checks the latest dataset, including when historical analysis is selected.",
    );
  });
  initializeNavigation();
  initializeResearchControls();
  initializeMarketResearch();
  renderPersonal();
}
