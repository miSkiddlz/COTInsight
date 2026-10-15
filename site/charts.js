/* All report families share the same schema. Never merge markets by name. */
const COLORS = ["#ffb98b", "#c197ff", "#8ed9c4", "#8dbbf2", "#f59baa"];
const REPORT_NOTES = {
  legacy:
    "Legacy separates Commercials, Non-Commercials and Nonreportable positions. Nonreportable does not mean exclusively retail traders.",
  disaggregated:
    "Disaggregated reports cover physical commodity markets with separate Producer/Merchant, Swap Dealer, Managed Money and Other Reportable categories.",
  tff: "TFF covers financial contracts. Dealer, Asset Manager and Leveraged Fund categories are not interchangeable with the Legacy categories.",
  supplemental:
    "The Supplemental report covers selected agricultural contracts. Commodity Index Traders (CIT) are shown separately and excluded from the Commercial and Non-Commercial categories.",
};
let catalog;
let activeReport;
let activeMarket;
let history;
let requestId = 0;
let controller;
const cache = new Map();
const el = (id) => document.getElementById(id);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const format = (value, signed = false) =>
  finite(value)
    ? `${signed && value > 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "—";
const change = (current, previous) =>
  finite(current) && finite(previous) ? current - previous : null;

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function colorChange(element, value) {
  element.style.color =
    !finite(value) || value === 0
      ? "var(--muted)"
      : value > 0
        ? "var(--positive)"
        : "var(--negative)";
}

function setStatus(text, state = "") {
  el("dataStatus").textContent = text;
  el("dataStatus").dataset.state = state;
}

async function getJSON(path, signal) {
  const response = await fetch(path, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`Data request failed (${response.status})`);
  return response.json();
}

function dataURL(path) {
  // Catalog paths are generated locally; still reject unexpected URL schemes.
  if (
    !/^(?:(?:raw\/)?[a-z_]+\/[A-Z0-9-]+|summaries\/[a-z_]+)-[a-f0-9]{12}\.json$/.test(
      path,
    )
  ) {
    throw new Error("Invalid catalog data path");
  }
  return `./data/${path}`;
}

function updateMarkets(preferredCode) {
  const query = el("marketSearch").value.trim().toLocaleLowerCase();
  const latestOnly = el("latestOnly").checked;
  const markets = activeReport.markets.filter(
    (m) =>
      (!latestOnly || m.current) &&
      `${m.name} ${m.code} ${m.exchange}`.toLocaleLowerCase().includes(query),
  );
  el("assetSelect").replaceChildren();
  for (const market of markets) {
    const option = node(
      "option",
      "",
      `${market.name} [${market.code}]${market.current ? "" : ` · last ${market.last_date}`}`,
    );
    option.value = market.code;
    el("assetSelect").appendChild(option);
  }
  el("marketCount").textContent =
    `${markets.length} of ${activeReport.markets.length} markets`;
  el("assetSelect").disabled = markets.length === 0;
  if (!markets.length) {
    cancelHistory();
    clearDisplay();
    setStatus(
      "No matching markets. Change the search or include historical markets.",
    );
    return;
  }
  const selected =
    markets.find((m) => m.code === preferredCode) ||
    markets.find((m) => m.code === "088691") ||
    markets[0];
  el("assetSelect").value = selected.code;
  loadHistory(selected);
}

function cancelHistory() {
  requestId += 1;
  if (controller) controller.abort();
}

function clearDisplay() {
  history = null;
  activeMarket = null;
  el("kpiRow").replaceChildren();
  el("positionsBody").replaceChildren();
  el("selectedMarket").textContent = "No market data loaded.";
  el("lastUpdate").textContent = "—";
  el("openInterest").textContent = "—";
  el("comparisonDate").textContent = "—";
  el("unitLabel").textContent = "—";
  el("coverageText").textContent = "—";
  el("comparisonNote").textContent = "";
  el("roundingNote").textContent = "";
  for (const id of ["rawDownload", "historyDownload"]) {
    el(id).removeAttribute("href");
    el(id).setAttribute("aria-disabled", "true");
  }
  if (typeof Plotly !== "undefined") Plotly.purge("chartDiv");
  clearWorkspaceMarket();
  el("dashboard").setAttribute("aria-busy", "false");
}

async function loadHistory(market) {
  cancelHistory();
  const id = requestId;
  const report = activeReport;
  clearDisplay();
  setStatus(`Loading ${market.name}…`);
  el("dashboard").setAttribute("aria-busy", "true");
  controller = new AbortController();
  try {
    const key = `${report.id}/${market.path}`;
    let data = cache.get(key);
    if (!data) {
      data = await getJSON(dataURL(market.path), controller.signal);
      if (
        data.schema_version !== 2 ||
        data.code !== market.code ||
        data.report !== report.id ||
        !Array.isArray(data.records) ||
        !data.records.length
      )
        throw new Error("Invalid market history");
      // Bounded cache: browsing many contracts should not grow indefinitely.
      if (cache.size >= 12) cache.delete(cache.keys().next().value);
      cache.set(key, data);
    }
    if (id !== requestId) return;
    history = data.records;
    activeMarket = market;
    prepareMarketWorkspace();
    await renderMarket();
    if (id !== requestId) return;
    const warnings = [...report.warnings];
    if (!market.current)
      warnings.push(
        `Historical series: latest available ${market.last_date}; report family latest ${report.latest_report_date}.`,
      );
    const age =
      (Date.now() - Date.parse(`${report.latest_report_date}T00:00:00Z`)) /
      86400000;
    if (age > 14)
      warnings.push(
        `This report family's latest reference date is more than 14 days old (${report.latest_report_date}). Check the CFTC source.`,
      );
    setStatus(
      warnings.length
        ? warnings.join(" ")
        : "Official CFTC source · Separate contracts and report types · No market-name aggregation",
      warnings.length ? "warning" : "",
    );
  } catch (error) {
    if (error.name === "AbortError" || id !== requestId) return;
    console.error(error);
    clearDisplay();
    setStatus(
      "Unable to load this market. Refresh the page and try again; a publication may have just changed.",
      "error",
    );
  } finally {
    if (id === requestId) el("dashboard").setAttribute("aria-busy", "false");
  }
}

