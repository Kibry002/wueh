const API_TOKEN = "hOopTxxPwF2E3Vy";
const SYMBOLS = [
  "1HZ10V", "R_10", "1HZ25V", "R_25", "1HZ50V", "R_50",
  "1HZ75V", "R_75", "1HZ100V", "R_100", "RDBEAR", "RDBULL",
  "JD10", "JD25", "JD50", "JD75", "JD100"
];

// Mapping of symbols to display names
const SYMBOL_DISPLAY_NAMES = {
  "1HZ10V": "Volatility 10(1s)",
  "R_10": "Volatility 10",
  "1HZ25V": "Volatility 25(1s)",
  "R_25": "Volatility 25",
  "1HZ50V": "Volatility 50(1s)",
  "R_50": "Volatility 50",
  "1HZ75V": "Volatility 75(1s)",
  "R_75": "Volatility 75",
  "1HZ100V": "Volatility 100(1s)",
  "R_100": "Volatility 100",
  "RDBEAR": "Bear Market",
  "RDBULL": "Bull Market",
  "JD10": "Jump 10 Index",
  "JD25": "Jump 25 Index",
  "JD50": "Jump 50 Index",
  "JD75": "Jump 75 Index",
  "JD100": "Jump 100 Index"
};

// Mapping of contract types to labels
const CONTRACT_TYPE_LABELS = {
  "DIGITEVEN": "Even",
  "DIGITODD": "Odd",
  "DIGITOVER": "Over",
  "DIGITUNDER": "Under",
  "DIGITMATCH": "Matches",
  "DIGITDIFF": "Differs"
};

let ws = null;
let tickSubs = {};
let marketData = {};
let currentSymbol = SYMBOLS[0];
let tradeHistory = [];
let contractRowMap = {};
let toastMap = {};
let pendingTrades = {};
let lastUpdateTime = 0;
const UPDATE_DEBOUNCE_MS = 100; // Limit UI updates to 10/sec
const SUBSCRIPTION_TIMEOUT = 2000; // 2 seconds to retry subscription

// --- Utility function to get element by ID ---
function $(id) {
  return document.getElementById(id);
}

// --- Get last digit of price based on symbol ---
function getLastDigit(symbol, price) {
  const priceStr = price.toString();
  const decimalCount = (priceStr.split('.')[1] || '').length;
  let lastDigit;
  
  if (/^(JD10|JD25|JD50|JD75|JD100|R_100)$/.test(symbol)) {
    lastDigit = decimalCount <= 1 ? '0' : priceStr.slice(-1);
  } else if (/^(R_10|R_25)$/.test(symbol)) {
    lastDigit = decimalCount <= 2 ? '0' : priceStr.slice(-1);
  } else if (/^(1HZ25V|1HZ50V|1HZ75V|1HZ100V|1HZ10V)$/.test(symbol)) {
    lastDigit = decimalCount <= 1 ? '0' : priceStr.slice(-1);
  } else if (/^(RDBEAR|RDBULL|R_50|R_75)$/.test(symbol)) {
    lastDigit = decimalCount <= 3 ? '0' : priceStr.slice(-1);
  } else {
    lastDigit = priceStr.slice(-1);
  }
  
  console.log(`getLastDigit(${symbol}, ${price}) => ${lastDigit}`); // Debug
  return lastDigit;
}

// --- Add dynamic CSS for number grid ---
function addNumberGridStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .number-button.active {
      background-color: #2196F3 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);
}

// --- Update number grid with last digit highlight ---
function updateNumberGrid(symbol) {
  const buttons = document.querySelectorAll('.number-grid .number-button');
  if (buttons.length < 10) {
    console.warn('Number grid buttons missing or incomplete');
    showTradeToast({ type: "error", msg: "Number grid incomplete", duration: 5000 });
    return;
  }

  const currentDigit = Number(marketData[symbol]?.lastDigit);
  if (isNaN(currentDigit) || currentDigit < 0 || currentDigit > 9) {
    console.warn(`Invalid last digit for ${symbol}: ${marketData[symbol]?.lastDigit}`);
    showTradeToast({ type: "error", msg: `Invalid digit for ${symbol}`, duration: 5000 });
    return;
  }

  buttons.forEach(button => button.classList.remove('active'));
  buttons[currentDigit].classList.add('active');
}

