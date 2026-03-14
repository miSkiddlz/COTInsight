const assetSelect = document.getElementById("assetSelect");
const traderSelect = document.getElementById("traderSelect");
const chartDiv = document.getElementById("chart");

// Lädt alle Assets aus Backend und füllt das Dropdown
async function loadAssets() {
    const res = await fetch("/assets");
    const assets = await res.json();
    assets.forEach(asset => {
        let option = document.createElement("option");
        option.value = asset;
        option.text = asset;
        assetSelect.add(option);
    });
}

// Lädt alle Trader-Typen aus Backend und füllt das Dropdown
async function loadTraders() {
    const res = await fetch("/traders");
    const traders = await res.json();
    traders.forEach(trader => {
        let option = document.createElement("option");
        option.value = trader;
        option.text = trader;
        traderSelect.add(option);
    });
}

// Lädt Chart-Daten für gewähltes Asset + Trader-Typ
async function loadChart() {
    const asset = assetSelect.value;
    const trader = traderSelect.value;
    const res = await fetch(`/data?asset=${asset}&trader=${trader}`);
    const data = await res.json();

    if (data.length === 0) {
        chartDiv.innerHTML = 'No data found for this selection.';
        return;
    }

    const dates = data.map(d => d.Date);
    const net_position = data.map(d => d.Net_Position);

    const trace = {
        x: dates,
        y: net_position,
        type: 'scatter'
    };

    Plotly.newPlot(chartDiv, [trace], {title: `${asset} - ${trader} Net Position`});
}

// Event-Listener für Dropdown-Wechsel
assetSelect.addEventListener("change", loadChart);
traderSelect.addEventListener("change", loadChart);

// Initialisierung: Assets, Trader, Chart
Promise.all([loadAssets(), loadTraders()]).then(loadChart);