async function renderMarket() {
  const series = analysisHistory();
  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const summary = COTMath.summarize(series, activeReport.groups);
  const comparable = previous && previous.unit === latest.unit;
  el("selectedMarket").textContent =
    `${latest.name} · CFTC ${activeMarket.code}`;
  el("reportDescription").textContent = `${REPORT_NOTES[activeReport.family]} ${
    activeReport.combined
      ? "Combined positions include options converted to futures equivalents; they are not added to Futures Only data."
      : "Futures Only excludes options."
  }`;
  el("lastUpdate").textContent = latest.date;
  el("openInterest").textContent = format(latest.open_interest);
  el("comparisonDate").textContent = previous
    ? previous.date
    : "No earlier observation";
  el("unitLabel").textContent =
    `${activeReport.combined ? "Futures-equivalent contracts" : "Contracts"} · ${latest.unit}`;
  el("coverageText").textContent =
    `${history[0].date} — ${latest.date} · ${history.length} observations`;
  el("historyDownload").href = dataURL(activeMarket.path);
  el("rawDownload").href = dataURL(activeMarket.raw_path);
  el("historyDownload").removeAttribute("aria-disabled");
  el("rawDownload").removeAttribute("aria-disabled");
  el("kpiRow").replaceChildren();
  el("positionsBody").replaceChildren();
  activeReport.groups.forEach((group, index) => {
    const values = latest.groups[group.id];
    const delta = comparable
      ? change(values.net, previous.groups[group.id]?.net)
      : null;
    const card = node("article", "kpi");
    card.style.setProperty("--series", COLORS[index]);
    const top = node("div", "kpi-top");
    const title = node("h3", "kpi-title");
    const dot = node("span", "series-dot");
    dot.setAttribute("aria-hidden", "true");
    title.append(dot, document.createTextNode(group.label));
    top.append(
      title,
      node("span", "card-index", String(index + 1).padStart(2, "0")),
    );
    const bottom = node("div", "kpi-bottom");
    const difference = node("span", "kpi-change", format(delta, true));
    colorChange(difference, delta);
    bottom.append(
      difference,
      node("span", "comparison", "vs. previous observation"),
    );
    card.append(
      top,
      node(
        "p",
        "kpi-caption",
        activeReport.combined
          ? "NET / FUTURES EQUIVALENTS"
          : "NET POSITION / CONTRACTS",
      ),
      node("div", "kpi-value", format(values.net, true)),
      bottom,
    );
    const rank = summary.groups[group.id].windows[lookback()];
    card.append(
      node(
        "p",
        "card-context",
        `${lookback()}W percentile ${pct(rank.percentile)} · n=${rank.n}`,
      ),
    );
    el("kpiRow").appendChild(card);
    const row = node("tr");
    const label = node("th", "", group.label);
    label.scope = "row";
    row.appendChild(label);
    const share =
      finite(values.net) && latest.open_interest > 0
        ? (values.net / latest.open_interest) * 100
        : null;
    for (const value of [
      values.long,
      values.short,
      values.spreading,
      values.net,
      delta,
    ])
      row.appendChild(node("td", "", format(value)));
    row.appendChild(
      node("td", "", finite(share) ? `${share.toFixed(1)}%` : "—"),
    );
    el("positionsBody").appendChild(row);
  });
  const gap = previous
    ? (Date.parse(latest.date) - Date.parse(previous.date)) / 86400000
    : null;
  el("comparisonNote").textContent = previous
    ? `Changes compare ${latest.date} with the previous available observation (${previous.date}, ${gap} days earlier).${gap !== 7 ? " This is not a one-week comparison." : ""}${!comparable ? " Unit descriptions differ; changes are not calculated." : ""}`
    : "No previous observation is available; changes are not calculated.";
  const notes = [];
  if (Object.keys(latest.rounding_difference).length)
    notes.push(
      "The source contains small rounding differences in its component totals. Values are preserved as published.",
    );
  if (new Set(history.map((r) => r.unit)).size > 1)
    notes.push(
      "Source unit descriptions change within this history. Chart lines break at these boundaries; no unit conversion is applied. Review the original descriptions before comparing periods.",
    );
  el("roundingNote").textContent = notes.join(" ");
  renderWorkspaceMarket(series, summary);
  await drawChart();
}

