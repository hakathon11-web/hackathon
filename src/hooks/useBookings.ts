import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Booking {
  id: string;
  venue_id: string;
  service_id: string | null;
  booking_date: string;
  booking_time: string;
  guest_count: number;
  total_price: number;
  status: string;
  special_requests: string | null;
  rejection_message: string | null;
  created_at: string;
  updated_at: string;
  venues?: {
    name: string;
    location: string;
    images: string[];
  };
  venue_services?: {
    services: {
      name: string;
      pricing_model?: string;
      table_label?: string;
      guest_label?: string;
      table_label_ka?: string;
      guest_label_ka?: string;
    };
  };
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

export const useUserBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      console.log('Fetching bookings for user:', user.id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            name,
            location,
            images
          ),
          venue_services (
            services (
              name,
              pricing_model,
              table_label,
              guest_label,
              table_label_ka,
              guest_label_ka
            )
          ),
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
        .eq('user_id', user.id)
        .eq('hidden_from_widget', false)
        .order('created_at', { ascending: false });

      console.log('Bookings query result:', { data, error });

      if (error) {
        console.error('Booking fetch error:', error);
        throw error;
      }

      return data?.map(booking => ({
        ...booking,
        booking_services: (booking.booking_services || []).map(service => ({
          ...service,
          table_configurations: typeof service.table_configurations === 'string' 
            ? JSON.parse(service.table_configurations) 
            : service.table_configurations
        }))
      })) as Booking[];
    },
    enabled: !!user,
  });
};

export const useHideBookingFromWidget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('Hiding booking from widget:', bookingId);
      
      const { error } = await supabase
        .from('bookings')
        .update({ hidden_from_widget: true })
        .eq('id', bookingId)
        .eq('user_id', user.id); // Ensure users can only hide their own bookings

      if (error) {
        console.error('Error hiding booking:', error);
        throw error;
      }

      console.log('Successfully hidden booking from widget:', bookingId);
    },
    onSuccess: () => {
      // Invalidate the user bookings query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('Cancelling booking:', bookingId);
      
      try {
        // First try the edge function
        const { data, error } = await supabase.functions.invoke('cancel-booking-request', {
          body: { bookingId }
        });

        if (error) {
          console.log('Edge function failed, trying direct database update:', error);
          
          // Fallback: Direct database update
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'cancelled',
              status_updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .eq('user_id', user.id)
            .eq('status', 'pending'); // Only allow cancelling pending bookings

          if (updateError) {
            console.error('Direct database update also failed:', updateError);
            throw updateError;
          }

          // Create notification for the user
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              booking_id: bookingId,
              type: 'booking_cancelled',
              title: 'Booking Cancelled',
              message: 'Your booking request has been cancelled successfully.',
              read: false
            });

          console.log('Successfully cancelled booking via direct update:', bookingId);
          return { success: true, method: 'direct' };
        }

        console.log('Successfully cancelled booking via edge function:', bookingId);
        return data;
      } catch (error) {
        console.error('Error cancelling booking:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all booking-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
    },
  });
};