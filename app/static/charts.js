async function loadCOTData() {
    const res = await fetch('/api/cot_data');
    const data = await res.json();
    return data;
}

function populateDropdowns(data) {
    const assetSelect = document.getElementById("assetSelect");
    const assets = [...new Set(data.map(d => d.market_and_exchange_names))].sort();
    assets.forEach(a => {
        const option = document.createElement("option");
        option.value = a;
        option.textContent = a;
        assetSelect.appendChild(option);
    });
}

function plotData(data, asset, trader) {
    const filtered = data.filter(d => d.market_and_exchange_names === asset);
    const dates = filtered.map(d => d.report_date_as_yyyymmdd);
    const values = filtered.map(d => {
        if (trader === "commercial") return Number(d.commercial_positions_long_all) - Number(d.commercial_positions_short_all);
        else return Number(d.noncommercial_positions_long_all) - Number(d.noncommercial_positions_short_all);
    });

    const trace = {
        x: dates,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        name: trader
    };

    Plotly.newPlot('chartDiv', [trace]);
}

document.addEventListener("DOMContentLoaded", async () => {
    const data = await loadCOTData();
    if (!data || data.length === 0) return;

    populateDropdowns(data);

    const assetSelect = document.getElementById("assetSelect");
    const traderSelect = document.getElementById("traderSelect");

    function updatePlot() {
        plotData(data, assetSelect.value, traderSelect.value);
    }

    assetSelect.addEventListener("change", updatePlot);
    traderSelect.addEventListener("change", updatePlot);

    assetSelect.selectedIndex = 0;
    updatePlot();
});