// --- Update button texts with market data ---
function updateButtons(symbol) {
  const price = marketData[symbol]?.price;
  const lastDigit = marketData[symbol]?.lastDigit;
  if (price === undefined || lastDigit === undefined) {
    console.warn(`No valid data for ${symbol}: price=${price}, lastDigit=${lastDigit}`);
    return;
  }

  const buyBtn = $("buy-btn");
  const runBtn = $("run-btn");
  if (buyBtn) buyBtn.textContent = ` ${price}`;
  if (runBtn) runBtn.textContent = ` ${lastDigit}`;
  console.log(`Updated run-btn to ${lastDigit} for ${symbol}`); // Debug
}

// --- WebSocket connection & subscription ---
function connectWS() {
  ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=82552");
  let subscriptionTimer = null;

  ws.onopen = () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  };

  ws.onmessage = event => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
      showTradeToast({ type: "error", msg: "Data parsing error", duration: 5000 });
      return;
    }

    if (data.msg_type === "authorize") {
      currentSymbol = $("market-select")?.value || SYMBOLS[0];
      marketData[currentSymbol] = marketData[currentSymbol] || {};
      ws.send(JSON.stringify({ ticks: currentSymbol, subscribe: 1 }));
      subscriptionTimer = setTimeout(() => {
        if (!tickSubs[currentSymbol]) {
          console.warn(`No tick response for ${currentSymbol}, retrying...`);
          ws.send(JSON.stringify({ ticks: currentSymbol, subscribe: 1 }));
        }
      }, SUBSCRIPTION_TIMEOUT);
    } else if (data.msg_type === "tick" && data.tick) {
      clearTimeout(subscriptionTimer);
      const { symbol, quote, id } = data.tick;
      marketData[symbol] = marketData[symbol] || {};
      marketData[symbol].price = quote;
      marketData[symbol].lastDigit = getLastDigit(symbol, quote);
      tickSubs[symbol] = id;

      // Debounce UI updates
      const now = Date.now();
      if (now - lastUpdateTime >= UPDATE_DEBOUNCE_MS) {
        updateButtons(symbol);
        updateNumberGrid(symbol);
        lastUpdateTime = now;
      }
    } else if (data.msg_type === "proposal" && data.proposal) {
      const { id, ask_price } = data.proposal;
      const contract_id = `proposal_${id}`;
      pendingTrades[contract_id] = {
        market: currentSymbol,
        type: data.proposal.contract_type,
        stake: data.proposal.amount,
        barrier: data.proposal.barrier || ""
      };
      ws.send(JSON.stringify({
        buy: id,
        price: ask_price
      }));
    } else if (data.msg_type === "buy" && data.buy) {
      const { contract_id, buy_price } = data.buy;
      const proposal_id = `proposal_${data.buy.proposal_id}`;
      const market = pendingTrades[proposal_id]?.market || currentSymbol;
      const type = pendingTrades[proposal_id]?.type || data.buy.shortcode || "Unknown";
      const stake = pendingTrades[proposal_id]?.stake || parseFloat($("stake")?.value) || 5.00;
      const barrier = pendingTrades[proposal_id]?.barrier || "";
      let infoMsg = `Trade executed: ${CONTRACT_TYPE_LABELS[type] || type}` +
        (barrier ? ` barrier=${barrier}` : "") +
        ` @ $${stake} for ${SYMBOL_DISPLAY_NAMES[market] || market}`;
      showTradeToast({
        type: "executed",
        msg: infoMsg,
        contract_id,
        progress: { duration: parseInt($("ticks")?.value) || 5 }
      });
      const rowObj = {
        contract_id,
        market: market,
        type: CONTRACT_TYPE_LABELS[type] || type,
        buy_price: stake,
        entry_spot: '—',
        entry_spot_set: false,
        exit_spot: '',
        result: '',
        profit: ''
      };
      tradeHistory.unshift(rowObj);
      contractRowMap[contract_id] = 0;
      for (let key in contractRowMap) {
        if (key !== String(contract_id)) contractRowMap[key]++;
      }
      renderTradeTable();
      ws.send(JSON.stringify({
        proposal_open_contract: 1,
        contract_id,
        subscribe: 1
      }));
      delete pendingTrades[proposal_id];
    } else if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract) {
      const poc = data.proposal_open_contract;
      const contract_id = poc.contract_id;
      if (contractRowMap.hasOwnProperty(contract_id)) {
        let rowIdx = contractRowMap[contract_id];
        let row = tradeHistory[rowIdx];
        if (!row.entry_spot_set && (poc.entry_tick_price !== undefined || poc.entry_tick !== undefined)) {
          row.entry_spot = poc.entry_tick_price !== undefined ? poc.entry_tick_price : poc.entry_tick !== undefined ? poc.entry_tick : '—';
          row.entry_spot_set = true;
          renderTradeTable();
        }
        if (poc.is_sold) {
          row.exit_spot = poc.exit_tick_price !== undefined ? poc.exit_tick_price : poc.exit_tick !== undefined ? poc.exit_tick : '-';
          row.result = poc.profit >= 0 ? "Win" : "Loss";
          row.profit = poc.profit ?? "—";
          renderTradeTable();
          updateTradeToastToResult({
            contract_id,
            won: poc.profit >= 0,
            profit: poc.profit
          });
          if (poc.subscription) {
            ws.send(JSON.stringify({ forget: poc.subscription.id }));
          }
        }
      }
    }
  };

  ws.onerror = error => {
    console.error('WebSocket error:', error);
    showTradeToast({ type: "error", msg: "WebSocket connection error", duration: 5000 });
  };

  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(connectWS, 1000);
  };
}

