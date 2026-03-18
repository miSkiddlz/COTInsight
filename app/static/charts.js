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
            name: 'Commercials',
            line: { color: '#3b82f6', width: 2 }
        },
        {
            x: dates,
            y: noncommercial,
            type: 'scatter',
            mode: 'lines',
            name: 'Non-Commercials',
            line: { color: '#f97316', width: 2 }
        },
        {
            x: dates,
            y: nonreportable,
            type: 'scatter',
            mode: 'lines',
            name: 'Retail (Nonreportable)',
            line: { color: '#22c55e', width: 2 }
        }
    ];

    const layout = {
        title: {
            text: getReadableName(asset) + " - COT Net Positions",
            font: { size: 20 }
        },

        paper_bgcolor: '#111827',
        plot_bgcolor: '#111827',
        font: { color: '#e5e7eb' },

        xaxis: {
            title: 'Date',
            gridcolor: '#374151',
            zerolinecolor: '#374151',

            rangeselector: {
                buttons: [
                    { count: 3, step: 'month', stepmode: 'backward', label: '3m' },
                    { count: 6, step: 'month', stepmode: 'backward', label: '6m' },
                    { count: 1, step: 'year', stepmode: 'backward', label: '1y' },
                    { step: 'all', label: 'All' }
                ]
            }
        },

        yaxis: {
            title: 'Net Position',
            gridcolor: '#374151',
            zerolinecolor: '#374151'
        },

        legend: {
            orientation: 'h',
            y: -0.2
        },

        hovermode: 'x unified'
    };

    Plotly.newPlot('chartDiv', traces, layout, { responsive: true });
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
