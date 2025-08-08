const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const app = express();

// Configuration
const app_id = '67368';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://project1-flame-psi.vercel.app'],
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Market Data Storage
const marketData = {};
const symbols = [
  '1HZ10V', 'R_10', '1HZ25V', 'R_25', '1HZ50V', 'R_50',
  '1HZ75V', 'R_75', '1HZ100V', 'R_100', 'RDBEAR', 'RDBULL',
  'JD10', 'JD25', 'JD50', 'JD75', 'JD100'
];

symbols.forEach(symbol => {
  marketData[symbol] = {
    tickHistory: [],
    digitCounts: Array(10).fill(0),
    windows: {
      50: { history: [], evenCount: 0, oddCount: 0 },
      100: { history: [], evenCount: 0, oddCount: 0 },
      500: { history: [], evenCount: 0, oddCount: 0 },
      1000: { history: [], evenCount: 0, oddCount: 0 }
    },
    lastPrice: 0,
    lastDigit: 0,
    riseCount: 0,
    fallCount: 0,
    previousPrice: null,
    riseFallHistory: []
  };
});

// WebSocket Connection
let ws;
let connectAttempts = 0;
const maxAttempts = 5;

function connectWebSocket() {
  if (connectAttempts >= maxAttempts) {
    console.error('[WebSocket] Max connection attempts reached');
    return;
  }

  if (ws) {
    ws.close();
  }

  ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

  ws.on('open', () => {
    console.log('[WebSocket] Connected to Deriv');
    connectAttempts = 0;
    symbols.forEach(symbol => {
      ws.send(JSON.stringify({ ticks: symbol }));
    });
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (message.msg_type === 'tick') {
        processTick(message.tick);
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Disconnected');
    connectAttempts++;
    if (connectAttempts < maxAttempts) {
      setTimeout(connectWebSocket, 2000);
    }
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error);
  });
}

function processTick(tick) {
  const symbol = tick.symbol;
  const price = tick.quote;
  const priceStr = price.toString();
  const decimalCount = (priceStr.split('.')[1] || '').length;

  let lastDigit;
  if (symbol.match(/(JD10|JD25|JD50|JD75|JD100|R_100)/)) {
    lastDigit = (decimalCount <= 1) ? '0' : priceStr.slice(-1);
  } else if (symbol.match(/(R_10|R_25)/)) {
    lastDigit = (decimalCount <= 2) ? '0' : priceStr.slice(-1);
  } else if (symbol.match(/(1HZ25V|1HZ50V|1HZ75V|1HZ100V|1HZ10V)/)) {
    lastDigit = (decimalCount <= 1) ? '0' : priceStr.slice(-1);
  } else if (symbol.match(/(RDBEAR|RDBULL|R_50|R_75)/)) {
    lastDigit = (decimalCount <= 3) ? '0' : priceStr.slice(-1);
  } else {
    lastDigit = priceStr.slice(-1);
  }

  updateMarketData(symbol, lastDigit, price);
}

function updateMarketData(symbol, lastDigit, price) {
  const market = marketData[symbol];
  const digit = parseInt(lastDigit);
  
  // Rise/Fall calculation
  if (market.previousPrice !== null) {
    if (price > market.previousPrice) {
      market.riseCount++;
      market.riseFallHistory.push('↑');
    } else if (price < market.previousPrice) {
      market.fallCount++;
      market.riseFallHistory.push('↓');
    }
  }
  market.previousPrice = price;
  
  // Update data structures
  market.tickHistory.push(digit);
  market.lastPrice = price;
  market.lastDigit = digit;

  if (market.tickHistory.length > 1000) {
    const removedDigit = market.tickHistory.shift();
    market.digitCounts[removedDigit]--;
  }
  market.digitCounts[digit]++;

  // Update analysis windows
  Object.keys(market.windows).forEach(windowSize => {
    const window = market.windows[windowSize];
    const size = parseInt(windowSize);
    
    window.history.push(digit);
    if (digit % 2 === 0) window.evenCount++;
    else window.oddCount++;

    if (window.history.length > size) {
      const removedDigit = window.history.shift();
      if (removedDigit % 2 === 0) window.evenCount--;
      else window.oddCount--;
    }
  });
}

// API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'active', symbols });
});

app.post('/getStats', (req, res) => {
  const { symbol = '1HZ10V', selectedDigit = '0', windowSize = '1000' } = req.body;
  const market = marketData[symbol] || marketData['1HZ10V'];
  const window = market.windows[windowSize] || market.windows['1000'];
  const digit = parseInt(selectedDigit);
  
  // Calculate stats
  let overCount = 0, underCount = 0, matchesCount = 0, differsCount = 0;
  window.history.forEach(d => {
    if (d > digit) overCount++;
    if (d <= digit) underCount++;
    if (d === digit) matchesCount++;
    else differsCount++;
  });
  
  const totalTicks = window.history.length;
  const totalChanges = market.riseCount + market.fallCount;
  
  res.json({
    digitDistribution: market.digitCounts.map((count, index) => ({
      digit: index,
      percentage: (market.tickHistory.length > 0 ? (count / market.tickHistory.length * 100).toFixed(1) : "0.0")
    })),
    evenOdd: {
      even: (totalTicks > 0 ? (window.evenCount / totalTicks * 100).toFixed(2) : "0.00"),
      odd: (totalTicks > 0 ? (window.oddCount / totalTicks * 100).toFixed(2) : "0.00")
    },
    overUnder: {
      over: (totalTicks > 0 ? (overCount / totalTicks * 100).toFixed(2) : "0.00"),
      under: (totalTicks > 0 ? (underCount / totalTicks * 100).toFixed(2) : "0.00")
    },
    matchesDiffers: {
      matches: (totalTicks > 0 ? (matchesCount / totalTicks * 100).toFixed(2) : "0.00"),
      differs: (totalTicks > 0 ? (differsCount / totalTicks * 100).toFixed(2) : "0.00")
    },
    riseFall: {
      rise: (totalChanges > 0 ? (market.riseCount / totalChanges * 100).toFixed(1) : "0.0"),
      fall: (totalChanges > 0 ? (market.fallCount / totalChanges * 100).toFixed(1) : "0.0")
    },
    currentPrice: market.lastPrice,
    currentDigit: market.lastDigit,
    symbol,
    windowSize
  });
});


// Lightweight GET version of /getStats — for keepalive pings only
app.get('/getStats', (req, res) => {
  res.json({ status: "ping-ok", timestamp: new Date().toISOString() });
});



// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectWebSocket();
});