const assetSelect = document.getElementById("assetSelect");
const chartDiv = document.getElementById("chart");


async function loadAssets(){

const res = await fetch("/assets")

const assets = await res.json()

assets.forEach(asset => {

let option = document.createElement("option")

option.value = asset
option.text = asset

assetSelect.add(option)

})

}

async function loadChart(){

const asset = assetSelect.value

const res = await fetch(`/data?asset=${asset}`)

const data = await res.json()

if(data.length === 0){

chartDiv.innerHTML="No data"

return

}

const groups = {}

data.forEach(d=>{

if(!groups[d.Trader_Type]){

groups[d.Trader_Type]={
x:[],
y:[]
}

}

groups[d.Trader_Type].x.push(d.Date)
groups[d.Trader_Type].y.push(d.Net_Position)

})

const traces=[]

for(const trader in groups){

traces.push({

x:groups[trader].x,
y:groups[trader].y,
mode:"lines",
name:trader

})

}

Plotly.newPlot(chartDiv,traces,{title:asset+" COT Net Positions"})

}

assetSelect.addEventListener("change",loadChart)

loadAssets().then(loadChart)
