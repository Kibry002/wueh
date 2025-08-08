document.addEventListener('DOMContentLoaded', function() {
  // Add required CSS for number buttons
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
    .number-button.active {
      background-color: #2196F3 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);

  // Initialize state
  const state = {
    currentSymbol: '1HZ10V',
    selectedTicks: '1000',
    selectedDigit: '0',
    endpoint: 'https://logan1.onrender.com/getStats'
  };

  // Set initial market
  const marketDropdown = document.getElementById('market-select');
  if (marketDropdown) {
    marketDropdown.value = state.currentSymbol;
  } else {
    console.error('Market select dropdown not found');
    showError('Market select dropdown not found');
    return;
  }

  // Set initial ticks
  const ticksDropdown = document.getElementById('ticks-select');
  if (ticksDropdown) {
    ticksDropdown.value = state.selectedTicks;
  } else {
    console.error('Ticks select dropdown not found');
    showError('Ticks select dropdown not found');
    return;
  }

  // Initialize Chart.js
  const ctx = document.getElementById('digitChart')?.getContext('2d');
  let chart;
  if (ctx) {
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        datasets: [{
          label: 'Digit Distribution (%)',
          data: Array(10).fill(0),
          backgroundColor: [
            '#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
            '#3F51B5', '#E91E63', '#009688', '#FFC107', '#607D8B'
          ],
          borderColor: [
            '#388E3C', '#1976D2', '#D32F2F', '#F57C00', '#7B1FA2',
            '#303F9F', '#C2185B', '#00796B', '#FFA000', '#455A64'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 15, // Strictly 20% max
            ticks: {
              stepSize: 4, // Ticks at 0, 4, 8, 12, 16, 20
              callback: value => `${value}%` // Add % to y-axis labels
            },
            title: { display: true, text: 'Percentage (%)' }
          },
          x: {
            title: { display: true, text: 'Digit' }
          }
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: `Digit Distribution (Last ${state.selectedTicks} Ticks)` }
        }
      }
    });
  } else {
    console.warn('Chart canvas not found');
    showError('Chart canvas not found');
  }

  // Start polling
  setInterval(() => fetchData(state), 1000);
  fetchData(state);

  // Event listener for market change
  marketDropdown.addEventListener('change', function() {
    state.currentSymbol = this.value;
    fetchData(state);
  });

  // Event listener for ticks change
  ticksDropdown.addEventListener('change', function() {
    state.selectedTicks = this.value;
    if (chart) {
      chart.options.plugins.title.text = `Digit Distribution (Last ${state.selectedTicks} Ticks)`;
      chart.update();
    }
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
      if (data.windowSize !== state.selectedTicks) {
        console.warn(`Requested windowSize ${state.selectedTicks} but received ${data.windowSize}`);
        showError(`Data for ${data.windowSize} ticks received instead of ${state.selectedTicks}`);
      }
      updateNumberGrid(data, chart);
    } catch (error) {
      console.error('Fetch error:', error);
      showError('Connection error - retrying...');
    }
  }

  function updateNumberGrid(data, chart) {
    const buttons = document.querySelectorAll('.number-grid .number-button');

    // Validate data
    if (!data?.digitDistribution || !Array.isArray(data.digitDistribution)) {
      console.warn('Invalid or missing digitDistribution data');
      buttons.forEach(button => {
        button.querySelector('.percentage').textContent = 'N/A';
        button.classList.remove('highest', 'lowest', 'active');
      });
      if (chart) {
        chart.data.datasets[0].data = Array(10).fill(0);
        chart.update();
      }
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

    // Update number grid UI
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

    // Highlight current digit
    const currentDigit = Number(data.currentDigit);
    buttons.forEach(button => button.classList.remove('active'));
    if (currentDigit >= 0 && currentDigit <= 9 && buttons[currentDigit]) {
      buttons[currentDigit].classList.add('active');
    }

    // Update Buy/Run buttons
    const buyBtn = document.getElementById('buy-btn');
    const runBtn = document.getElementById('run-btn');
    if (buyBtn) buyBtn.textContent = data.currentPrice || 'N/A';
    if (runBtn) runBtn.textContent = data.currentDigit || 'N/A';

    // Update chart
    if (chart) {
      chart.data.datasets[0].data = percentages.map(p => p.percentage);
      chart.update();
    }
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
