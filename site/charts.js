async function loadCOTData() {
    const res = await fetch('./data/cot_data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Data request failed (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No COT data available");
    return data;
}

const MARKET_LABELS = {
    "S&P 500": "S&P 500",
    "NASDAQ": "Nasdaq",
    "GOLD": "Gold",
    "CRUDE OIL": "Crude Oil",
    "EURO": "Euro"
};

function getReadableName(rawName) {
    for (const key in MARKET_LABELS) {
        if (rawName.includes(key)) {
            return MARKET_LABELS[key];
        }
    }
    return rawName;
}

function formatKPI(value) {
    const sign = value > 0 ? "+" : "";
    return sign + value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatChange(value) {
    if (!Number.isFinite(value)) return "—";
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "";
    const sign = value > 0 ? "+" : "";
    return `${arrow} ${sign}${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function applyColor(element, value) {
    if (value > 0) element.style.color = "var(--positive)";
    else if (value < 0) element.style.color = "var(--negative)";
    else element.style.color = "var(--text)";
}

function populateDropdowns(data) {
    const assetSelect = document.getElementById("assetSelect");
    const assets = [...new Set(data.map(d => d.market_and_exchange_names))].sort();

    assetSelect.replaceChildren();
    assets.forEach(a => {
        const option = document.createElement("option");
        option.value = a;
        option.textContent = getReadableName(a);
        assetSelect.appendChild(option);
    });
}

function plotData(data, asset) {
    const filtered = data.filter(d => d.market_and_exchange_names === asset)
        .sort((a, b) => a.report_date_as_yyyymmdd.localeCompare(b.report_date_as_yyyymmdd));

    const dates = filtered.map(d => d.report_date_as_yyyymmdd);

    const commercial = filtered.map(d =>
        Number(d.commercial_positions_long_all) - Number(d.commercial_positions_short_all)
    );

    const noncommercial = filtered.map(d =>
        Number(d.noncommercial_positions_long_all) - Number(d.noncommercial_positions_short_all)
    );

    const nonreportable = filtered.map(d =>
        Number(d.nonreportable_positions_long_all) - Number(d.nonreportable_positions_short_all)
    );

    const traces = [
        { x: dates, y: commercial, type: 'scatter', mode: 'lines', name: 'Commercials', line: { color: '#ffb98b', width: 2 } },
        { x: dates, y: noncommercial, type: 'scatter', mode: 'lines', name: 'Non-Commercials', line: { color: '#c197ff', width: 2 } },
        { x: dates, y: nonreportable, type: 'scatter', mode: 'lines', name: 'Retail', line: { color: '#8ed9c4', width: 2 } }
    ];

    Plotly.newPlot('chartDiv', traces, {
        paper_bgcolor: '#1b1825',
        plot_bgcolor: '#1b1825',
        font: { color: '#aaa3ba', family: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', size: 10 },
        margin: { l: window.innerWidth < 600 ? 50 : 76, r: 20, t: 55, b: 48 },
        legend: { orientation: 'h', x: 0, y: 1.13, font: { size: 10 } },
        hoverlabel: { bgcolor: '#211d2d', bordercolor: '#524461', font: { color: '#eeeaf5' } },
        xaxis: { gridcolor: '#ffffff06', linecolor: '#ffffff10', zeroline: false, nticks: window.innerWidth < 600 ? 4 : 8 },
        hovermode: 'x unified',
        yaxis: { gridcolor: '#ffffff08', zerolinecolor: '#c197ff33', tickformat: '~s', fixedrange: true },
        autosize: true
    }, { responsive: true, displayModeBar: false, scrollZoom: false });

    // KPI LOGIC
    const last = filtered.length - 1;
    const prev = filtered.length - 2;

    const values = {
        comm: commercial[last],
        nonComm: noncommercial[last],
        retail: nonreportable[last]
    };

    const changes = {
        comm: commercial[last] - commercial[prev],
        nonComm: noncommercial[last] - noncommercial[prev],
        retail: nonreportable[last] - nonreportable[prev]
    };

    // Elements
    const commEl = document.getElementById("kpiComm");
    const nonCommEl = document.getElementById("kpiNonComm");
    const retailEl = document.getElementById("kpiRetail");

    const commChEl = document.getElementById("kpiCommChange");
    const nonCommChEl = document.getElementById("kpiNonCommChange");
    const retailChEl = document.getElementById("kpiRetailChange");

    // Set values
    commEl.textContent = formatKPI(values.comm);
    nonCommEl.textContent = formatKPI(values.nonComm);
    retailEl.textContent = formatKPI(values.retail);

    commChEl.textContent = formatChange(changes.comm);
    nonCommChEl.textContent = formatChange(changes.nonComm);
    retailChEl.textContent = formatChange(changes.retail);

    // Colors
    // Keep headline values neutral; reserve directional colors for changes.

    applyColor(commChEl, changes.comm);
    applyColor(nonCommChEl, changes.nonComm);
    applyColor(retailChEl, changes.retail);

    document.getElementById("lastUpdate").textContent = dates[last];
    document.getElementById("selectedMarket").textContent = asset;
}

document.addEventListener("DOMContentLoaded", async () => {
    const status = document.getElementById("dataStatus");
    try {
        const data = await loadCOTData();
        if (typeof Plotly === "undefined") throw new Error("Chart library could not be loaded");

        populateDropdowns(data);

        const assetSelect = document.getElementById("assetSelect");

        function updatePlot() {
            plotData(data, assetSelect.value);
        }

        assetSelect.addEventListener("change", updatePlot);

        assetSelect.disabled = false;
        assetSelect.selectedIndex = 0;
        updatePlot();
        status.textContent = "Net positions in contracts · Changes compared with the previous report";
    } catch (error) {
        console.error(error);
        status.dataset.state = "error";
        status.textContent = "Unable to load the dashboard. Please try again later.";
    }
});
