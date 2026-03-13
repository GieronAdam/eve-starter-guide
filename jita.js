const REGION = 10000002;
const JITA = 60003760;

// ------------------------------------
// BASIC ITEM LIST FOR JITA SCANNER
// ------------------------------------

const tradeItems = [
    { id: 34, name: "Tritanium" },
    { id: 35, name: "Pyerite" },
    { id: 36, name: "Mexallon" },
    { id: 37, name: "Isogen" },
    { id: 38, name: "Nocxium" },
    { id: 39, name: "Zydrine" },
    { id: 40, name: "Megacyte" },
    { id: 44992, name: "PLEX" },
    { id: 44993, name: "Multiple Pilot Training Certificate" },
    { id: 16274, name: "Large Skill Injector" },
    { id: 40520, name: "Small Skill Injector" }
];

// ------------------------------------
// COMPRESSED BELT ORES
// ------------------------------------

const compressedOres = [
    { id: 28432, name: "Compressed Veldspar", key: "CompressedVeldspar" },
    { id: 28433, name: "Compressed Scordite", key: "CompressedScordite" },
    { id: 28434, name: "Compressed Pyroxeres", key: "CompressedPyroxeres" },
    { id: 28435, name: "Compressed Plagioclase", key: "CompressedPlagioclase" },
    { id: 28436, name: "Compressed Omber", key: "CompressedOmber" },
    { id: 28437, name: "Compressed Kernite", key: "CompressedKernite" },
    { id: 28438, name: "Compressed Jaspet", key: "CompressedJaspet" },
    { id: 28439, name: "Compressed Hemorphite", key: "CompressedHemorphite" },
    { id: 28440, name: "Compressed Hedbergite", key: "CompressedHedbergite" }
];

// ------------------------------------
// MINERAL TYPE IDS
// ------------------------------------

const mineralIDs = {
    Tritanium: 34,
    Pyerite: 35,
    Mexallon: 36,
    Isogen: 37,
    Nocxium: 38,
    Zydrine: 39,
    Megacyte: 40
};

// ------------------------------------
// ORE COMPOSITION
// Uproszczone wartości do kalkulatora.
// Jeśli później będziesz chciał, można
// to doprecyzować per typ rudy.
// ------------------------------------

const oreComposition = {
    CompressedVeldspar: {
        oreID: 28432,
        displayName: "Compressed Veldspar",
        minerals: {
            Tritanium: 415
        }
    },

    CompressedScordite: {
        oreID: 28433,
        displayName: "Compressed Scordite",
        minerals: {
            Tritanium: 346,
            Pyerite: 173
        }
    },

    CompressedPyroxeres: {
        oreID: 28434,
        displayName: "Compressed Pyroxeres",
        minerals: {
            Tritanium: 351,
            Pyerite: 25,
            Mexallon: 50
        }
    },

    CompressedPlagioclase: {
        oreID: 28435,
        displayName: "Compressed Plagioclase",
        minerals: {
            Tritanium: 107,
            Pyerite: 214,
            Mexallon: 107
        }
    },

    CompressedOmber: {
        oreID: 28436,
        displayName: "Compressed Omber",
        minerals: {
            Tritanium: 90,
            Pyerite: 45,
            Isogen: 45
        }
    },

    CompressedKernite: {
        oreID: 28437,
        displayName: "Compressed Kernite",
        minerals: {
            Tritanium: 134,
            Mexallon: 134,
            Isogen: 67
        }
    },

    CompressedJaspet: {
        oreID: 28438,
        displayName: "Compressed Jaspet",
        minerals: {
            Pyerite: 259,
            Mexallon: 259,
            Nocxium: 8
        }
    },

    CompressedHemorphite: {
        oreID: 28439,
        displayName: "Compressed Hemorphite",
        minerals: {
            Tritanium: 212,
            Isogen: 212,
            Nocxium: 28,
            Zydrine: 6
        }
    },

    CompressedHedbergite: {
        oreID: 28440,
        displayName: "Compressed Hedbergite",
        minerals: {
            Pyerite: 323,
            Isogen: 65,
            Nocxium: 32,
            Zydrine: 6
        }
    }
};

// ------------------------------------
// CACHE
// ------------------------------------

const orderCache = new Map();
let latestOreMarketData = {};
let latestMineralPrices = {};

// ------------------------------------
// HELPERS
// ------------------------------------

