import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

interface PartnerBookingStats {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  rejected_bookings: number;
  expired_bookings: number;
  total_revenue: number;
  upcoming_bookings: number;
}

export const usePartnerBookingStats = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['partner-booking-stats', profile?.id],
    queryFn: async (): Promise<PartnerBookingStats> => {
      if (!profile?.id) {
        return {
          total_bookings: 0,
          confirmed_bookings: 0,
          pending_bookings: 0,
          rejected_bookings: 0,
          expired_bookings: 0,
          total_revenue: 0,
          upcoming_bookings: 0
        };
      }

      // Fetch booking statistics for this partner's venues
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues!inner(partner_id, name)
        `)
        .eq('venues.partner_id', profile.id);

      if (bookingsError) throw bookingsError;

      const bookingStats = bookings.reduce((acc, booking) => {
        acc.total_bookings++;
        
        switch (booking.status) {
          case 'confirmed':
            acc.confirmed_bookings++;
            acc.total_revenue += Number(booking.total_price);
            break;
          case 'pending':
            acc.pending_bookings++;
            break;
          case 'rejected':
            acc.rejected_bookings++;
            break;
          case 'expired':
            acc.expired_bookings++;
            break;
        }

        // Check if booking is upcoming
        const bookingDate = new Date(booking.booking_date);
        const today = new Date();
        if (bookingDate >= today && booking.status === 'confirmed') {
          acc.upcoming_bookings++;
        }

        return acc;
      }, {
        total_bookings: 0,
        confirmed_bookings: 0,
        pending_bookings: 0,
        rejected_bookings: 0,
        expired_bookings: 0,
        total_revenue: 0,
        upcoming_bookings: 0
      });

      return bookingStats;
    },
    enabled: !!profile?.id,
  });
};
