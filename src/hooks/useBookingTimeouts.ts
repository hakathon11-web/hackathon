import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';

export const useBookingTimeouts = () => {
  const { data: systemSettings, isLoading, error } = useSystemSettings();

  // Get timeout minutes from system settings, fallback to constant
  const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (error) {
      // Only log critical errors that need attention
      console.error('Critical: System settings failed to load');
    }
    
    // Listen for system settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      // No logging needed for normal operation
    };
    
    window.addEventListener('system-settings-changed', handleSettingsChange as EventListener);
    
    const checkExpiredBookings = async () => {
      try {
        // Calculate cutoff time based on timeout minutes in UTC (now - timeout)
        const cutoffTime = new Date(Date.now() - (timeoutMinutes * 60 * 1000)).toISOString();
        
        // Get expired bookings directly
        const { data: expiredBookings, error } = await supabase
          .from('bookings')
          .select('id, user_id, created_at, venues(name)')
          .eq('status', 'pending')
          .lt('created_at', cutoffTime);

        if (error) {
          console.error('Critical: Failed to fetch expired bookings');
          return;
        }

        if (expiredBookings && expiredBookings.length > 0) {
          // For each expired booking, invoke the edge function to update status and send emails
          for (const b of expiredBookings) {
            try {
              const { error: invokeError } = await supabase.functions.invoke('auto-reject-expired-bookings', {
                body: { bookingId: b.id }
              });
              if (invokeError) {
                console.error('Critical: Edge function failed for booking', b.id);
              }
            } catch (invokeErr) {
              console.error('Critical: Edge function invocation failed for booking', b.id);
            }
          }

          // Dispatch event for UI updates
          window.dispatchEvent(new CustomEvent('bookings-expired', {
            detail: { expiredCount: expiredBookings.length }
          }));

          // Force refresh of analytics data
          window.dispatchEvent(new CustomEvent('bookings-updated', {
            detail: { action: 'expired', count: expiredBookings.length }
          }));
        }
      } catch (error) {
        console.error('Critical: Failed to check expired bookings');
      }
    };

    // Hook into visibility/focus to run checks immediately when the app becomes active
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiredBookings();
      }
    };
    const handleFocus = () => checkExpiredBookings();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    // Run immediately
    checkExpiredBookings();

    // Set up interval to check every 5 seconds for near-instant UX
    const interval = setInterval(checkExpiredBookings, 5000);

    return () => {
      window.removeEventListener('system-settings-changed', handleSettingsChange as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [systemSettings, timeoutMinutes, isLoading, error]);
};