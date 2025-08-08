
    // --- Constants ---
    const SYMBOLS = [
      "1HZ10V","R_10","1HZ25V","R_25","1HZ50V","R_50",
      "1HZ75V","R_75","1HZ100V","R_100","RDBEAR","RDBULL",
      "JD10","JD25","JD50","JD75","JD100"
    ];
    const CONTRACT_TYPE_MAP = {
      even: "DIGITEVEN", odd: "DIGITODD",
      over: "DIGITOVER", under: "DIGITUNDER",
      matches: "DIGITMATCH", differs: "DIGITDIFF",
      rise: "RISE", fall: "FALL"
    };
    const CONTRACT_TYPE_LABELS = {
      "DIGITEVEN": "Even", "DIGITODD": "Odd", "DIGITOVER": "Over","DIGITUNDER": "Under",
      "DIGITMATCH": "Matches", "DIGITDIFF": "Differs", "RISE": "Rise", "FALL": "Fall"
    };
    let ws = null, tickSubs = {};
    let marketData = {}; // symbol: {price, lastDigit}
    let tradeHistory = [];
    let contractRowMap = {};
    let pendingTrades = {};
    let realTradeToken = ""; // API Token for real trades
    let isRealTradeAuthorized = false;
    let accountInfo = {};
    let toastMap = {};
    function $(id) { return document.getElementById(id); }

    // ---- Toast/Notification System ----
    function showTradeToast({ type, msg, duration = 5000, progress = null, contract_id = null }) {
      const container = $("toastContainer");
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
        ? '<i class="fa fa-check-circle"></i>' : '<i class="fa fa-times-circle"></i>';
      toast.querySelector('.toast-msg').textContent =
        won ? `Trade won! Profit: $${Number(profit).toFixed(2)}` : `Trade lost! Loss: $${Math.abs(Number(profit)).toFixed(2)}`;
      toast.querySelector('.toast-progress-bar-inner').style.width = "100%";
      toast.querySelector('.toast-progress-bar-inner').style.animation = "none";
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
      delete toastMap[contract_id];
    }

    // ---- End Toast/Notification ----

    function createSignalCards() {
      const resultsContainer = $("signalResults");
      resultsContainer.innerHTML = '';
      SYMBOLS.forEach(symbol => {
        const card = document.createElement('div');
        card.className = 'signal-card';
        card.setAttribute('data-symbol', symbol);
        card.innerHTML = `
          <div class="card-inline-row">
            <h3 class="card-symbol">${symbol}</h3>
            <div class="price-box" id="price-${symbol}">...</div>
            <div class="last-digit-circle" id="digit-${symbol}">-</div>
            <label class="toggle-switch small">
              <input type="checkbox" disabled>
              <span class="slider"></span>
            </label>
          </div>
          <div class="card-row">
            <div class="signal-progress" style="--progress: 0%">
              <span>0/0</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="signal-conditions" id="status-${symbol}">Status: Pending</div>
          </div>
        `;
        resultsContainer.appendChild(card);
      });
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
    function connectWS() {
      ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      ws.onopen = () => {
        SYMBOLS.forEach(symbol => {
          ws.send(JSON.stringify({ticks: symbol, subscribe: 1}));
        });
        if (realTradeToken) {
          ws.send(JSON.stringify({authorize: realTradeToken}));
        }
      };
      ws.onmessage = event => {
        let data;
        try { data = JSON.parse(event.data); } catch (e) { return; }
        if (data.msg_type === "tick" && data.tick) {
          const { symbol, quote } = data.tick;
          marketData[symbol] = marketData[symbol] || {};
          marketData[symbol].price = quote;
          const lastDigit = getLastDigit(symbol, quote);
          marketData[symbol].lastDigit = lastDigit;
          if ($(`price-${symbol}`)) $(`price-${symbol}`).textContent = quote;
          if ($(`digit-${symbol}`)) $(`digit-${symbol}`).textContent = lastDigit;
        } else if (data.msg_type === "authorize") {
          isRealTradeAuthorized = true;
          accountInfo = data.authorize;
          $("apiTokenStatus").style.display = "";
          $("apiTokenStatus").style.color = "#2e7d32";
          $("apiTokenStatus").textContent = "Authorized as " + accountInfo.loginid + (accountInfo.is_virtual ? " (DEMO)" : " (REAL)");
        } else if (data.msg_type === "proposal") {
          if (data.error) {
            showTradeToast({ type: "lost", msg: "Proposal error: " + (data.error.message || JSON.stringify(data.error)), duration: 3000 });
            return;
          }
          ws.send(JSON.stringify({ buy: data.proposal.id, price: data.proposal.ask_price }));
        } else if (data.msg_type === "buy") {
          if (data.buy && data.buy.contract_id) {
            const contract_id = data.buy.contract_id;
            const market = pendingTrades[contract_id]?.market || pendingTrades.lastMarket || "N/A";
            const type = pendingTrades[contract_id]?.type || pendingTrades.lastType || "N/A";
            const stake = pendingTrades[contract_id]?.stake || pendingTrades.lastStake || $("stakeInput").value || 1;
            const ticks = parseInt($("ticksInput").value) || 1;
            let barrier = $("predictionInput").value || "";
            let infoMsg = `Trade executed: ${CONTRACT_TYPE_LABELS[type] || type}` +
              (barrier ? ` barrier=${barrier}` : "") +
              ` @ $${stake} for ${market}`;
            showTradeToast({
              type: "executed",
              msg: infoMsg,
              progress: { duration: ticks },
              contract_id
            });
            const rowObj = {
              contract_id,
              market,
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
            ws.send(JSON.stringify({ proposal_open_contract: 1, contract_id, subscribe: 1 }));
          }
        } else if (data.msg_type === "proposal_open_contract") {
          const poc = data.proposal_open_contract;
          const contract_id = poc.contract_id;
          if (contractRowMap.hasOwnProperty(contract_id)) {
            let rowIdx = contractRowMap[contract_id];
            let row = tradeHistory[rowIdx];
            if (!row.entry_spot_set &&
                (poc.entry_tick_price !== undefined || poc.entry_tick !== undefined)) {
              row.entry_spot =
                poc.entry_tick_price !== undefined
                  ? poc.entry_tick_price
                  : poc.entry_tick !== undefined
                  ? poc.entry_tick
                  : '—';
              row.entry_spot_set = true;
              renderTradeTable();
            }
            if (poc.is_sold) {
              row.exit_spot =
                poc.exit_tick_price !== undefined
                  ? poc.exit_tick_price
                  : poc.exit_tick !== undefined
                  ? poc.exit_tick
                  : '-';
              row.result = (poc.profit > 0) ? "Win" : "Loss";
              row.profit = poc.profit ?? "—";
              renderTradeTable();
              updateTradeToastToResult({
                contract_id,
                won: poc.profit > 0,
                profit: poc.profit
              });
              if (poc.subscription) {
                ws.send(JSON.stringify({ forget: poc.subscription.id }));
              }
            }
          }
        } else if (data.error) {
          showTradeToast({ type: "lost", msg: "API error: " + (data.error.message || JSON.stringify(data.error)), duration: 1000 });
        }
      };
    }
    function takeDemoTrade() {
      const market = $("marketDropdown").value;
      const tradeTypeKey = $("tradeTypeDropdown").value;
      const contract_type = CONTRACT_TYPE_MAP[tradeTypeKey];
      let symbol;
      if (market === "all-markets") {
        let available = SYMBOLS.filter(s => marketData[s] && marketData[s].price);
        symbol = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : SYMBOLS[0];
      } else {
        symbol = market;
      }
      let stake = parseFloat($("stakeInput").value) || 1;
      let ticks = parseInt($("ticksInput").value) || 1;
      if (isNaN(ticks) || ticks < 1 || ticks > 10) ticks = 1;
      let duration = ticks;
      let barrier = undefined;
      if (["DIGITMATCH","DIGITDIFF","DIGITOVER","DIGITUNDER"].includes(contract_type)) {
        let digit = $("predictionInput").value;
        if (digit === "" || isNaN(digit) || digit < 0 || digit > 9) {
          showTradeToast({ type: "lost", msg: "Digit prediction must be 0-9.", duration: 3000 });
          return;
        }
        barrier = digit;
      }
      let props = {
        proposal: 1,
        amount: stake,
        basis: "stake",
        contract_type,
        currency: "USD",
        symbol,
        duration,
        duration_unit: "t"
      };
      if (barrier !== undefined) props.barrier = barrier;
      pendingTrades.lastMarket = symbol;
      pendingTrades.lastType = contract_type;
      pendingTrades.lastStake = stake;
      if (isRealTradeAuthorized && realTradeToken) {
        props.currency = accountInfo.currency || "USD";
        ws.send(JSON.stringify(props));
      } else {
        ws.send(JSON.stringify(props));
      }
    }
    function showTradeTableModal() {
      $("tradeTableModalBg").style.display = "block";
      renderTradeTable();
    }
    function hideTradeTableModal() {
      $("tradeTableModalBg").style.display = "none";
    }
    function renderTradeTable() {
      const tbody = $("trade-tbody");
      const summary = $("tradeSummary");
      const loader = $("tradeTableLoader");
      const table = $("tradeTable");
      if (!tbody) return;
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
        if (isWin) won++; else if(trade.result === "Loss") lost++;
        let entryExit = (trade.entry_spot !== undefined && trade.entry_spot !== '—' && trade.entry_spot !== '')
          ? trade.entry_spot : '';
        entryExit += (trade.exit_spot !== undefined && trade.exit_spot !== '') ? ' / ' + trade.exit_spot : '';
        rows.push(`
          <tr>
            <td>${trade.type}</td>
            <td>${entryExit || "—"}</td>
            <td>$${Number(trade.buy_price).toFixed(2)}</td>
            <td class="${pl>=0 ? 'pl-profit' : 'pl-loss'}">${pl>=0?'+':''}$${pl.toFixed(2)}</td>
            <td class="${isWin ? 'status-won':'status-lost'}">${isWin?'Won':(trade.result==='Loss'?'Lost':'')}</td>
          </tr>
        `);
      });
      tbody.innerHTML = rows.join('');
      summary.innerHTML = `
        <span><strong>Total Stake:</strong> $${totalStake.toFixed(2)}</span>
        <span><strong>Runs:</strong> ${tradeHistory.length}</span>
        <span>Won: ${won}</span>
        <span>Lost: ${lost}</span>
        <span><strong>P/L:</strong> <span class="summary-pl${totalPL<0?' negative':''}">$${totalPL.toFixed(2)}</span></span>
      `;
      summary.style.display = "";
    }

    // --- Digit Selector Visibility Logic ---
    function updateDigitSelectorVisibility() {
      const type = $("tradeTypeDropdown").value;
      const showDigits = ['over', 'under', 'matches', 'differs'].includes(type);
      $("digitSelectorRow").style.display = showDigits ? 'flex' : 'none';
      $("allDigits").style.display = showDigits ? 'flex' : 'none';
    }

    document.getElementById('resetTradesBtn').onclick = function() {
      tradeHistory = [];
      contractRowMap = {};
      renderTradeTable();
    };

    document.getElementById('tradeTypeDropdown').addEventListener('change', function () {
      updateDigitSelectorVisibility();
    });

    document.querySelectorAll('.digit-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.digit-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        $("predictionInput").value = button.getAttribute('data-digit');
      });
    });

    document.getElementById('scanBtn').addEventListener('click', function() {
      takeDemoTrade();
    });
    document.getElementById('tradeTableModalClose').onclick = hideTradeTableModal;
    document.getElementById('tradeTableModalBg').onclick = function(e) {
      if (e.target === this) hideTradeTableModal();
    };
    document.getElementById('tradeTableBtn').addEventListener('click', showTradeTableModal);
    document.getElementById('apiTokenLoginBtn').onclick = function() {
      const token = $("apiTokenInput").value.trim();
      if (!token) {
        $("apiTokenStatus").style.display = "";
        $("apiTokenStatus").style.color = "#c62828";
        $("apiTokenStatus").textContent = "Please enter your API token.";
        return;
      }
      realTradeToken = token;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({authorize: realTradeToken}));
      } else {
        connectWS();
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      createSignalCards();
      connectWS();
      updateDigitSelectorVisibility(); // Ensure correct initial state
    });
