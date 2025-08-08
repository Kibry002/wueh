// app.js - Main application entry point
import { initializeMarkets, connectWebSocket } from './core.js';
import DigitFrequency from './digitFrequency.js';
import EvenOddDistribution from './evenOdd.js';
import OverUnderAnalysis from './overUnder.js';
import MatchDiffAnalysis from './matchDiff.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initializeMarkets();
    DigitFrequency.init();
    EvenOddDistribution.init();
    OverUnderAnalysis.init();
    MatchDiffAnalysis.init();
    
    // Set default market
    document.getElementById('market-select').value = '1HZ10V';
    
    // Set default active digits
    document.querySelectorAll('#divB .stats-number')[0].classList.add('active', 'default-active');
    document.querySelectorAll('#divC .stats-container:first-child .stats-number')[0].classList.add('active', 'default-active');
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Event listeners for market and ticks selection
    document.getElementById('market-select').addEventListener('change', function() {
        currentSymbol = this.value;
        // Reset all analysis modules
        DigitFrequency.init();
        EvenOddDistribution.init();
        OverUnderAnalysis.setSelectedDigit(0);
        MatchDiffAnalysis.setSelectedDigit(0);
    });
    
    document.getElementById('ticks-select').addEventListener('change', function() {
        // Trigger updates in all modules
        EvenOddDistribution.updateDisplay();
        OverUnderAnalysis.updateDisplay();
        MatchDiffAnalysis.updateDisplay();
    });
});