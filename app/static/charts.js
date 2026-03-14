const assetSelect = document.getElementById("assetSelect");
const traderSelect = document.getElementById("traderSelect");
const chartDiv = document.getElementById("chartDiv");

let cotData = [];
let assets = [];
let traders = [];

async function loadData() {
    const res = await fetch("/api/cot_data");
    cotData = await res.json();

    if(cotData.rows === 0) {
        chartDiv.innerHTML = "Keine Daten verfügbar";
        return;
    }

    // alle Assets extrahieren
    assets = [...new Set(cotData.map(d => d.commodity_name))];
    assets.sort();
    assetSelect.innerHTML = assets.map(a => `<option value="${a}">${a}</option>`).join("");

    // alle Trader-Gruppen extrahieren
    traders = Object.keys(cotData[0]).filter(k => k.includes("open_interest"));
    traderSelect.innerHTML = traders.map(t => `<option value="${t}">${t}</option>`).join("");

    updateChart();
}

function updateChart() {
    const asset = assetSelect.value;
    const trader = traderSelect.value;

    const filtered = cotData.filter(d => d.commodity_name === asset);

    const trace = {
        x: filtered.map(d => d.report_date),
        y: filtered.map(d => +d[trader] || 0),
        type: 'scatter',
        mode: 'lines+markers',
        name: trader
    };

    Plotly.newPlot(chartDiv, [trace], {title: `${asset} - ${trader}`});
}

assetSelect.addEventListener("change", updateChart);
traderSelect.addEventListener("change", updateChart);

loadData();