function formatNumber(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "-";
    }

    return Number(value).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

function formatVolume(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "-";
    }

    return Number(value).toLocaleString("en-US");
}

function setTableMessage(tableSelector, colSpan, message) {
    const tbody = document.querySelector(`${tableSelector} tbody`);
    if (!tbody) return;

    tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}">${message}</td>
    </tr>
  `;
}

// ------------------------------------
// API
// ------------------------------------

async function getOrders(typeID) {
    if (orderCache.has(typeID)) {
        return orderCache.get(typeID);
    }

    const url = `https://esi.evetech.net/latest/markets/${REGION}/orders/?order_type=all&type_id=${typeID}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load market orders for type ${typeID}`);
    }

    const data = await response.json();
    orderCache.set(typeID, data);

    return data;
}

function analyzeOrders(orders) {
    let bestBuy = 0;
    let bestSell = Infinity;
    let volume = 0;

    for (const order of orders) {
        if (order.location_id !== JITA) continue;

        if (order.is_buy_order) {
            if (order.price > bestBuy) bestBuy = order.price;
        } else {
            if (order.price < bestSell) bestSell = order.price;
        }

        volume += order.volume_remain;
    }

    if (bestBuy <= 0 || bestSell === Infinity) {
        return null;
    }

    const margin = ((bestSell - bestBuy) / bestBuy) * 100;

    return {
        bestBuy,
        bestSell,
        margin,
        volume
    };
}

// ------------------------------------
// JITA TRADE TABLE
// ------------------------------------

