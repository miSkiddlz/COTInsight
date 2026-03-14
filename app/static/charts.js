// charts.js (angepasst)
async function loadChart() {
    const asset = assetSelect.value;
    const res = await fetch(`/data?asset=${asset}`);
    const data = await res.json();

    if (data.length === 0) {
        chartDiv.innerHTML = 'No data found for this selection.';
        return;
    }

    const traces = [];
    const traderGroups = [...new Set(data.map(d => d.Trader_Type))];

    traderGroups.forEach(trader => {
        const traderData = data.filter(d => d.Trader_Type === trader);
        traces.push({
            x: traderData.map(d => d.Date),
            y: traderData.map(d => d.Net_Position),
            type: 'scatter',
            name: trader
        });
    });

    Plotly.newPlot(chartDiv, traces, {title: `${asset} - Net Positions`});
}