// --- Handle market dropdown change ---
function handleMarketChange() {
  const marketSelect = $("market-select");
  if (marketSelect) {
    marketSelect.addEventListener('change', () => {
      const newSymbol = marketSelect.value;
      if (currentSymbol && tickSubs[currentSymbol]) {
        ws.send(JSON.stringify({ forget: tickSubs[currentSymbol] }));
        delete tickSubs[currentSymbol];
      }
      currentSymbol = newSymbol;
      marketData[currentSymbol] = marketData[currentSymbol] || {};
      ws.send(JSON.stringify({ ticks: newSymbol, subscribe: 1 }));
      setTimeout(() => {
        if (!tickSubs[currentSymbol]) {
          console.warn(`No tick response for ${currentSymbol}, retrying...`);
          ws.send(JSON.stringify({ ticks: currentSymbol, subscribe: 1 }));
        }
      }, SUBSCRIPTION_TIMEOUT);
    });
  }
}

// --- Handle button clicks ---
function handleBuyButton() {
  const buyBtn = $("buy-btn");
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      if (marketData[currentSymbol]?.price) {
        updateButtons(currentSymbol);
      }
    });
  }
}

function handleRunButton() {
  const runBtn = $("run-btn");
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (marketData[currentSymbol]?.lastDigit) {
        updateButtons(currentSymbol);
      }
    });
  }
}

