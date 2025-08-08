// COMPLETE AUTH SYSTEM (WITHOUT FINGERPRINTING - USING EXTERNAL MODULE)
(() => {
  // 1. Configuration - List all protected pages
  const PROTECTED_PAGES = [
    'analysis.html',
    'signals.html',
    'auto-trading.html',
    'strategies.html',
    'botssite.html'
  ];

  // 2. Check if current page needs protection
  const currentPage = window.location.pathname.split('/').pop();
  const isProtectedPage = PROTECTED_PAGES.includes(currentPage);

  // 3. Prevent duplicate execution
  if (window.__authExecuted) return;
  window.__authExecuted = true;

  // 4. Auth Utilities
  const resetAllSessions = async (account) => {
    try {
      await account.deleteSession('current').catch(() => {});
      localStorage.removeItem('appwrite_authenticated');
      sessionStorage.removeItem('logging_out');
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
    } catch (error) {
      console.error('Session reset failed:', error);
    }
  };

  const redirectToLogin = () => {
    if (!window.location.pathname.endsWith('index.html')) {
      window.location.href = 'index.html';
    }
  };

  const verifySession = async (account) => {
    try {
      await account.get();
      if (!localStorage.getItem('appwrite_authenticated')) {
        redirectToLogin();
      }
      // Now using the external verifyDevice function
      if (typeof verifyDevice === 'function') {
        await verifyDevice(account);
      }
    } catch (error) {
      await resetAllSessions(account);
      redirectToLogin();
    }
  };

  const completeLogin = async (account) => {
    try {
      const session = await account.getSession('current');
      if (!session) throw new Error('No session created');
      
      // Using external device verification
      if (typeof verifyDevice === 'function') {
        await verifyDevice(account);
      }
      
      localStorage.setItem('appwrite_authenticated', 'true');
      
      // Redirect to requested page or default
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'analysis.html';
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectTo;
    } catch (error) {
      await resetAllSessions(account);
      throw error;
    }
  };

  const showError = (context, error) => {
    console.error(context, error);
    alert(`${context}: ${error.message}`);
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    const btnText = document.querySelector('.btn-text');
    if (btnText) btnText.textContent = "LOGIN";
  };

  // 5. Core Auth Setup
  const initAppwrite = () => {
    const client = new Appwrite.Client()
      .setEndpoint('https://fra.cloud.appwrite.io/v1')
      .setProject('68191c17000cf1dc5a3d');

    window.auth = {
      client,
      account: new Appwrite.Account(client)
    };

    // Auto-protect pages
    if (isProtectedPage) {
      verifySession(window.auth.account);
    }

    // Login handler
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loader = document.getElementById('loader');
      const btnText = document.querySelector('.btn-text');
      
      try {
        if (loader) loader.style.display = 'block';
        if (btnText) btnText.textContent = "AUTHENTICATING...";
        
        // Store requested page before login
        if (isProtectedPage) {
          sessionStorage.setItem('redirectAfterLogin', currentPage);
        }
        
        await resetAllSessions(window.auth.account);
        await window.auth.account.createEmailSession(
          document.getElementById('email').value,
          document.getElementById('password').value
        );
        await completeLogin(window.auth.account);
      } catch (error) {
        showError('Login Failed', error);
      }
    });
  };

  // 6. Initialize when Appwrite is loaded
  const checkAppwrite = () => {
    if (window.Appwrite) {
      initAppwrite();
    } else {
      setTimeout(checkAppwrite, 50);
    }
  };

  // Start initialization
  checkAppwrite();
})();