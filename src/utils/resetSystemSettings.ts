// Utility to reset system settings to ensure proper defaults
export const resetSystemSettings = () => {
  const SETTINGS_KEY = 'admin_system_settings';
  
  // Clear any cached settings
  localStorage.removeItem(SETTINGS_KEY);
  
  // Force page refresh to clear any cached data
  window.location.reload();
};

// Auto-run on import to clear any stale settings
if (typeof window !== 'undefined') {
  const SETTINGS_KEY = 'admin_system_settings';
  const stored = localStorage.getItem(SETTINGS_KEY);
  
  // If there are stored settings with old default (5 minutes), clear them
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.booking_timeout_minutes === 5) {
        console.log('🧹 Clearing old system settings with 5-minute default');
        localStorage.removeItem(SETTINGS_KEY);
      }
    } catch (e) {
      console.log('🧹 Clearing corrupted system settings');
      localStorage.removeItem(SETTINGS_KEY);
    }
  }
}