import { useEffect } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useQueryClient } from '@tanstack/react-query';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';

/**
 * Hook to ensure timer synchronization across partner and client components
 * Forces all timer-related components to use the admin-configured timeout
 */
export const useTimerSync = () => {
  const { data: systemSettings } = useSystemSettings();
  const queryClient = useQueryClient();
  
  const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;
  
  useEffect(() => {
    console.log('⏱️ Timer Sync - Current admin timeout:', timeoutMinutes, 'minutes');
    
    // Force refresh of all booking-related queries when timeout changes
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    
    // Broadcast the current timeout to all components
    window.dispatchEvent(new CustomEvent('admin-timeout-sync', {
      detail: { timeoutMinutes }
    }));
    
  }, [timeoutMinutes, queryClient]);
  
  return { timeoutMinutes };
};