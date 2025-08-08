// device-fingerprint.js
(() => {
  // Generate a persistent device fingerprint with enhanced stability
  const createFingerprint = async () => {
    try {
      // Collect device characteristics
      const components = [
        navigator.userAgent,
        navigator.hardwareConcurrency,
        `${screen.width}x${screen.height}`,
        new Date().getTimezoneOffset(),
        navigator.language,
        navigator.deviceMemory || 'unknown',
        // Check for existing fingerprint
        localStorage.getItem('deviceId') || sessionStorage.getItem('deviceId') || null
      ];

      // Create hash
      const encoder = new TextEncoder();
      const data = encoder.encode(components.filter(Boolean).join('|'));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store in multiple storage mechanisms for redundancy
      localStorage.setItem('deviceId', fingerprint);
      sessionStorage.setItem('deviceId', fingerprint);
      
      return fingerprint;
    } catch (error) {
      console.error("Fingerprint generation failed:", error);
      // Fallback to simpler fingerprint if crypto API fails
      const fallbackId = [
        navigator.userAgent,
        navigator.hardwareConcurrency,
        screen.width,
        screen.height
      ].join('|');
      return btoa(fallbackId).slice(0, 32);
    }
  };

  // Verify device against user's allowed devices
  window.verifyDevice = async (account) => {
    try {
      const fingerprint = await createFingerprint();
      const user = await account.get();
      const allowedDevices = user.prefs?.allowedDevices || [];

      if (!allowedDevices.includes(fingerprint)) {
        if (allowedDevices.length >= 2) { // Enforce 2-device limit
          await account.deleteSession('current');
          throw new Error("! please contact support.. https://wa.me/+254789504437");
        }
        
        // Add new device to allowed list
        await account.updatePrefs({
          allowedDevices: [...allowedDevices, fingerprint]
        });
      }
      
      return true;
    } catch (error) {
      console.error("Device verification failed:", error);
      throw error;
    }
  };

  // Utility function to get current device fingerprint
  window.getDeviceFingerprint = async () => {
    return await createFingerprint();
  };
})();