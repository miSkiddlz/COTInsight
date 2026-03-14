const assetSelect = document.getElementById("assetSelect");
const traderSelect = document.getElementById("traderSelect");
const chartDiv = document.getElementById("chart");

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

async function loadChart() {
    const asset = assetSelect.value;
    const trader = traderSelect.value;
    const res = await fetch(`/data?asset=${asset}&trader=${trader}`);
    const data = await res.json();

    if (!data.positions) {
        chartDiv.innerHTML = 'No data found.';
        return;
    }

    const allData = data.positions.find(d => d.category === "All");
    if (!allData) {
        chartDiv.innerHTML = 'No positions found.';
        return;
    }

    const values = allData.values;
    const dates = values.map((v,i) => i); 

    const trace = { x: dates, y: values, type: 'scatter' };
    Plotly.newPlot(chartDiv, [trace], {title: `${asset} - ${trader} Positions`});
}

assetSelect.addEventListener("change", loadChart);
traderSelect.addEventListener("change", loadChart);

Promise.all([loadAssets(), loadTraders()]).then(loadChart);
