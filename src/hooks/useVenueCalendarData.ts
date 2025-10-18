import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/utils/isUuid';
import { WorkingHours } from '@/components/DailyWorkingHours';

export interface VenueCalendarResource {
  id: string;
  name: string;
  service: string;
  color: string;
  isAvailable: boolean;
  serviceId: string;
  venueServiceId: string;
  maxTables: number;
  price: number;
}

export interface VenueCalendarEvent {
  id: string;
  resourceId: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  duration: number;
  color: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  bookingId?: string;
  userEmail?: string;
  guestCount?: number;
  tableConfigurations?: any[];
  totalPrice?: number;
  specialRequests?: string;
  eventType?: 'booking' | 'employee';
  pricingModel?: string;
  serviceName?: string;
  subtotal?: number;
  pricePerHour?: number;
  guest_pricing_rules?: Array<{ maxGuests: number; price: number }>;
  // Open duration fields
  isOpenDuration?: boolean;
  eventStatus?: 'active' | 'ended';
  actualStartTime?: Date;
  actualEndTime?: Date;
  // Products attached to the event
  products?: Array<{ productId: string; quantity: number }>;
  // Payment method
  paymentMethod?: string;
}

export const useVenueCalendarData = (venueId: string) => {
  return useQuery({
    queryKey: ['venue-calendar-data', venueId],
    queryFn: async () => {
      if (!venueId) {
        return { resources: [], events: [], workingHours: null };
      }

      // Fetch venue data including working hours
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('working_hours')
        .eq('id', venueId)
        .single();

      if (venueError) {
        throw venueError;
      }

      // Fetch venue calendar settings to get custom seat names and positions
      const { data: calendarSettings } = await supabase
        .from('venue_calendar_settings')
        .select('settings')
        .eq('venue_id', venueId)
        .single();

      const seatNames = (calendarSettings?.settings as any)?.seatNames || {};
      const seatPositions = (calendarSettings?.settings as any)?.seatPositions || {};

      // Fetch venue services with their details
      const { data: venueServices, error: servicesError } = await supabase
        .from('venue_services')
        .select(`
          id,
          name,
          price,
          max_tables,
          service_id,
          guest_pricing_rules,
          services (
            name,
            pricing_model,
            description,
            duration,
            table_label,
            guest_label,
            table_label_ka,
            guest_label_ka
          )
        `)
        .eq('venue_id', venueId)
        .order('price', { ascending: true });

      if (servicesError) {
        throw servicesError;
      }

      // Generate resources based on venue services
      const resources: VenueCalendarResource[] = [];
      const colorPalette = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#06b6d4', '#84cc16', '#ec4899', '#f97316', '#6366f1'
      ];

      venueServices?.forEach((venueService, serviceIndex) => {
        const serviceName = venueService.services?.name || venueService.name;
        const maxTables = venueService.max_tables || 1;
        const baseColor = colorPalette[serviceIndex % colorPalette.length];

        // Create individual seats/tables for this service
        for (let i = 1; i <= maxTables; i++) {
          const resourceId = `venue-${venueService.id}-seat-${i}`;
          const defaultName = `${serviceName} ${i}`;
          const customName = seatNames[resourceId];
          
          resources.push({
            id: resourceId,
            name: customName || defaultName,
            service: serviceName,
            color: baseColor,
            isAvailable: true,
            serviceId: venueService.service_id,
            venueServiceId: venueService.id,
            maxTables: maxTables,
            price: venueService.price
          });
        }
      });

      // Sort resources by service, then by custom position (or seat number if no custom position)
      // This ensures resources are in the correct order from the first render
      resources.sort((a, b) => {
        // First, group by service
        const serviceCompare = a.service.localeCompare(b.service);
        if (serviceCompare !== 0) return serviceCompare;
        
        // Within same service, use custom positions if available
        const posA = seatPositions[a.id];
        const posB = seatPositions[b.id];
        
        // If both have custom positions, sort by position
        if (posA !== undefined && posB !== undefined) {
          return posA - posB;
        }
        
        // If only one has a position, prioritize it
        if (posA !== undefined) return -1;
        if (posB !== undefined) return 1;
        
        // Otherwise, maintain original order by seat number from resource ID
        const seatNumA = parseInt(a.id.split('-seat-')[1] || '0');
        const seatNumB = parseInt(b.id.split('-seat-')[1] || '0');
        return seatNumA - seatNumB;
      });

      // Fetch existing bookings for this venue to create events (both customer and employee bookings)
      // Include bookings from the last 60 days to show past events while maintaining performance
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const startDate = sixtyDaysAgo.toISOString().split('T')[0];
      
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          total_price,
          status,
          user_email,
          special_requests,
          created_at,
          updated_at,
          employee_id,
          event_type,
          color,
          is_open_duration,
          event_status,
          actual_start_time,
          actual_end_time,
          payment_method,
          booking_services (
            id,
            service_id,
            arrival_datetime,
            departure_datetime,
            guest_count,
            table_configurations,
            price_per_hour,
            duration_hours,
            subtotal,
            venue_services (
              id,
              name,
              max_tables,
              services (
                name,
                pricing_model,
                table_label,
                guest_label,
                table_label_ka,
                guest_label_ka
              )
            )
          ),
          booking_products (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            venue_products (
              id,
              name,
              price
            )
          )
        `)
        .in('status', ['confirmed', 'completed'])
        .gte('booking_date', startDate)
        .order('booking_date', { ascending: true });

      if (isUuid(venueId)) {
        bookingsQuery = bookingsQuery.eq('venue_id', venueId);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        throw bookingsError;
      }

      // Convert bookings to calendar events (only confirmed/completed bookings from query)
      const events: VenueCalendarEvent[] = [];
      
      bookings?.forEach(booking => {
        booking.booking_services?.forEach((bookingService, serviceIndex) => {
          const venueService = bookingService.venue_services;
          const serviceName = venueService?.services?.name || venueService?.name || 'Unknown Service';
          const maxTables = venueService?.max_tables || 1;
          
          // Parse arrival and departure times
          const isEmployeeEvent = booking.event_type === 'employee';
          const isOpenDuration = booking.is_open_duration || false;
          const arrivalTime = isOpenDuration
            ? new Date(booking.actual_start_time || bookingService.arrival_datetime)
            : new Date(bookingService.arrival_datetime);
          const departureTime = isOpenDuration
            ? (booking.actual_end_time ? new Date(booking.actual_end_time) : new Date())
            : new Date(bookingService.departure_datetime);
          
          
          // Calculate duration in hours
          const durationMs = departureTime.getTime() - arrivalTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          
          // Format start time as HH:MM
          const startTime = `${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')}`;
          
          // Create events for each table/seat used
          const tableConfigs = bookingService.table_configurations || [];
          
          if (tableConfigs.length === 0) {
            // Fallback for old data without table configurations
            const resourceId = `venue-${venueService?.id}-seat-1`;
            const eventColor = isEmployeeEvent 
              ? (booking.color || '#10b981')
              : '#000000';

            // Convert booking products to the format expected by the calendar
            const products = booking.booking_products?.map(bp => ({
              productId: bp.product_id,
              quantity: bp.quantity
            })) || [];

            events.push({
              id: isEmployeeEvent 
                ? `employee-${booking.id}-service-${bookingService.id}-table-1`
                : `booking-${booking.id}-service-${bookingService.id}-table-1`,
              resourceId: resourceId,
              startDate: arrivalTime,
              endDate: departureTime,
              startTime: startTime,
              duration: durationHours,
              color: eventColor,
              status: booking.status,
              createdAt: new Date(booking.created_at),
              updatedAt: new Date(booking.updated_at),
              // Booking-related fields
              bookingId: booking.id,
              userEmail: booking.user_email,
              guestCount: bookingService.guest_count,
              tableConfigurations: tableConfigs,
              totalPrice: Number(booking.total_price),
              specialRequests: booking.special_requests,
              eventType: isEmployeeEvent ? 'employee' : 'booking',
              pricingModel: venueService?.services?.pricing_model,
              serviceName: serviceName,
              subtotal: Number(bookingService.subtotal),
              pricePerHour: Number(bookingService.price_per_hour),
              // Add guest pricing rules for proper pricing calculation
              guest_pricing_rules: venueService?.guest_pricing_rules,
              // Open duration fields
              isOpenDuration: booking.is_open_duration || false,
              eventStatus: booking.event_status || undefined,
              actualStartTime: booking.actual_start_time ? new Date(booking.actual_start_time) : undefined,
              actualEndTime: booking.actual_end_time ? new Date(booking.actual_end_time) : undefined,
              // Products attached to the event
              products: products,
              // Payment method
              paymentMethod: booking.payment_method || undefined,
            });
          } else {
            // Use actual seat numbers from table configurations
            for (const tableConfig of tableConfigs) {
              const seatNumber = tableConfig.table_number || 1;
              const resourceId = `venue-${venueService?.id}-seat-${seatNumber}`;
              
              const eventColor = isEmployeeEvent 
                ? (booking.color || '#10b981')
                : '#000000';

              // Convert booking products to the format expected by the calendar
              const products = booking.booking_products?.map(bp => ({
                productId: bp.product_id,
                quantity: bp.quantity
              })) || [];

              events.push({
                id: isEmployeeEvent 
                  ? `employee-${booking.id}-service-${bookingService.id}-table-${seatNumber}`
                  : `booking-${booking.id}-service-${bookingService.id}-table-${seatNumber}`,
                resourceId: resourceId,
                startDate: arrivalTime,
                endDate: departureTime,
                startTime: startTime,
                duration: durationHours,
                color: eventColor,
                status: booking.status,
                createdAt: new Date(booking.created_at),
                updatedAt: new Date(booking.updated_at),
                // Booking-related fields
                bookingId: booking.id,
                userEmail: booking.user_email,
                guestCount: bookingService.guest_count,
                tableConfigurations: tableConfigs,
                totalPrice: Number(booking.total_price),
                specialRequests: booking.special_requests,
                eventType: isEmployeeEvent ? 'employee' : 'booking',
                pricingModel: venueService?.services?.pricing_model,
                serviceName: serviceName,
                subtotal: Number(bookingService.subtotal),
                pricePerHour: Number(bookingService.price_per_hour),
                // Add guest pricing rules for proper pricing calculation
                guest_pricing_rules: venueService?.guest_pricing_rules,
                // Open duration fields
                isOpenDuration: booking.is_open_duration || false,
                eventStatus: booking.event_status || undefined,
                actualStartTime: booking.actual_start_time ? new Date(booking.actual_start_time) : undefined,
                actualEndTime: booking.actual_end_time ? new Date(booking.actual_end_time) : undefined,
                // Products attached to the event
                products: products,
                // Payment method
                paymentMethod: booking.payment_method || undefined,
              });
            }
          }
        });
      });

      return { 
        resources, 
        events, 
        workingHours: venueData?.working_hours as WorkingHours || null 
      };
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
