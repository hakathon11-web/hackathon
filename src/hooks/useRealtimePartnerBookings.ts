import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useBookingTimeouts } from '@/hooks/useBookingTimeouts';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';
import { useTranslation } from 'react-i18next';

export const useRealtimePartnerBookings = () => {
  const { data: profile } = useProfile();
  const { data: systemSettings } = useSystemSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Enable automatic timeout checking
  useBookingTimeouts();
  
  console.log('📊 Partner real-time bookings setup - Profile:', profile?.id, 'Settings:', systemSettings);

  useEffect(() => {
    if (!profile) {
      console.log('❌ No partner profile available for real-time bookings');
      return;
    }

    console.log('✅ Setting up real-time booking subscription for partner:', profile.id);

    const channel = supabase
      .channel('partner-booking-global-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          console.log('🔔 Global booking notification - New booking request received:', payload.new);
          
          // Check if this booking is for one of the partner's venues
          const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('name, partner_id')
            .eq('id', payload.new.venue_id)
            .eq('partner_id', profile.id)
            .single();

          if (venueError) {
            console.error('Error fetching venue for booking:', venueError);
            return;
          }

          if (venue) {
            console.log('✅ Booking is for this partner - showing notification for venue:', venue.name);
            
            // Show prominent toast notification with timeout info
            const timeoutInfo = ` (Auto-reject in ${BOOKING_TIMEOUT_MINUTES} min)`;
            toast({
              title: t('partner.notifications.newBookingRequest.title'),
              description: t('partner.notifications.newBookingRequest.description', { 
                venueName: venue.name, 
                timeoutInfo 
              }),
              duration: 15000, // Show for 15 seconds
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['partner-booking-stats'] });
            
            console.log('📊 Partner booking queries invalidated');
          } else {
            console.log('❌ Booking not for this partner');
          }
        }
      )
      .subscribe((status, error) => {
        console.log('📡 Partner real-time subscription status:', status);
        if (error) {
          console.error('❌ Partner real-time subscription error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to partner booking notifications for:', profile.id);
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from partner booking notifications');
      supabase.removeChannel(channel);
    };
  }, [profile, queryClient, toast, systemSettings, t]);
};