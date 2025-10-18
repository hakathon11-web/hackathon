import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBookingTimeouts } from '@/hooks/useBookingTimeouts';
import { useTranslation } from 'react-i18next';

export const useRealtimeBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Enable automatic timeout checking
  useBookingTimeouts();

  // Immediately refresh bookings after local payment success signal
  useEffect(() => {
    if (!user) return;
    const handleImmediateRefresh = () => {
      console.log('⚡ Immediate refresh requested after payment success');
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user.id] });
      queryClient.refetchQueries({ queryKey: ['user-bookings', user.id] });
    };
    window.addEventListener('booking-created-successfully', handleImmediateRefresh);
    return () => window.removeEventListener('booking-created-successfully', handleImmediateRefresh);
  }, [user, queryClient]);

  useEffect(() => {
    if (!user) return;

    console.log('🔔 User: Setting up real-time booking subscription for user:', user.id);

    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events for debugging
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔🔔🔔 User: ANY booking event received:', {
            event: payload.eventType,
            timestamp: new Date().toISOString(),
            payload: payload,
            userId: user.id
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔 User: New booking created:', payload);
          // Do not skip pending inserts with null service_id — legitimate bookings are created
          // in confirm-payment with status pending and services stored in booking_services.
          // We want the widget to reflect them immediately.
          
          // Fetch venue name for the notification
          const { data: venue } = await supabase
            .from('venues')
            .select('name')
            .eq('id', payload.new.venue_id)
            .single();

          const venueName = (venue as any)?.name || 'venue';
          
          // Show success notification for new booking
          toast({
            title: t('realtimeBookings.bookingCreated.title'),
            description: t('realtimeBookings.bookingCreated.description', { venueName }),
            duration: 5000,
          });

          // Update booking queries in cache to show new booking in widget
          console.log('🔄 User: Invalidating queries after new booking...');
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['user-bookings', user.id] }); // Fixed: include user.id
          queryClient.invalidateQueries({ queryKey: ['reviewed-booking-ids'] });
          
          // Force refetch to ensure immediate UI update
          queryClient.refetchQueries({ queryKey: ['user-bookings', user.id] });
          console.log('✅ User: Queries invalidated and refetched');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🚨🚨🚨 DETAILED DEBUG - User: Booking UPDATE event received 🚨🚨🚨');
          console.log('📋 Full payload:', JSON.stringify(payload, null, 2));
          
          // BULLETPROOF FILTER: If booking is hidden from widget, NEVER process it
          if (payload.new && payload.new.hidden_from_widget === true) {
            console.log('🛑 BULLETPROOF FILTER: Booking is hidden from widget - COMPLETELY IGNORING ALL UPDATES');
            console.log('🛑 This prevents ANY status notifications for hidden bookings');
            return;
          }
          
          // FILTER: Skip processing if this is a temporary booking created during service selection
          // Temporary bookings typically have no service_id and are created during the booking dialog process
          if (!payload.new.service_id && payload.new.status === 'pending') {
            console.log('🛑 FILTER: Skipping temporary booking update during service selection - no service_id');
            return;
          }
          
          // FILTER: Skip processing if booking is very recent (less than 2 seconds) and has no service_id
          // This prevents processing of temporary booking updates created during the booking dialog
          const bookingTime = new Date(payload.new.created_at);
          const now = new Date();
          const timeDiff = now.getTime() - bookingTime.getTime();
          
          if (timeDiff < 2000 && !payload.new.service_id) {
            console.log('🛑 TEMPORAL FILTER: Skipping very recent temporary booking update (created during dialog)');
            return;
          }
          
          // Additional safety: Check for recent hide operations by looking at updated_at timestamp
          if (payload.new && (payload.new as any).updated_at) {
            const updateTime = new Date((payload.new as any).updated_at);
            const now = new Date();
            const timeDiff = now.getTime() - updateTime.getTime();
            
            // If updated less than 5 seconds ago and involves any status that could trigger notifications
            if (timeDiff < 5000 && payload.new.status === 'confirmed') {
              console.log('🛑 TEMPORAL FILTER: Recent update with confirmed status - might be widget hiding, ignoring');
              return;
            }
          }
          
          console.log('✅ PASSED ALL FILTERS: Processing status change notification');
          
          const newStatus = payload.new.status;
          
          // Since payload.old.status is often undefined in real-time events,
          // we'll process all meaningful status changes
          if (newStatus && (newStatus === 'confirmed' || newStatus === 'rejected' || newStatus === 'expired' || newStatus === 'cancelled' || newStatus === 'completed')) {
            console.log('🎯 User: Processing status change to:', newStatus);
            // Broadcast status change for timer updates
            window.dispatchEvent(new CustomEvent('booking-status-changed', {
              detail: { bookingId: payload.new.id, newStatus }
            }));
            
            // Fetch venue name for the notification
            const { data: venue } = await supabase
              .from('venues')
              .select('name')
              .eq('id', payload.new.venue_id)
              .single();
            const venueName = (venue as any)?.name || 'venue';
            
            if (newStatus === 'confirmed') {
              toast({
                title: t('realtimeBookings.bookingConfirmed.title'),
                description: t('realtimeBookings.bookingConfirmed.description', { venueName }),
                duration: 5000,
              });
            } else if (newStatus === 'completed') {
              toast({
                title: t('realtimeBookings.bookingCompleted.title'),
                description: t('realtimeBookings.bookingCompleted.description', { venueName }),
                duration: 5000,
              });
            } else if (newStatus === 'rejected') {
              toast({
                title: t('realtimeBookings.bookingRejected.title'),
                description: t('realtimeBookings.bookingRejected.description', { venueName }),
                variant: "destructive",
                duration: 5000,
              });
            } else if (newStatus === 'cancelled') {
              toast({
                title: t('realtimeBookings.bookingCancelled.title'),
                description: t('realtimeBookings.bookingCancelled.description', { venueName }),
                variant: "destructive",
                duration: 5000,
              });
            } else if (newStatus === 'expired') {
              toast({
                title: t('realtimeBookings.bookingExpired.title'),
                description: t('realtimeBookings.bookingExpired.description', { venueName }),
                variant: "destructive",
                duration: 5000,
              });
            }

            // Update booking queries in cache with correct keys
            console.log('🔄 User: Invalidating queries after status change...');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['user-bookings', user.id] }); // Fixed: include user.id
            queryClient.invalidateQueries({ queryKey: ['reviewed-booking-ids'] });
            
            // Force refetch to ensure immediate UI update
            queryClient.refetchQueries({ queryKey: ['user-bookings', user.id] });
            console.log('✅ User: Queries invalidated and refetched');
          }
        }
      )
      .subscribe(async (status, error) => {
        console.log('📡 User: Realtime subscription status:', status, {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        if (error) {
          console.error('❌ User: Realtime subscription error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ User: Successfully subscribed to booking changes for user:', user.id);
          console.log('🔍 User: Filter applied:', `user_id=eq.${user.id}`);
        }
      });

    return () => {
      console.log('🔔 User: Unsubscribing from booking changes');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);
};