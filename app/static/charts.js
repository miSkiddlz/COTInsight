async function loadCOTData() {
    const res = await fetch('/api/cot_data');
    const data = await res.json();
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
    return sign + "$" + value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatChange(value) {
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "";
    const sign = value > 0 ? "+" : "";
    return `${arrow} ${sign}$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function applyColor(element, value) {
    if (value > 0) element.style.color = "#22c55e";
    else if (value < 0) element.style.color = "#ef4444";
    else element.style.color = "#e5e7eb";
}

function populateDropdowns(data) {
    const assetSelect = document.getElementById("assetSelect");
    const assets = [...new Set(data.map(d => d.market_and_exchange_names))].sort();

    assets.forEach(a => {
        const option = document.createElement("option");
        option.value = a;
        option.textContent = getReadableName(a);
        assetSelect.appendChild(option);
    });
}

function plotData(data, asset) {
    const filtered = data.filter(d => d.market_and_exchange_names === asset);

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
        { x: dates, y: commercial, type: 'scatter', mode: 'lines', name: 'Comm', line: { color: '#3b82f6' } },
        { x: dates, y: noncommercial, type: 'scatter', mode: 'lines', name: 'Non-Comm', line: { color: '#f97316' } },
        { x: dates, y: nonreportable, type: 'scatter', mode: 'lines', name: 'Retail', line: { color: '#22c55e' } }
    ];

    Plotly.newPlot('chartDiv', traces, {
        paper_bgcolor: '#111827',
        plot_bgcolor: '#111827',
        font: { color: '#e5e7eb' },
        hovermode: 'x unified'
    });

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
    applyColor(commEl, values.comm);
    applyColor(nonCommEl, values.nonComm);
    applyColor(retailEl, values.retail);

    applyColor(commChEl, changes.comm);
    applyColor(nonCommChEl, changes.nonComm);
    applyColor(retailChEl, changes.retail);

    document.getElementById("lastUpdate").textContent = dates[last];
}

document.addEventListener("DOMContentLoaded", async () => {
    const data = await loadCOTData();
    if (!data || data.length === 0) return;

    populateDropdowns(data);

    const assetSelect = document.getElementById("assetSelect");

    function updatePlot() {
        plotData(data, assetSelect.value);
    }

    assetSelect.addEventListener("change", updatePlot);

    assetSelect.selectedIndex = 0;
    updatePlot();
});