// --- Strategy and approach configurations ---
const strategies = {
  even: { 
    label: 'Even', 
    prediction: 'Even', 
    inputType: 'text', 
    readonly: true,
    allowedApproaches: ['manual', 'entry', 'count', 'advanced'],
    contract_type: 'DIGITEVEN'
  },
  odd: { 
    label: 'Odd', 
    prediction: 'Odd', 
    inputType: 'text', 
    readonly: true,
    allowedApproaches: ['manual', 'entry', 'count', 'advanced'],
    contract_type: 'DIGITODD'
  },
  over: { 
    label: 'Over', 
    prediction: '', 
    inputType: 'number', 
    readonly: false, 
    min: 0, 
    max: 9,
    allowedApproaches: ['manual', 'entry', 'count', 'advanced'],
    contract_type: 'DIGITOVER'
  },
  under: { 
    label: 'Under', 
    prediction: '', 
    inputType: 'number', 
    readonly: false, 
    min: 0, 
    max: 9,
    allowedApproaches: ['manual', 'entry', 'count', 'advanced'],
    contract_type: 'DIGITUNDER'
  },
  matches: { 
    label: 'Matches', 
    prediction: '', 
    inputType: 'number', 
    readonly: false, 
    min: 0, 
    max: 9,
    allowedApproaches: ['manual'],
    contract_type: 'DIGITMATCH'
  },
  differs: { 
    label: 'Differs', 
    prediction: '', 
    inputType: 'number', 
    readonly: false, 
    min: 0, 
    max: 9,
    allowedApproaches: ['manual', 'entry', 'count', 'advanced'],
    contract_type: 'DIGITDIFF'
  }
};

const approaches = {
  manual: { 
    fields: ['stake', 'prediction', 'ticks', 'martingale', 'tp', 'sl', 'num-trades'],
    showNumTrades: true
  },
  entry: { 
    fields: ['stake', 'prediction', 'ticks', 'entry-point', 'martingale', 'tp', 'sl', 'num-trades'],
    showNumTrades: true 
  },
  count: { 
    fields: ['stake', 'prediction', 'ticks', 'count-value', 'martingale', 'tp', 'sl', 'num-trades'],
    showNumTrades: true 
  },
  advanced: { 
    fields: ['stake', 'prediction', 'ticks', 'martingale', 'tp', 'sl', 'num-trades'],
    showNumTrades: true 
  }
};

const fieldConfigs = {
  'stake': { type: 'number', placeholder: '5.00', step: '0.01', min: '1' },
  'prediction': { type: 'text', readonly: true },
  'ticks': { type: 'number', placeholder: '5', min: '1' },
  'martingale': { 
    type: 'select', 
    options: [
      { value: 'none', label: 'None' },
      { value: '1.5', label: '1.5x' },
      { value: '2', label: '2x' },
      { value: '3', label: '3x' }
    ]
  },
  'tp': { type: 'number', placeholder: '50.00', step: '0.01' },
  'sl': { type: 'number', placeholder: '20.00', step: '0.01' },
  'num-trades': { type: 'number', placeholder: '10', min: '1' },
  'entry-point': { type: 'number', placeholder: '0', step: '0.01' },
  'count-value': { type: 'number', placeholder: '3', min: '1' }
};

// --- Form rendering and event handling ---
function updateSubStrategyOptions(strategy) {
  const subStrategy = $("sub-strategy");
  if (subStrategy) {
    subStrategy.innerHTML = '';
    strategy.allowedApproaches.forEach(approachKey => {
      const option = document.createElement('option');
      option.value = approachKey;
      option.textContent = approaches[approachKey].name || 
                          approachKey.charAt(0).toUpperCase() + approachKey.slice(1);
      if (approachKey === 'manual') {
        option.selected = true;
      }
      subStrategy.appendChild(option);
    });
  }
}

function validatePrediction(input) {
  if (input && input.type === 'number') {
    const value = parseInt(input.value);
    const min = parseInt(input.min) || 0;
    const max = parseInt(input.max) || 9;
    
    if (isNaN(value)) {
      input.value = '';
    } else if (value < min) {
      input.value = min;
    } else if (value > max) {
      input.value = max;
    }
  }
}

