import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeRecentBooking {
  id: string;
  booking_date: string;
  total_price: number;
  status: string;
  user_email: string;
  venue_name: string;
  created_at: string;
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

export const useEmployeeRecentBookings = (venueId: string) => {
  return useQuery({
    queryKey: ['employee-recent-bookings', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      // Get today and yesterday dates
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      console.log('📅 Employee Recent Bookings - Date range:', {
        today: todayStr,
        yesterday: yesterdayStr,
        venueId
      });

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
        .in('booking_date', [todayStr, yesterdayStr])
        .order('created_at', { ascending: false });

      const { isUuid } = await import('@/utils/isUuid');
      if (isUuid(venueId)) {
        q = q.eq('venue_id', venueId);
      }

      const { data: bookings, error } = await q;

      if (error) {
        console.error('Error fetching employee recent bookings:', error);
        throw error;
      }

      // Format the bookings
      const formattedBookings: EmployeeRecentBooking[] = (bookings || []).map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        total_price: Number(booking.total_price),
        status: booking.status,
        user_email: booking.user_email,
        venue_name: booking.venues.name,
        created_at: booking.created_at,
        booking_services: (booking.booking_services || []).map(service => ({
          ...service,
          table_configurations: typeof service.table_configurations === 'string' 
            ? JSON.parse(service.table_configurations) 
            : service.table_configurations
        }))
      }));

      console.log('✅ Employee Recent Bookings fetched:', {
        totalBookings: formattedBookings.length,
        todayBookings: formattedBookings.filter(b => b.booking_date === todayStr).length,
        yesterdayBookings: formattedBookings.filter(b => b.booking_date === yesterdayStr).length
      });

      return formattedBookings;
    },
    enabled: !!venueId,
    staleTime: 20000,
    gcTime: 300000,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 20000
  });
};
