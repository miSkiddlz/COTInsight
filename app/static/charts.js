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

async function loadChart() {
    const asset = assetSelect.value;
    const trader = traderSelect.value;
    const res = await fetch(`/data?asset=${asset}&trader=${trader}`);
    const data = await res.json();

    const trace = {
        x: data.dates,
        y: data.net_position,
        type: 'scatter'
    };

    Plotly.newPlot(chartDiv, [trace], {title: `${asset} - ${trader} Net Position`});
}

assetSelect.addEventListener("change", loadChart);
traderSelect.addEventListener("change", loadChart);

loadAssets().then(loadChart);