function drawChart() {
  if (!history) return;
  const metric = el("metricSelect").value;
  const visible = chartHistory();
  const scaled = el("scaleSelect").value === "share";
  const points = [];
  visible.forEach((record, index) => {
    if (index && record.unit !== visible[index - 1].unit)
      points.push({ date: record.date, record: null });
    points.push({ date: record.date, record });
  });
  const dates = points.map((p) => p.date);
  const traces = activeReport.groups.map((group, index) => ({
    x: dates,
    y: points.map((p) =>
      p.record
        ? scaled
          ? COTMath.share(
              p.record.groups[group.id][metric],
              p.record.open_interest,
            )
          : p.record.groups[group.id][metric]
        : null,
    ),
    name: group.label,
    customdata: points.map((p) => p.record?.unit || ""),
    type: "scatter",
    mode: "lines",
    connectgaps: false,
    line: { color: COLORS[index], width: 2 },
    hovertemplate: scaled
      ? "%{y:.2f}% of OI<extra>%{fullData.name}</extra>"
      : "%{y:,.0f}<br>%{customdata}<extra>%{fullData.name}</extra>",
  }));
  if (el("showOI").checked)
    traces.push({
      x: dates,
      y: points.map((p) => p.record?.open_interest ?? null),
      name: "Open interest",
      yaxis: "y2",
      type: "scatter",
      mode: "lines",
      connectgaps: false,
      line: { color: "#a29aae", width: 1.5, dash: "dot" },
    });
  el("chartTitle").textContent =
    `${el("metricSelect").selectedOptions[0].textContent} positions over time`;
  el("chartDiv").setAttribute(
    "aria-label",
    `${el("metricSelect").selectedOptions[0].textContent} position history for ${activeMarket.name}`,
  );
  const mobile = window.innerWidth < 600;
  return Plotly.react(
    "chartDiv",
    traces,
    {
      paper_bgcolor: "#1b1825",
      plot_bgcolor: "#1b1825",
      font: {
        color: "#aaa3ba",
        family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        size: 10,
      },
      margin: {
        l: mobile ? 50 : 76,
        r: el("showOI").checked ? 65 : 20,
        t: mobile ? 110 : 90,
        b: 48,
      },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.25,
        font: { size: mobile ? 9 : 10 },
      },
      hoverlabel: {
        bgcolor: "#211d2d",
        bordercolor: "#524461",
        font: { color: "#eeeaf5" },
      },
      xaxis: {
        gridcolor: "#ffffff06",
        linecolor: "#ffffff10",
        zeroline: false,
        nticks: mobile ? 4 : 8,
      },
      yaxis: {
        gridcolor: "#ffffff08",
        zerolinecolor: "#c197ff33",
        tickformat: scaled ? ".1f" : "~s",
        ticksuffix: scaled ? "%" : "",
        fixedrange: true,
      },
      yaxis2: {
        overlaying: "y",
        side: "right",
        showgrid: false,
        title: "OI",
        tickformat: "~s",
        visible: el("showOI").checked,
      },
      hovermode: "x unified",
      autosize: true,
      uirevision: `${activeReport.id}/${activeMarket.code}/${metric}/${el("scaleSelect").value}/${el("rangeSelect").value}/${el("observationSelect").value}`,
    },
    { responsive: true, displayModeBar: false, scrollZoom: false },
  );
}

