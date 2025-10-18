import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useUserExpiredNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) {
      console.log('❌ No user available for expired booking notifications');
      return;
    }

    console.log('🔔 Setting up expired booking notifications for user:', user.id);

    const channel = supabase
      .channel(`user-expired-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔄 Booking status update detected:', payload);
          
          // FILTER: Skip processing if this is a temporary booking created during service selection
          // Temporary bookings typically have no service_id and are created during the booking dialog process
          if (!payload.new.service_id && payload.new.status === 'pending') {
            console.log('🛑 FILTER: Skipping temporary booking expired notification during service selection - no service_id');
            return;
          }
          
          // FILTER: Skip processing if booking is very recent (less than 2 seconds) and has no service_id
          // This prevents processing of temporary booking updates created during the booking dialog
          const bookingTime = new Date(payload.new.created_at);
          const now = new Date();
          const timeDiff = now.getTime() - bookingTime.getTime();
          
          if (timeDiff < 2000 && !payload.new.service_id) {
            console.log('🛑 TEMPORAL FILTER: Skipping very recent temporary booking expired notification (created during dialog)');
            return;
          }
          
          // Check if booking was updated to expired status
          if (payload.new.status === 'expired' && payload.old.status === 'pending') {
            console.log('⏰ User booking expired, showing notification');
            
            try {
              // Get venue details for notification
              const { data: venue, error } = await supabase
                .from('venues')
                .select('name')
                .eq('id', payload.new.venue_id)
                .single();

              const venueName = venue?.name || 'venue';
              
              // Show expired notification to user
              toast({
                title: t('notifications.bookingRequestExpired.title'),
                description: t('notifications.bookingRequestExpired.description', { venueName }),
                duration: 10000,
                variant: "destructive",
              });

              // Refresh user's booking data
              queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
              queryClient.invalidateQueries({ queryKey: ['bookings'] });
              
            } catch (error) {
              console.error('Error handling expired booking notification:', error);
            }
          }
        }
      )
      .subscribe((status, error) => {
        console.log('📡 User expired notifications subscription status:', status);
        if (error) {
          console.error('❌ User expired notifications error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ User expired notifications active for:', user.id);
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from user expired notifications');
      supabase.removeChannel(channel);
    };
  }, [user, toast, queryClient, t]);
};