function renderForm() {
  const mainStrategy = $("main-strategy");
  const subStrategy = $("sub-strategy");
  const formsContainer = $("forms-container");
  if (!formsContainer) return;

  const strategyKey = mainStrategy?.value || '';
  const approachKey = subStrategy?.value || 'manual';
  const strategy = strategyKey ? strategies[strategyKey] : null;
  const approach = approaches[approachKey] || approaches['manual'];
  
  let formHTML = `<div class="strategy-form" data-strategy="${strategyKey || 'default'}" data-approach="${approachKey}">`;
  
  formHTML += `<div class="inline-form-group">`;
  
  formHTML += `
    <div class="form-group">
      <label for="stake">Stake($)</label>
      <input type="number" class="form-input" id="stake" placeholder="5.00" step="0.01" min="1">
    </div>
  `;
  
  if (strategy) {
    const predictionType = strategy.inputType || 'text';
    const readonly = strategy.readonly ? 'readonly' : '';
    const minAttr = strategy.min !== undefined ? `min="${strategy.min}"` : '';
    const maxAttr = strategy.max !== undefined ? `max="${strategy.max}"` : '';
    const value = strategy.readonly ? strategy.prediction : '';
    
    formHTML += `
      <div class="form-group">
        <label for="prediction">Prediction</label>
        <input type="${predictionType}" class="form-input" id="prediction" 
               placeholder="${strategy.label}${strategy.readonly ? '' : ' (0-9)'}" ${readonly}
               ${minAttr} ${maxAttr} value="${value}"
               oninput="validatePrediction(this)">
      </div>
    `;
  } else {
    formHTML += `
      <div class="form-group">
        <label for="prediction">Predict</label>
        <input type="text" class="form-input" id="prediction" placeholder="Select strategy" readonly>
      </div>
    `;
  }
  
  formHTML += `
    <div class="form-group">
      <label for="ticks">Ticks</label>
      <input type="number" class="form-input" id="ticks" placeholder="5" min="1">
    </div>
    <div class="form-group">
      <label for="martingale">Martingale</label>
      <select class="form-input" id="martingale">
        <option value="none">None</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
        <option value="3">3x</option>
      </select>
    </div>
  `;
  
  formHTML += `</div>`;
  
  if (approachKey === 'entry') {
    formHTML += `
      <div class="form-group">
        <label for="entry-point">Entry</label>
        <input type="number" class="form-input" id="entry-point" placeholder="0" step="0.01">
      </div>
    `;
  } else if (approachKey === 'count') {
    formHTML += `
      <div class="form-group">
        <label for="count-value">Count Value</label>
        <input type="number" class="form-input" id="count-value" placeholder="3" min="1">
      </div>
    `;
  }
  
  formHTML += `
    <div class="form-group">
      <label for="tp">TP ($)</label>
      <input type="number" class="form-input" id="tp" placeholder="50.00" step="0.01">
    </div>
    <div class="form-group">
      <label for="sl">SL ($)</label>
      <input type="number" class="form-input" id="sl" placeholder="20.00" step="0.01">
    </div>
  `;
  
  if (approach.showNumTrades) {
    formHTML += `
      <div class="form-group">
        <label for="num-trades">Trades</label>
        <input type="number" class="form-input" id="num-trades" placeholder="10" min="1">
      </div>
    `;
  }
  
  formHTML += `
    <div class="action-buttons">
      <button class="results-button">Results</button>
      <button class="trade-button">Trade</button>
    </div>
  </div>`;
  
  formsContainer.innerHTML = formHTML;

  // Attach trade and results button handlers after form is rendered
  handleTradeButton();
  handleResultsButton();
}

