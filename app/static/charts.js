async function loadCOTData() {
    const res = await fetch('/api/cot_data');
    const data = await res.json();
    return data;
}

// 🔥 Mapping für verständliche Namen
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
        {
            x: dates,
            y: commercial,
            type: 'scatter',
            mode: 'lines',
            name: 'Commercials'
        },
        {
            x: dates,
            y: noncommercial,
            type: 'scatter',
            mode: 'lines',
            name: 'Non-Commercials'
        },
        {
            x: dates,
            y: nonreportable,
            type: 'scatter',
            mode: 'lines',
            name: 'Retail (Nonreportable)'
        }
    ];

    Plotly.newPlot('chartDiv', traces, {
        title: getReadableName(asset) + " - COT Net Positions",
        xaxis: { title: 'Date' },
        yaxis: { title: 'Net Position' }
    });
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
