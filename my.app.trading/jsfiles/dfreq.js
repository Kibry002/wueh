document.addEventListener('DOMContentLoaded', function() {
  // Add required CSS dynamically
  const style = document.createElement('style');
  style.textContent = `
    .number-button.highest {
      background-color: #4CAF50 !important;
      color: white !important;
    }
    .number-button.lowest {
      background-color: #F44336 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);

  // Initialize state
  const state = {
    currentSymbol: '1HZ10V',
    selectedTicks: '1000', // Hardcoded since ticks-select is absent
    selectedDigit: '0',
    endpoint: 'https://logan1.onrender.com/getStats'
  };

  // Set initial market
  const dropdown = document.getElementById('market-select');
  if (dropdown) {
    dropdown.value = state.currentSymbol;
  } else {
    console.error('Market select dropdown not found');
    showError('Market select dropdown not found');
    return;
  }

  // Start polling
  setInterval(() => fetchData(state), 1000);
  fetchData(state);

  // Event listener for market change
  dropdown.addEventListener('change', function() {
    state.currentSymbol = this.value;
    fetchData(state);
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
      updateNumberGrid(data);
    } catch (error) {
      console.error('Fetch error:', error);
      showError('Connection error - retrying...');
    }
  }

  function updateNumberGrid(data) {
    const buttons = document.querySelectorAll('.number-grid .number-button');

    // Validate data
    if (!data?.digitDistribution || !Array.isArray(data.digitDistribution)) {
      console.warn('Invalid or missing digitDistribution data');
      buttons.forEach(button => {
        button.querySelector('.percentage').textContent = 'N/A';
        button.classList.remove('highest', 'lowest');
      });
      return;
    }

    // Initialize percentages for all digits
    const percentages = Array.from({ length: 10 }, (_, i) => ({
      digit: i,
      percentage: 0,
      element: buttons[i]
    }));

    // Update with API data
    data.digitDistribution.forEach(item => {
      const digit = Number(item.digit);
      if (digit >= 0 && digit <= 9 && item.percentage != null) {
        percentages[digit].percentage = parseFloat(item.percentage) || 0;
      }
    });

    // Find highest and lowest percentages
    const validPercentages = percentages.map(p => p.percentage).filter(p => !isNaN(p));
    const maxPercentage = validPercentages.length ? Math.max(...validPercentages) : 0;
    const minPercentage = validPercentages.length ? Math.min(...validPercentages) : 0;

    // Update UI
    percentages.forEach(({ element, percentage }) => {
      const percentageEl = element.querySelector('.percentage');
      element.classList.remove('highest', 'lowest');

      if (percentageEl) {
        percentageEl.textContent = isNaN(percentage) ? 'N/A' : `${percentage.toFixed(1)}%`;
      }

      if (percentage === maxPercentage && maxPercentage > 0) {
        element.classList.add('highest');
      } else if (percentage === minPercentage && minPercentage < maxPercentage) {
        element.classList.add('lowest');
      }
    });

    // Update Buy/Run buttons
    const buyBtn = document.getElementById('buy-btn');
    const runBtn = document.getElementById('run-btn');
    if (buyBtn) buyBtn.textContent = data.currentPrice || 'N/A';
    if (runBtn) runBtn.textContent = data.currentDigit || 'N/A';
  }

  function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast'; // Assumes toast.css defines .toast
    toast.textContent = message;
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }
});