// --- Notification logic ---
function showTradeToast({ type, msg, duration = 5000, progress = null, contract_id = null }) {
  const container = $("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.innerHTML = `
    <span class="toast-icon">${
      type === "executed" ? '<i class="fa fa-info-circle"></i>' :
      type === "won" ? '<i class="fa fa-check-circle"></i>' :
      type === "lost" ? '<i class="fa fa-times-circle"></i>' : ''
    }</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" title="Close">×</button>
    <div class="toast-progress-bar"><div class="toast-progress-bar-inner"></div></div>
  `;
  container.appendChild(toast);

  toast.querySelector('.toast-close').onclick = () => {
    toast.remove();
    if (contract_id) delete toastMap[contract_id];
  };

  if (progress && progress.duration) {
    const progressBar = toast.querySelector('.toast-progress-bar-inner');
    const totalDuration = progress.duration * 1000;
    progressBar.style.animation = `progressLoading ${totalDuration}ms linear`;
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, totalDuration + 4000);
  } else if (duration > 0) {
    const progressBar = toast.querySelector('.toast-progress-bar-inner');
    progressBar.style.transition = `width ${duration}ms linear`;
    setTimeout(() => { progressBar.style.width = "100%"; }, 80);
    setTimeout(() => { toast.remove(); }, duration + 50);
  }

  if (contract_id) toastMap[contract_id] = toast;
  return toast;
}

function updateTradeToastToResult({ contract_id, won, profit }) {
  const toast = toastMap[contract_id];
  if (!toast) return;
  toast.className = "toast " + (won ? "toast-won" : "toast-lost");
  toast.querySelector('.toast-icon').innerHTML = won
    ? '<i class="fa fa-check-circle"></i>'
    : '<i class="fa fa-times-circle"></i>';
  toast.querySelector('.toast-msg').textContent = won
    ? `Trade won! Profit: $${Number(profit).toFixed(2)}`
    : `Trade lost! Loss: $${Math.abs(Number(profit)).toFixed(2)}`;
  toast.querySelector('.toast-progress-bar-inner').style.width = "100%";
  toast.querySelector('.toast-progress-bar-inner').style.animation = "none";
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
  delete toastMap[contract_id];
}

// --- Trade table logic ---
function renderTradeTable() {
  const tbody = $("trade-tbody");
  const summary = $("tradeSummary");
  const loader = $("tradeTableLoader");
  const table = $("tradeTable");

  if (!tbody || !summary || !loader || !table) {
    console.error("Trade table elements missing:", { tbody, summary, loader, table });
    return;
  }

  tbody.innerHTML = "";

  if (tradeHistory.length === 0) {
    loader.textContent = "No trades yet.";
    loader.style.display = "";
    table.style.display = "";
    summary.style.display = "none";
    return;
  }

  loader.style.display = "none";
  table.style.display = "";

  let totalStake = 0, won = 0, lost = 0, totalPL = 0;
  let rows = [];

  tradeHistory.forEach(trade => {
    totalStake += Number(trade.buy_price) || 0;
    let pl = Number(trade.profit) || 0;
    totalPL += pl;
    const isWin = trade.result === "Win";
    if (isWin) won++; else if (trade.result === "Loss") lost++;

    let entryExit = trade.entry_spot && trade.entry_spot !== '—' ? trade.entry_spot : '';
    entryExit += trade.exit_spot && trade.exit_spot !== '' ? ' / ' + trade.exit_spot : '';

    rows.push(`
      <tr>
        <td>${trade.type}</td>
        <td>${trade.market}</td>
        <td>${entryExit || "—"}</td>
        <td>$${Number(trade.buy_price).toFixed(2)}</td>
        <td class="${pl >= 0 ? 'pl-profit' : 'pl-loss'}">${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}</td>
        <td class="${isWin ? 'status-won' : 'status-lost'}">${isWin ? 'Won' : (trade.result === 'Loss' ? 'Lost' : '')}</td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('');
  summary.innerHTML = `
    <span><strong>Total Stake:</strong> $${totalStake.toFixed(2)}</span>
    <span><strong>Runs:</strong> ${tradeHistory.length}</span>
    <span>Won: ${won}</span>
    <span>Lost: ${lost}</span>
    <span><strong>P/L:</strong> <span class="summary-pl${totalPL < 0 ? ' negative' : ''}">$${totalPL.toFixed(2)}</span></span>
  `;
  summary.style.display = "";
}

function showTradeTableModal() {
  const modal = $("tradeTableModalBg");
  if (modal) {
    modal.style.display = "block";
    renderTradeTable();
  } else {
    console.error("Modal element 'tradeTableModalBg' not found");
  }
}

function hideTradeTableModal() {
  const modal = $("tradeTableModalBg");
  if (modal) {
    modal.style.display = "none";
  }
}

function handleResultsButton() {
  const formsContainer = $("forms-container");
  if (!formsContainer) return;

  formsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('results-button')) {
      showTradeTableModal();
    }
  });
}

