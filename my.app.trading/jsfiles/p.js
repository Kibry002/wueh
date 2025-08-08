// --- Hardcoded API token ---
const API_TOKEN = "hOopTxxPwF2E3Vy";
const SYMBOLS = [
  "1HZ10V", "R_10", "1HZ25V", "R_25", "1HZ50V", "R_50",
  "1HZ75V", "R_75", "1HZ100V", "R_100", "RDBEAR", "RDBULL",
  "JD10", "JD25", "JD50", "JD75", "JD100"
];

let ws = null;
let tickSubs = {};
let marketData = {};
let currentSymbol = SYMBOLS[0];

function $(id) {
  return document.getElementById(id);
}

function getLastDigit(symbol, price) {
  const priceStr = price.toString();
  const decimalCount = (priceStr.split('.')[1] || '').length;
  if (/^(JD10|JD25|JD50|JD75|JD100|R_100)$/.test(symbol)) {
    return (decimalCount <= 1) ? '0' : priceStr.slice(-1);
  } else if (/^(R_10|R_25)$/.test(symbol)) {
    return (decimalCount <= 2) ? '0' : priceStr.slice(-1);
  } else if (/^(1HZ25V|1HZ50V|1HZ75V|1HZ100V|1HZ10V)$/.test(symbol)) {
    return (decimalCount <= 1) ? '0' : priceStr.slice(-1);
  } else if (/^(RDBEAR|RDBULL|R_50|R_75)$/.test(symbol)) {
    return (decimalCount <= 3) ? '0' : priceStr.slice(-1);
  } else {
    return priceStr.slice(-1);
  }
}

// --- Update button texts live ---
function updateButtons() {
  const symbol = $("market-select")?.value || SYMBOLS[0];
  const price = marketData[symbol]?.price || "Prices";
  const lastDigit = marketData[symbol]?.lastDigit || "LastDigit";
  $("buy-btn").textContent = ` ${price}`;
  $("run-btn").textContent = ` ${lastDigit}`;
}

// --- WebSocket connection & subscription ---
function connectWS() {
  ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=82552");
  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  };
  ws.onmessage = event => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data.msg_type === "authorize") {
      currentSymbol = $("market-select")?.value || SYMBOLS[0];
      ws.send(JSON.stringify({ ticks: currentSymbol, subscribe: 1 }));
    } else if (data.msg_type === "tick" && data.tick) {
      const { symbol, quote, id } = data.tick;
      marketData[symbol] = marketData[symbol] || {};
      marketData[symbol].price = quote;
      marketData[symbol].lastDigit = getLastDigit(symbol, quote);
      tickSubs[symbol] = id;
      updateButtons();
    }
  };
}

// --- On market dropdown change, subscribe to new symbol ticks ---
function handleMarketChange() {
  const marketSelect = $("market-select");
  marketSelect.addEventListener('change', () => {
    const newSymbol = marketSelect.value;
    // Unsubscribe previous tick stream
    if (currentSymbol && tickSubs[currentSymbol]) {
      ws.send(JSON.stringify({ forget: tickSubs[currentSymbol] }));
      delete tickSubs[currentSymbol];
    }
    currentSymbol = newSymbol;
    ws.send(JSON.stringify({ ticks: newSymbol, subscribe: 1 }));
    updateButtons();
  });
}

// --- Buy button click: just update display ---
function handleBuyButton() {
  $("buy-btn").addEventListener('click', () => {
    updateButtons();
  });
}

// --- Run button click: just update display ---
function handleRunButton() {
  $("run-btn").addEventListener('click', () => {
    updateButtons();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  connectWS();
  handleMarketChange();
  handleBuyButton();
  handleRunButton();
  updateButtons();
});