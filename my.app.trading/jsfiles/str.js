document.addEventListener('DOMContentLoaded', function() {
  const strategies = {
    even: { 
      label: 'Even', 
      prediction: 'Even', 
      inputType: 'text', 
      readonly: true,
      allowedApproaches: ['manual', 'entry', 'count', 'advanced']
    },
    odd: { 
      label: 'Odd', 
      prediction: 'Odd', 
      inputType: 'text', 
      readonly: true,
      allowedApproaches: ['manual', 'entry', 'count', 'advanced']
    },
    over: { 
      label: 'Over', 
      prediction: '', 
      inputType: 'number', 
      readonly: false, 
      min: 0, 
      max: 9,
      allowedApproaches: ['manual', 'entry', 'count', 'advanced']
    },
    under: { 
      label: 'Under', 
      prediction: '', 
      inputType: 'number', 
      readonly: false, 
      min: 0, 
      max: 9,
      allowedApproaches: ['manual', 'entry', 'count', 'advanced']
    },
    matches: { 
      label: 'Matches', 
      prediction: '', 
      inputType: 'number', 
      readonly: false, 
      min: 0, 
      max: 9,
      allowedApproaches: ['manual']
    },
    differs: { 
      label: 'Differs', 
      prediction: '', 
      inputType: 'number', 
      readonly: false, 
      min: 0, 
      max: 9,
      allowedApproaches: ['manual', 'entry', 'count', 'advanced']
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

  const mainStrategy = document.getElementById('main-strategy');
  const subStrategy = document.getElementById('sub-strategy');
  const formsContainer = document.getElementById('forms-container');

  subStrategy.value = 'manual';
  renderForm();

  mainStrategy.addEventListener('change', function() {
    const selectedStrategy = mainStrategy.value;
    const strategy = strategies[selectedStrategy];
    updateSubStrategyOptions(strategy);
    renderForm();
  });

  subStrategy.addEventListener('change', renderForm);

  function updateSubStrategyOptions(strategy) {
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

  function renderForm() {
    const strategyKey = mainStrategy.value;
    const approachKey = subStrategy.value;
    const strategy = strategyKey ? strategies[strategyKey] : null;
    const approach = approaches[approachKey] || approaches['manual'];
    
    let formHTML = `<div class="strategy-form" data-strategy="${strategyKey || 'default'}" data-approach="${approachKey}">`;
    
    // Group stake, prediction, ticks, and martingale in an inline container
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
    
    // Close inline-form-group
    formHTML += `</div>`;
    
    // Add remaining fields outside the inline container
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
  }

  function validatePrediction(input) {
    if (input.type === 'number') {
      const value =
parseInt(input.value);
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

  renderForm();
});