// --- Clear trade table ---
function clearTradeTable() {
  tradeHistory = [];
  contractRowMap = {};
  renderTradeTable();
}

// --- Trading logic ---
function handleTradeButton() {
  const formsContainer = $("forms-container");
  if (!formsContainer) return;

  formsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('trade-button')) {
      const mainStrategy = $("main-strategy")?.value;
      const strategy = strategies[mainStrategy];
      const stake = parseFloat($("stake")?.value) || 5.00;
      const ticks = parseInt($("ticks")?.value) || 5;
      const prediction = strategy?.readonly ? undefined : parseInt($("prediction")?.value);

      if (!strategy || !currentSymbol) {
        showTradeToast({
          type: "error",
          msg: "Please select a strategy and market symbol",
          duration: 5000
        });
        return;
      }

      if (!strategy.readonly && (isNaN(prediction) || prediction < 0 || prediction > 9)) {
        showTradeToast({
          type: "error",
          msg: "Please enter a valid prediction (0-9)",
          duration: 5000
        });
        return;
      }

      const proposal = {
        proposal: 1,
        symbol: currentSymbol,
        contract_type: strategy.contract_type,
        amount: stake,
        currency: "USD",
        duration: ticks,
        duration_unit: "t",
        basis: "stake"
      };

      if (!strategy.readonly) {
        proposal.barrier = prediction.toString();
      }

      pendingTrades.lastMarket = currentSymbol;
      pendingTrades.lastType = strategy.contract_type;
      pendingTrades.lastStake = stake;
      pendingTrades.lastBarrier = prediction?.toString() || "";

      ws.send(JSON.stringify(proposal));
    }
  });
}

// --- Initialize on DOM content loaded ---
document.addEventListener('DOMContentLoaded', () => {
  addNumberGridStyles();
  connectWS();
  handleMarketChange();
  handleBuyButton();
  handleRunButton();
  
  const mainStrategy = $("main-strategy");
  const subStrategy = $("sub-strategy");
  if (subStrategy) {
    subStrategy.value = 'manual';
  }
  
  if (mainStrategy && mainStrategy.value) {
    updateSubStrategyOptions(strategies[mainStrategy.value]);
  }
  
  if (mainStrategy) {
    mainStrategy.addEventListener('change', () => {
      const selectedStrategy = mainStrategy.value;
      updateSubStrategyOptions(strategies[selectedStrategy]);
      renderForm();
    });
  }
  
  if (subStrategy) {
    subStrategy.addEventListener('change', renderForm);
  }
  
  // Trade table event bindings
  const tradeTableModalClose = $("tradeTableModalClose");
  const tradeTableModalBg = $("tradeTableModalBg");
  const clearButton = $("tradeTableClear");
  
  if (tradeTableModalClose) {
    tradeTableModalClose.addEventListener('click', hideTradeTableModal);
  } else {
    console.error("Element 'tradeTableModalClose' not found");
  }
  if (tradeTableModalBg) {
    tradeTableModalBg.addEventListener('click', (e) => {
      if (e.target === tradeTableModalBg) hideTradeTableModal();
    });
  } else {
    console.error("Element 'tradeTableModalBg' not found");
  }
  if (clearButton) {
    clearButton.addEventListener('click', clearTradeTable);
  } else {
    console.error("Element 'tradeTableClear' not found");
  }
  
  renderForm();
});