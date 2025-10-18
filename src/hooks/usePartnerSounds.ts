import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
// Sounds disabled globally (except employee pages)
import { useQueryClient } from '@tanstack/react-query';

export const usePartnerSounds = () => {
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('🔊 usePartnerSounds initialized with profile:', profile?.id);

  useEffect(() => {
    if (!profile?.id) {
      console.log('❌ No partner profile available for sound notifications');
      return;
    }

    console.log('🔇 Partner sound notifications disabled globally. Keeping UI updates only.');

    // No audio initialization needed

    const channel = supabase
      .channel(`partner-sounds-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          console.log('🔔 NEW BOOKING - Partner sound notification triggered:', payload.new);
          
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
              title: "🚨 NEW BOOKING REQUEST!",
              description: `URGENT: New booking for ${venue.name}`,
              duration: 10000,
            });

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
          } else {
            console.log('ℹ️ Booking not for this partner');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Partner sound subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Partner sound notifications active for:', profile.id);
        }
      });

    return () => {
      console.log('🔌 Cleaning up partner sound notifications');
      supabase.removeChannel(channel);
      // No interaction listeners to remove
    };
  }, [profile?.id, toast, queryClient]);
};