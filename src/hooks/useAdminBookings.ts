import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface AdminBooking {
  id: string;
  booking_date: string;
  total_price: number;
  status: string;
  special_requests: string | null;
  selected_games: string[] | null;
  user_email: string | null;
  created_at: string;
  venue_id: string;
  user_id: string;
  venue_name?: string;
  venue_location?: string;
  user_full_name?: string;
  user_email_profile?: string;
  booking_services?: Array<{
    id: string;
    service_id: string;
    arrival_datetime: string;
    departure_datetime: string;
    guest_count: number;
    table_configurations: any;
    price_per_hour: number;
    duration_hours: number;
    subtotal: number;
    discounted_subtotal?: number;
    venue_services: {
      services: {
        name: string;
        pricing_model?: string;
        table_label?: string;
        guest_label?: string;
        table_label_ka?: string;
        guest_label_ka?: string;
      };
    };
  }>;
}

export const useAdminBookings = (status?: string) => {
  return useQuery({
    queryKey: ['admin-bookings', status],
    queryFn: async () => {
      // First, get bookings
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          booking_services(
            id,
            service_id,
            arrival_datetime,
            departure_datetime,
            guest_count,
            table_configurations,
            price_per_hour,
            duration_hours,
            subtotal,
            discounted_subtotal,
            venue_services(
              services (
                name,
                pricing_model,
                table_label,
                guest_label,
                table_label_ka,
                guest_label_ka
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        bookingsQuery = bookingsQuery.eq('status', status);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        return [];
      }

      // Get unique venue IDs and user IDs
      const venueIds = [...new Set(bookings.map(b => b.venue_id))];
      const userIds = [...new Set(bookings.map(b => b.user_id))];

      // Fetch venues
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, location')
        .in('id', venueIds);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combine the data
      const enrichedBookings: AdminBooking[] = bookings.map(booking => {
        const venue = venues?.find(v => v.id === booking.venue_id);
        const profile = profiles?.find(p => p.id === booking.user_id);

        return {
          ...booking,
          venue_name: venue?.name || 'Unknown Venue',
          venue_location: venue?.location || 'Unknown Location',
          user_full_name: profile?.full_name || 'Guest',
          user_email_profile: profile?.email || booking.user_email || 'No email',
          selected_games: (booking as any).selected_games || [],
        };
      });

      return enrichedBookings;
    },
  });
};

export const useBookingStats = () => {
  return useQuery({
    queryKey: ['booking-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('status, total_price, created_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(b => b.status === 'pending').length,
        confirmed: data.filter(b => b.status === 'confirmed').length,
        rejected: data.filter(b => b.status === 'rejected').length,
        expired: data.filter(b => b.status === 'expired').length,
        totalRevenue: data
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + Number(b.total_price), 0),
        thisMonth: data.filter(b => {
          const bookingDate = new Date(b.created_at);
          const now = new Date();
          return bookingDate.getMonth() === now.getMonth() && 
                 bookingDate.getFullYear() === now.getFullYear();
        }).length,
      };

      return stats;
    },
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['partner-booking-stats'] });
      toast({
        title: t('adminBookings.success'),
        description: t('adminBookings.bookingStatusUpdated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('adminBookings.error'),
        description: t('adminBookings.bookingStatusUpdateFailed'),
        variant: "destructive",
      });
    },
  });
};