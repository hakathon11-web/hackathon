import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { useToast } from '@/hooks/use-toast';
import { audioAlert } from '@/utils/audioAlert';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';
import { isBookingExpired } from '@/utils/bookingExpiration';

export const useEmployeeRealtimeBookings = () => {
  const { employee } = useEmployeeAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: systemSettings } = useSystemSettings();
  const channelRef = useRef<any>(null);
  const isSetupRef = useRef(false);

  // Helper function to check if a booking is expired using the utility
  const checkBookingExpired = (createdAt: string): boolean => {
    const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;
    return isBookingExpired(createdAt, timeoutMinutes);
  };

  useEffect(() => {
    if (!employee?.venue_id || isSetupRef.current) {
      if (!employee?.venue_id) {
        console.log('❌ No employee venue ID available for real-time bookings');
      }
      return;
    }

    console.log('✅ Setting up ENHANCED employee real-time booking subscription for venue:', employee.venue_id);
    console.log('🔧 Employee details:', { id: employee.id, username: employee.username, venue_id: employee.venue_id });
    isSetupRef.current = true;

    // Sounds are limited to new booking requests only; skip any initialization beeps

    // Setup real-time subscription with reliability features
    const setupRealtimeSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      console.log('🔧 Employee: Setting up real-time subscription for venue:', employee.venue_id);

      // Create channel with better configuration for employee access  
      channelRef.current = supabase
        .channel(`employee-bookings-${employee.venue_id}-${Date.now()}`, {
          config: {
            broadcast: { self: true },
            presence: { key: employee.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to ALL events for debugging
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            console.log('🔔🔔🔔 Employee: ANY booking event received:', {
              event: payload.eventType,
              timestamp: new Date().toISOString(),
              payload: payload,
              employeeId: employee.id,
              venueId: employee.venue_id
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            console.log('🚨🚨🚨 DETAILED DEBUG - Employee: Booking UPDATE event received 🚨🚨🚨');
            console.log('📋 Full payload:', JSON.stringify(payload, null, 2));
            
            // BULLETPROOF FILTER: If booking is hidden from widget, NEVER process it
            if (payload.new && payload.new.hidden_from_widget === true) {
              console.log('🛑 BULLETPROOF FILTER (Employee): Booking is hidden from widget - COMPLETELY IGNORING ALL UPDATES');
              return;
            }
            
            // Check if this booking is for the employee's venue
            if (payload.new.venue_id === employee.venue_id) {
              console.log('✅ Employee: Booking is for this employee\'s venue and NOT hidden from widget');
              
              console.log('✅ Employee: Booking update is for employee venue, invalidating queries');
              
              // Invalidate relevant employee booking queries
              queryClient.invalidateQueries({ queryKey: ['employee-active-bookings', employee.venue_id] });
              queryClient.invalidateQueries({ queryKey: ['employee-recent-bookings', employee.venue_id] });
              queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', employee.venue_id] });
              
              // Show notification for status changes
              if (payload.old.status !== payload.new.status) {
                const statusText = payload.new.status === 'confirmed' ? 'confirmed' : 
                                 payload.new.status === 'rejected' ? 'rejected' : 
                                 payload.new.status === 'cancelled' ? 'cancelled' : 
                                 payload.new.status === 'completed' ? 'completed' : 
                                 payload.new.status;
                
                toast({
                  title: `Booking ${statusText}`,
                  description: `Booking request has been ${statusText}`,
                  duration: 5000,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            const timestamp = new Date().toISOString();
            console.log('🔔 Employee: New booking received at', timestamp, ':', payload);
            console.log('🔔 Employee: Current venue ID:', employee.venue_id);
            console.log('🔔 Employee: Booking venue ID:', payload.new?.venue_id);
            console.log('🔔 Employee: Booking status:', payload.new?.status);
            
            // Check if this booking is for the employee's venue and is pending
            if (payload.new.venue_id === employee.venue_id && payload.new.status === 'pending') {
              // Check if the booking is expired before processing
              if (checkBookingExpired(payload.new.created_at)) {
                console.log('⏰ Employee: New booking is already expired, ignoring:', payload.new.id);
                return;
              }
              
              console.log('🚨🚨🚨 Employee: NEW PENDING BOOKING for employee venue! 🚨🚨🚨');
              console.log('🚨 Employee: About to play sound - Audio status:', audioAlert.getStatus());
              
              // FORCE audio initialization before attempting sound
              console.log('🔧 Employee: Force initializing audio for real-time event...');
              console.log('🔧 Employee: Audio status before init:', audioAlert.getStatus());
              
              try {
                const initResult = await audioAlert.emergencyAudioInit();
                console.log('✅ Employee: Emergency audio init completed, result:', initResult);
                console.log('✅ Employee: Audio status after init:', audioAlert.getStatus());
              } catch (initError) {
                console.error('❌ Employee: Emergency audio init failed:', initError);
              }
              
              // Add a small delay to ensure booking_services are fully created before invalidating queries
              // This prevents the race condition where booking_services might not be available yet
              setTimeout(async () => {
                console.log('🔄 Employee: Invalidating and refetching queries after delay to ensure booking_services are loaded');
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['employee-recent-bookings', employee.venue_id] }),
                  queryClient.invalidateQueries({ queryKey: ['employee-active-bookings', employee.venue_id] }),
                  queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', employee.venue_id] })
                ]);
                
                // Force refetch to ensure we get the latest data with booking_services
                await Promise.all([
                  queryClient.refetchQueries({ queryKey: ['employee-pending-bookings', employee.venue_id] }),
                  queryClient.refetchQueries({ queryKey: ['employee-active-bookings', employee.venue_id] })
                ]);
                
                console.log('✅ Employee: Queries invalidated and refetched successfully');
              }, 1000); // 1 second delay to allow booking_services to be created
              
              // Enhanced sound notification with improved retry mechanism
              console.log('🚨 Employee: Attempting to play booking sound with enhanced retry...');
              console.log('🚨 Employee: Audio status before sound attempt:', audioAlert.getStatus());
              
              // Check if audio is ready
              const audioStatus = audioAlert.getStatus();
              console.log('🚨 Employee: Detailed audio status:', {
                hasAudioContext: audioStatus.hasAudioContext,
                audioContextState: audioStatus.audioContextState,
                userInteracted: audioStatus.userInteracted,
                isPlaying: audioStatus.isPlaying,
                pageVisibility: audioStatus.pageVisibility
              });
              
              const soundResult = await audioAlert.playBookingSoundWithRetry(5);
              console.log('🚨 Employee: Sound result:', soundResult);
              
              if (!soundResult) {
                console.log('🔄 Employee: Booking sound failed, trying fallback notification...');
                try {
                  await audioAlert.forceResumeAudio();
                  await audioAlert.playNotificationSound(3000);
                  console.log('✅ Employee: Fallback notification sound played');
                } catch (fallbackError) {
                  console.error('🔇 Employee: All sound attempts failed:', fallbackError);
                }
              } else {
                console.log('✅ Employee: Booking sound played successfully!');
              }
              
              // Show urgent notification
              toast({
                title: "🚨 NEW BOOKING REQUEST!",
                description: "A new booking request has been received for your venue",
                duration: 8000,
              });
              
              console.log('🚨 Employee: Real-time booking notification process completed');
            } else {
              console.log('❌ Employee: Booking not relevant - venue mismatch or not pending');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_services',
          },
          async (payload) => {
            console.log('🔔 Employee: New booking service created:', payload);
            
            // When booking_services are created, invalidate and refetch queries to ensure complete data is loaded
            // This helps with the race condition where booking_services might be created after the main booking
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', employee.venue_id] }),
              queryClient.invalidateQueries({ queryKey: ['employee-active-bookings', employee.venue_id] }),
              queryClient.invalidateQueries({ queryKey: ['employee-recent-bookings', employee.venue_id] })
            ]);
            
            // Force refetch to ensure we get the latest data with booking_services
            await Promise.all([
              queryClient.refetchQueries({ queryKey: ['employee-pending-bookings', employee.venue_id] }),
              queryClient.refetchQueries({ queryKey: ['employee-active-bookings', employee.venue_id] })
            ]);
            
            console.log('🔄 Employee: Queries invalidated and refetched due to booking_services creation');
          }
        )
        .subscribe(async (status, error) => {
          console.log('📡 Employee realtime subscription status:', status);
          if (error) {
            console.error('❌ Employee realtime subscription error:', error);
            // Retry subscription on error
            setTimeout(setupRealtimeSubscription, 2000);
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ Employee successfully subscribed to booking changes for venue:', employee.venue_id);
          }
        });
    };

    // Initial setup
    setupRealtimeSubscription();

    // Auto-reconnect every 30 seconds to ensure reliability  
    const reconnectInterval = setInterval(() => {
      console.log('🔄 Employee: Refreshing realtime connection...');
      setupRealtimeSubscription();
    }, 30000);

    return () => {
      console.log('🔌 Employee: Cleaning up real-time booking notifications');
      isSetupRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      clearInterval(reconnectInterval);
    };
  }, [employee?.venue_id, queryClient, toast]);
};
