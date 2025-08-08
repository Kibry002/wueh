document.addEventListener('DOMContentLoaded', function() {
  // Initialize state
  const state = {
    currentSymbol: '1HZ10V',
    selectedTicks: '1000',
    selectedDigit: '0',
    endpoint: 'https://logan1.onrender.com/getStats'
  };

  // Initialize UI
  const dropdown = document.getElementById('market-select');
  dropdown.value = state.currentSymbol;

  // Set default active digit
  document.querySelectorAll('#divB .stats-number')[0].classList.add('active', 'default-active');
  document.querySelectorAll('#divC .stats-container:first-child .stats-number')[0].classList.add('active', 'default-active');

  // Start polling
  setInterval(() => fetchData(state), 1000);
  fetchData(state);

  // Event listeners
  document.getElementById('market-select').addEventListener('change', function() {
    state.currentSymbol = this.value;
    fetchData(state);
  });

  document.getElementById('ticks-select').addEventListener('change', function() {
    state.selectedTicks = this.value || '1000';
    fetchData(state);
  });

  document.querySelectorAll('#divB .stats-number').forEach(number => {
    number.addEventListener('click', function() {
      document.querySelectorAll('#divB .stats-number').forEach(n => {
        n.classList.remove('active', 'default-active');
      });
      this.classList.add('active');
      state.selectedDigit = this.textContent;
      fetchData(state);
    });
  });

  document.querySelectorAll('#divC .stats-container:first-child .stats-number').forEach(number => {
    number.addEventListener('click', function() {
      document.querySelectorAll('#divC .stats-container:first-child .stats-number').forEach(n => {
        n.classList.remove('active', 'default-active');
      });
      this.classList.add('active');
      state.selectedDigit = this.textContent;
      fetchData(state);
    });
  });
});

async function fetchData(state) {
  try {
    const response = await fetch(state.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        symbol: state.currentSymbol,
        selectedDigit: state.selectedDigit,
        windowSize: state.selectedTicks
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error('Fetch error:', error);
    showError('Connection error - retrying...');
  }
}

function updateUI(data) {
  if (!data) return;

  // Update price and digit display
  const priceDisplay = document.querySelector('.control-row:first-child .action-button:last-child');
  const digitDisplay = document.querySelector('.control-row:nth-child(2) .action-button:last-child');
  if (priceDisplay) priceDisplay.textContent = data.currentPrice;
  if (digitDisplay) digitDisplay.textContent = data.currentDigit;

  // Update digit percentages
  data.digitDistribution?.forEach(item => {
    const button = document.querySelectorAll('.number-button')[item.digit];
    if (button) {
      const percentageEl = button.querySelector('.percentage');
      if (percentageEl) percentageEl.textContent = `${item.percentage}%`;
    }
  });

  // Update stats displays
  updateStatsDisplay('#divB .stats-container:first-child .stats-square', [
    data.evenOdd?.even || '0.00%',
    data.evenOdd?.odd || '0.00%'
  ]);

  updateStatsDisplay('#divB .stats-container:nth-child(2) .stats-square', [
    data.overUnder?.over || '0.00%',
    data.overUnder?.under || '0.00%'
  ]);

  updateStatsDisplay('#divC .stats-container:first-child .stats-square', [
    data.matchesDiffers?.matches || '0.00%',
    data.matchesDiffers?.differs || '0.00%'
  ]);

  updateStatsDisplay('#divC .stats-container:nth-child(2) .stats-square', [
    data.riseFall?.rise || '0.0%',
    data.riseFall?.fall || '0.0%'
  ]);

  // Highlight active digit
  updateDigitColors(data.currentDigit);
}

function updateStatsDisplay(selector, values) {
  const squares = document.querySelectorAll(selector);
  squares.forEach((square, index) => {
    if (square && values[index]) {
      square.textContent = values[index];
    }
  });
}

function updateDigitColors(digit) {
  document.querySelectorAll('.number-button').forEach(button => {
    button.classList.remove('active');
  });
  const targetButton = document.querySelectorAll('.number-button')[digit];
  if (targetButton) {
    targetButton.classList.add('active');
  }
}

function showError(message) {
  const errorEl = document.getElementById('error-message') || createErrorElement();
  errorEl.textContent = message;
}

function createErrorElement() {
  const el = document.createElement('div');
  el.id = 'error-message';
  el.className = 'error-message';
  el.style.cssText = 'color: red; padding: 10px; text-align: center;';
  document.body.prepend(el);
  return el;
}