async function runTradeScanner() {
    const tbody = document.querySelector("#tradeTable tbody");
    if (!tbody) return;

    setTableMessage("#tradeTable", 5, "Loading market data...");

    try {
        const results = [];

        for (const item of tradeItems) {
            const orders = await getOrders(item.id);
            const data = analyzeOrders(orders);

            if (!data) continue;

            results.push({
                name: item.name,
                bestBuy: data.bestBuy,
                bestSell: data.bestSell,
                margin: data.margin,
                volume: data.volume,
                score: data.margin * Math.log10(data.volume + 10)
            });
        }

        results.sort((a, b) => b.score - a.score);

        tbody.innerHTML = "";

        if (!results.length) {
            setTableMessage("#tradeTable", 5, "No Jita trade data available.");
            return;
        }

        for (const item of results.slice(0, 20)) {
            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${item.name}</td>
        <td>${formatNumber(item.bestBuy)}</td>
        <td>${formatNumber(item.bestSell)}</td>
        <td>${formatNumber(item.margin, 1)}%</td>
        <td>${formatVolume(item.volume)}</td>
      `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        setTableMessage("#tradeTable", 5, "Could not load Jita market data.");
    }
}

// ------------------------------------
// COMPRESSED ORE TABLE
// ------------------------------------

async function runCompressedOre() {
    const tbody = document.querySelector("#oreTable tbody");
    if (!tbody) return;

    setTableMessage("#oreTable", 5, "Loading ore market...");

    try {
        const results = [];

        for (const ore of compressedOres) {
            const orders = await getOrders(ore.id);
            const data = analyzeOrders(orders);

            if (!data) continue;

            latestOreMarketData[ore.key] = {
                bestBuy: data.bestBuy,
                bestSell: data.bestSell,
                margin: data.margin,
                volume: data.volume
            };

            results.push({
                name: ore.name,
                key: ore.key,
                bestBuy: data.bestBuy,
                bestSell: data.bestSell,
                margin: data.margin,
                volume: data.volume
            });
        }

        results.sort((a, b) => b.margin - a.margin);

        tbody.innerHTML = "";

        if (!results.length) {
            setTableMessage("#oreTable", 5, "No compressed ore data available.");
            return;
        }

        for (const ore of results) {
            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${ore.name}</td>
        <td>${formatNumber(ore.bestBuy)}</td>
        <td>${formatNumber(ore.bestSell)}</td>
        <td>${formatNumber(ore.margin, 1)}%</td>
        <td>${formatVolume(ore.volume)}</td>
      `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        setTableMessage("#oreTable", 5, "Could not load compressed ore market data.");
    }
}

// ------------------------------------
// MINERAL PRICES
// ------------------------------------

async function getMineralPrices() {
    const prices = {};

    for (const mineralName in mineralIDs) {
        const typeID = mineralIDs[mineralName];
        const orders = await getOrders(typeID);
        const data = analyzeOrders(orders);

        if (data) {
            prices[mineralName] = data.bestBuy;
        }
    }

    latestMineralPrices = prices;
    return prices;
}

// ------------------------------------
// REFINING SETTINGS
// ------------------------------------

function getRefiningSettings() {
    const refiningSkill = Number(document.getElementById("refiningSkill")?.value || 0);
    const efficiencySkill = Number(document.getElementById("efficiencySkill")?.value || 0);
    const oreSkill = Number(document.getElementById("oreSkill")?.value || 0);
    const facilityBonus = Number(document.getElementById("facilityBonus")?.value || 0.5);
    const taxRate = Number(document.getElementById("taxRate")?.value || 0);

    return {
        refiningSkill,
        efficiencySkill,
        oreSkill,
        facilityBonus,
        taxRate
    };
}

// Uproszczony model:
// base facility * skill multipliers * tax reduction
function calculateRefineYield(settings) {
    const refiningMultiplier = 1 + 0.03 * settings.refiningSkill;
    const efficiencyMultiplier = 1 + 0.02 * settings.efficiencySkill;
    const oreMultiplier = 1 + 0.02 * settings.oreSkill;

    const grossYield =
        settings.facilityBonus *
        refiningMultiplier *
        efficiencyMultiplier *
        oreMultiplier;

    const taxMultiplier = 1 - settings.taxRate / 100;

    return grossYield * taxMultiplier;
}

// ------------------------------------
// REFINE CALCULATOR
// ------------------------------------

function calculateOreMineralValue(oreKey, mineralPrices, settings) {
    const ore = oreComposition[oreKey];
    if (!ore) return 0;

    const refineYield = calculateRefineYield(settings);

    let total = 0;

    for (const mineralName in ore.minerals) {
        const baseQty = ore.minerals[mineralName];
        const mineralPrice = mineralPrices[mineralName] || 0;

        total += baseQty * refineYield * mineralPrice;
    }

    return total;
}

function buildProfitClass(profit) {
    if (profit > 0) return ' style="color:#22c55e;font-weight:bold;"';
    if (profit < 0) return ' style="color:#ef4444;font-weight:bold;"';
    return "";
}

async function runRefineCalculator() {
    const tbody = document.querySelector("#refineTable tbody");
    if (!tbody) return;

    setTableMessage("#refineTable", 4, "Loading refine data...");

    try {
        const settings = getRefiningSettings();

        if (!Object.keys(latestOreMarketData).length) {
            await runCompressedOre();
        }

        if (!Object.keys(latestMineralPrices).length) {
            await getMineralPrices();
        }

        const rows = [];

        for (const oreKey in oreComposition) {
            const oreInfo = oreComposition[oreKey];
            const market = latestOreMarketData[oreKey];

            if (!market) continue;

            const orePrice = market.bestBuy;
            const mineralValue = calculateOreMineralValue(
                oreKey,
                latestMineralPrices,
                settings
            );

            const profit = mineralValue - orePrice;

            rows.push({
                name: oreInfo.displayName,
                orePrice,
                mineralValue,
                profit
            });
        }

        rows.sort((a, b) => b.profit - a.profit);

        tbody.innerHTML = "";

        if (!rows.length) {
            setTableMessage("#refineTable", 4, "No refine data available.");
            return;
        }

        for (const rowData of rows) {
            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${rowData.name}</td>
        <td>${formatNumber(rowData.orePrice)}</td>
        <td>${formatNumber(rowData.mineralValue)}</td>
        <td${buildProfitClass(rowData.profit)}>${formatNumber(rowData.profit)}</td>
      `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        setTableMessage("#refineTable", 4, "Could not calculate refining profit.");
    }
}

// ------------------------------------
// EVENTS
// ------------------------------------

function bindRefineInputs() {
    const ids = [
        "refiningSkill",
        "efficiencySkill",
        "oreSkill",
        "facilityBonus",
        "taxRate"
    ];

    for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) continue;

        element.addEventListener("change", () => {
            runRefineCalculator();
        });

        element.addEventListener("input", () => {
            runRefineCalculator();
        });
    }
}

// ------------------------------------
// INIT
// ------------------------------------

async function initJitaPage() {
    await runTradeScanner();
    await runCompressedOre();
    await getMineralPrices();
    await runRefineCalculator();
    bindRefineInputs();
}

initJitaPage();