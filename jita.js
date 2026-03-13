const REGION = 10000002
const JITA = 60003760

async function getOrders(typeID){

    const url = `https://esi.evetech.net/latest/markets/${REGION}/orders/?type_id=${typeID}`

    const r = await fetch(url)

    return r.json()
}

function analyzeOrders(orders){

    let bestBuy = 0
    let bestSell = Infinity
    let volume = 0

    orders.forEach(o=>{

        if(o.location_id !== JITA) return

        if(o.is_buy_order){
            if(o.price > bestBuy) bestBuy = o.price
        }else{
            if(o.price < bestSell) bestSell = o.price
        }

        volume += o.volume_remain
    })

    if(bestSell === Infinity) return null

    let margin = ((bestSell - bestBuy)/bestBuy)*100

    return {bestBuy,bestSell,margin,volume}
}

function addRow(name,data){

    const row = document.createElement("tr")

    row.innerHTML = `
<td>${name}</td>
<td>${data.bestBuy.toFixed(2)}</td>
<td>${data.bestSell.toFixed(2)}</td>
<td>${data.margin.toFixed(1)}%</td>
<td>${data.volume}</td>
`

    document.querySelector("#tradeTable tbody").appendChild(row)
}

async function run(){

    const items = [
        {id:34,name:"Tritanium"},
        {id:35,name:"Pyerite"},
        {id:36,name:"Mexallon"},
        {id:37,name:"Isogen"},
        {id:38,name:"Nocxium"},
        {id:39,name:"Zydrine"},
        {id:40,name:"Megacyte"},
        {id:44992,name:"PLEX"},

    ]
    const compressedOres = [

        { id:28432, name:"Compressed Veldspar" },
        { id:28433, name:"Compressed Scordite" },
        { id:28434, name:"Compressed Pyroxeres" },
        { id:28435, name:"Compressed Plagioclase" },
        { id:28436, name:"Compressed Omber" },
        { id:28437, name:"Compressed Kernite" },
        { id:28438, name:"Compressed Jaspet" },
        { id:28439, name:"Compressed Hemorphite" },
        { id:28440, name:"Compressed Hedbergite" }

    ]

    document.querySelector("#tradeTable tbody").innerHTML=""

    for(const item of items){

        const orders = await getOrders(item.id)

        const data = analyzeOrders(orders)

        if(data) addRow(item.name,data)
    }
}
async function runCompressedOre(){

    const compressedOres = [

        { id:28432, name:"Compressed Veldspar" },
        { id:28433, name:"Compressed Scordite" },
        { id:28434, name:"Compressed Pyroxeres" },
        { id:28435, name:"Compressed Plagioclase" },
        { id:28436, name:"Compressed Omber" },
        { id:28437, name:"Compressed Kernite" },
        { id:28438, name:"Compressed Jaspet" },
        { id:28439, name:"Compressed Hemorphite" },
        { id:28440, name:"Compressed Hedbergite" }

    ]

    document.querySelector("#oreTable tbody").innerHTML=""

    for(const ore of compressedOres){

        const orders = await getOrders(ore.id)

        const data = analyzeOrders(orders)

        if(!data) continue

        const row = document.createElement("tr")

        row.innerHTML = `
<td>${ore.name}</td>
<td>${data.bestBuy.toFixed(2)}</td>
<td>${data.bestSell.toFixed(2)}</td>
<td>${data.margin.toFixed(1)}%</td>
<td>${data.volume}</td>
`

        document.querySelector("#oreTable tbody").appendChild(row)
    }
}

run()
runCompressedOre()