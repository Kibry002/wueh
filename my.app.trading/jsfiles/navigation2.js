// navigation3.js

// Get all nav items
const navItems = document.querySelectorAll('.nav-item');

// Add event listener to each nav item
navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    // Get the text content of the clicked nav item
    const navItemText = item.textContent.trim();

    // Determine which page to navigate to based on the nav item text
    switch (navItemText) {
      case 'Analysis':
        window.location.replace('analysis.html');
        break;
      case 'Signals':
        window.location.replace('signals.html');
        break;
      case 'Auto Trading':
        window.location.replace('auto-trading.html');
        break;
      case 'Manual':
        window.location.replace('manualtrading.html');
        break;
      case 'Premium Strategies':
        window.location.replace('strategies.html');
        break;
      case 'Bot Site':
        window.location.replace('botssite.html');
        break;
      case 'Logout':
        window.location.replace('index.html');
        break;
      default:
        console.log('Unknown nav item clicked');
    }
  });
});
