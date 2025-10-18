import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';
import { filterNonExpiredBookings } from '@/utils/bookingExpiration';
import { hasCompleteBookingServices } from '@/utils/bookingDataRetry';

interface EmployeePendingBookingService {
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
}

interface EmployeePendingBooking {
  id: string;
  booking_date: string;
  total_price: number;
  status: string;
  user_email: string;
  venue_name: string;
  created_at: string;
  venue_id?: string;
  venue_images?: string[];
  special_requests?: string;
  booking_services?: EmployeePendingBookingService[];
}

export const useEmployeePendingBookings = (venueId: string) => {
  const { data: systemSettings } = useSystemSettings();
  
  return useQuery({
    queryKey: ['employee-pending-bookings', venueId],
    queryFn: async () => {
      if (!venueId) return [] as EmployeePendingBooking[];

      let q = supabase
        .from('bookings')
        .select(`
          *,
          venues!inner(name),
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
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { isUuid } = await import('@/utils/isUuid');
      if (isUuid(venueId)) {
        q = q.eq('venue_id', venueId);
      }

      const { data: bookings, error } = await q;

      if (error) {
        console.error('Error fetching employee pending bookings:', error);
        throw error;
      }

      const formatted: EmployeePendingBooking[] = (bookings || []).map((booking: any) => {
        // Log if booking_services are missing to help debug the race condition
        if (!hasCompleteBookingServices(booking)) {
          console.warn(`⚠️ Employee: Booking ${booking.id} has no booking_services yet - this might be a race condition`);
        }
        
        return {
          id: booking.id,
          booking_date: booking.booking_date,
          total_price: Number(booking.total_price),
          status: booking.status,
          user_email: booking.user_email,
          venue_name: booking.venues.name,
          created_at: booking.created_at,
          venue_id: booking.venue_id,
          venue_images: booking.venue_images,
          special_requests: booking.special_requests,
          booking_services: (booking.booking_services || []).map((service: any) => ({
            ...service,
            table_configurations: typeof service.table_configurations === 'string'
              ? JSON.parse(service.table_configurations)
              : service.table_configurations
          }))
        };
      });

      // Filter out expired bookings based on timeout
      const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;
      const nonExpiredBookings = filterNonExpiredBookings(formatted, timeoutMinutes);

      console.log(`Employee pending bookings: ${formatted.length} total, ${nonExpiredBookings.length} non-expired (timeout: ${timeoutMinutes}min)`);

      return nonExpiredBookings;
    },
    enabled: !!venueId,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    staleTime: 5000, // Consider data stale after 5 seconds to ensure fresh data
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};


