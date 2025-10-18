import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
// Sounds disabled globally (except employee pages)
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useReliablePartnerSounds = () => {
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const channelRef = useRef<any>(null);
  const isSetupRef = useRef(false);

  console.log('🔊 useReliablePartnerSounds initialized with profile:', profile?.id);

  useEffect(() => {
    if (!profile?.id || isSetupRef.current) {
      if (!profile?.id) {
        console.log('❌ No partner profile available for reliable sound notifications');
      }
      return;
    }

    console.log('🔊 Setting up RELIABLE partner sound notifications for:', profile.id);
    isSetupRef.current = true;

    // Sounds disabled: skip audio initialization

    // Create reliable realtime subscription
    const setupRealtimeSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`reliable-partner-sounds-${profile.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            console.log('🔔 RELIABLE SOUND - New booking detected:', payload.new);
            
            try {
              // Check if this booking is for this partner's venue
              const { data: venue, error: venueError } = await supabase
                .from('venues')
                .select('name, partner_id')
                .eq('id', payload.new.venue_id)
                .eq('partner_id', profile.id)
                .single();

              if (venueError) {
                console.error('❌ Error checking venue for booking:', venueError);
                return;
              }

              if (venue) {
                console.log('🚨 BOOKING IS FOR THIS PARTNER - Sounds disabled. Showing toast only. Venue:', venue.name);

                // Show urgent toast
                toast({
                  title: t('partner.notifications.newBookingRequest.title'),
                  description: t('partner.notifications.newBookingRequest.descriptionNoTimeout', { venueName: venue.name }),
                  duration: 15000,
                });

                // Refresh data
                queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                queryClient.invalidateQueries({ queryKey: ['partner-booking-stats'] });
                
              } else {
                console.log('ℹ️ Booking not for this partner');
              }
            } catch (error) {
              console.error('🔥 CRITICAL ERROR in sound notification:', error);
            }
          }
        )
        .subscribe((status, error) => {
          console.log('📡 RELIABLE Partner sound subscription status:', status);
          if (error) {
            console.error('❌ RELIABLE subscription error:', error);
            // Retry subscription on error
            setTimeout(setupRealtimeSubscription, 2000);
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ RELIABLE Partner sound notifications active for:', profile.id);
          }
        });
    };

    // Initial setup
    setupRealtimeSubscription();

    // Auto-reconnect every 30 seconds to ensure reliability
    const reconnectInterval = setInterval(() => {
      console.log('🔄 RELIABLE: Refreshing realtime connection...');
      setupRealtimeSubscription();
    }, 30000);

    return () => {
      console.log('🔌 Cleaning up RELIABLE partner sound notifications');
      isSetupRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      clearInterval(reconnectInterval);
    };
  }, [profile?.id, toast, queryClient, t]);
};