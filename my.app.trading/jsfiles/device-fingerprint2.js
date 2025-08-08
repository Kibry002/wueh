// device-fingerprint.js (Stable & Robust Version)
(() => {
  // Utility: Generate a stable device fingerprint
  async function generateFingerprint() {
    // Try to reuse existing fingerprint
    let fingerprint = localStorage.getItem('deviceId');
    if (fingerprint) return fingerprint;

    // Use only stable properties
    const components = [
      navigator.userAgent,
      navigator.platform,
      navigator.vendor,
      navigator.hardwareConcurrency,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.language
    ];
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(components.join('|'));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('deviceId', fingerprint);
      return fingerprint;
    } catch (err) {
      console.error('Fingerprint generation failed:', err);
      // Simple fallback (should rarely happen)
      const fallback = btoa(components.join('|')).slice(0, 32);
      localStorage.setItem('deviceId', fallback);
      return fallback;
    }
  }

  // Device verification: Enforce device limit and registration
  window.verifyDevice = async (account) => {
    try {
      const fingerprint = await generateFingerprint();
      const user = await account.get();
      const allowedDevices = user.prefs?.allowedDevices || [];

      // Device limit (change as needed)
      const DEVICE_LIMIT = 2;

      if (!allowedDevices.includes(fingerprint)) {
        // Too many devices? Invalidate session and instruct user
        if (allowedDevices.length >= DEVICE_LIMIT) {
          await account.deleteSession('current');
          throw new Error(
            `Device limit reached (${DEVICE_LIMIT}). Please contact support.`
          );
        }
        // Register new device
        await account.updatePrefs({
          allowedDevices: [...allowedDevices, fingerprint]
        });
      }
      return true;
    } catch (error) {
      console.error('Device verification failed:', error);
      throw error;
    }
  };

  // Utility: Get the device fingerprint
  window.getDeviceFingerprint = async () => {
    return await generateFingerprint();
  };
})();