function changeReport(preferredCode) {
  preferredCode =
    typeof preferredCode === "string"
      ? preferredCode
      : activeMarket?.code || workspaceState.initialMarket;
  workspaceState.initialMarket = null;
  activeReport = catalog.reports.find((r) => r.id === el("reportSelect").value);
  el("marketSearch").value = "";
  el("reportDescription").textContent = REPORT_NOTES[activeReport.family];
  el("sourceLabel").textContent = `Source: CFTC · ${activeReport.label}`;
  setupReportWorkspace(activeReport);
  updateMarkets(preferredCode);
}

async function initialize() {
  try {
    catalog = await getJSON("./data/catalog.json");
    if (
      catalog.schema_version !== 2 ||
      !Array.isArray(catalog.reports) ||
      !catalog.reports.length
    )
      throw new Error("Invalid COT catalog");
    if (typeof Plotly === "undefined")
      throw new Error("Chart library could not be loaded");
    el("reportSelect").replaceChildren();
    for (const report of catalog.reports) {
      const option = node("option", "", report.label);
      option.value = report.id;
      el("reportSelect").appendChild(option);
    }
    el("dataCoverage").textContent =
      `${catalog.reports.length} report types · ${catalog.years.join(" / ")}`;
    el("generatedAt").textContent = new Date(
      catalog.generated_at,
    ).toLocaleString();
    el("reportSelect").disabled = false;
    el("marketSearch").disabled = false;
    el("reportSelect").addEventListener("change", () => changeReport());
    el("assetSelect").addEventListener("change", () =>
      loadHistory(
        activeReport.markets.find((m) => m.code === el("assetSelect").value),
      ),
    );
    el("metricSelect").addEventListener("change", () => {
      updateURL();
      Promise.resolve(drawChart()).catch((error) => {
        console.error(error);
        setStatus(
          "Unable to draw the chart. Please refresh the page.",
          "error",
        );
      });
    });
    el("latestOnly").addEventListener("change", () =>
      updateMarkets(activeMarket?.code),
    );
    el("marketSearch").addEventListener("input", () =>
      updateMarkets(activeMarket?.code),
    );
    initializeWorkspace();
    changeReport();
  } catch (error) {
    console.error(error);
    setStatus(
      "Unable to load COT data. Please refresh the page or check the latest GitHub Actions build.",
      "error",
    );
  }
}

document.addEventListener("DOMContentLoaded", initialize);
