import { supabase } from '@/integrations/supabase/client';

/**
 * Retries fetching booking data if booking_services are missing
 * This helps handle race conditions where booking_services might not be created yet
 */
export async function fetchBookingWithRetry(
  bookingId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data: booking, error } = await supabase
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
            venue_services(
              services (
                name
              )
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        throw error;
      }

      // Check if booking_services are present
      if (booking.booking_services && booking.booking_services.length > 0) {
        console.log(`✅ Booking ${bookingId} fetched successfully with services on attempt ${attempt}`);
        return booking;
      } else if (attempt < maxRetries) {
        console.log(`⚠️ Booking ${bookingId} missing services on attempt ${attempt}, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      } else {
        console.warn(`⚠️ Booking ${bookingId} still missing services after ${maxRetries} attempts`);
        return booking; // Return even without services after max retries
      }
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`❌ Error fetching booking ${bookingId} on attempt ${attempt}, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      } else {
        console.error(`❌ Failed to fetch booking ${bookingId} after ${maxRetries} attempts:`, error);
        throw error;
      }
    }
  }
}

/**
 * Checks if a booking has complete service data
 */
export function hasCompleteBookingServices(booking: any): boolean {
  return booking.booking_services && 
         Array.isArray(booking.booking_services) && 
         booking.booking_services.length > 0;
}
