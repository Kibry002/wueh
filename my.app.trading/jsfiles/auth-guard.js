// AUTH-GUARD.JS (ULTRA-FAST REDIRECT)
(function() {
  // 1. IMMEDIATE CHECK (NO DOM WAIT) - Faster than waiting for DOMContentLoaded
  if (window.location.pathname.includes('index.html')) return; // Skip login page

  // 2. LOGOUT BYPASS (FAST CLEAR)
  if (sessionStorage.getItem('logging_out') === 'true') {
    sessionStorage.removeItem('logging_out');
    return;
  }

  // 3. INSTANT LOCALSTORAGE CHECK (NO DELAY)
  if (!localStorage.getItem('appwrite_authenticated')) {
    window.location.replace('index.html'); // Instant redirect
    return;
  }

  // 4. BACKGROUND VERIFICATION (NON-BLOCKING)
  if (window.appwriteAccount) {
    window.appwriteAccount.get().catch(() => {
      localStorage.removeItem('appwrite_authenticated');
      window.location.replace('index.html'); // Fast fail redirect
    });
  }
})();