import { useEffect, useRef } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to ensure system settings are synchronized across all components
 * This hook should be used in the main App component to ensure global sync
 */
export const useGlobalSettingsSync = () => {
  const { data: systemSettings } = useSystemSettings();
  const queryClient = useQueryClient();
  const lastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (systemSettings?.booking_timeout_minutes) {
      const currentTimeout = systemSettings.booking_timeout_minutes;
      
      // Check if timeout has changed
      if (lastTimeoutRef.current !== currentTimeout) {
        console.log('🌐 Global Settings Sync - Timeout changed from', lastTimeoutRef.current, 'to', currentTimeout, 'minutes');
        lastTimeoutRef.current = currentTimeout;
        
        // Force refresh all timer-related queries
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
        queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
        
        // Broadcast the change globally
        window.dispatchEvent(new CustomEvent('global-timeout-change', {
          detail: { timeoutMinutes: currentTimeout }
        }));
        
        console.log('✅ Global Settings Sync - All components notified of timeout change');
      }
    }
  }, [systemSettings?.booking_timeout_minutes, queryClient]);

  // Listen for settings changes from admin panel
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      console.log('🌐 Global Settings Sync - Settings updated:', event.detail);
      
      // Force immediate refresh
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.refetchQueries({ queryKey: ['system-settings'] });
    };

    window.addEventListener('system-settings-changed', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('system-settings-changed', handleSettingsUpdate as EventListener);
    };
  }, [queryClient]);

  return systemSettings;
};