import { Booking } from '@/hooks/useBookings';
import { timeToMinutes } from './workingHours';
import { getLatestDepartureTime as getLatestDepartureTimeFromServices } from './bookingDateTime';

/**
 * Creates a proper DateTime for booking times, handling overnight scenarios
 * @deprecated Use parseBookingServiceDateTime from bookingDateTime.ts instead
 */
const createBookingDateTime = (bookingDate: string, time: string, isNextDay: boolean = false): Date => {
  // Parse the date components
  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create date in local time, adding a day if needed for overnight bookings
  const targetDay = isNextDay ? day + 1 : day;
  return new Date(year, month - 1, targetDay, hours, minutes, 0, 0);
};

export interface BookingStatusInfo {
  isConfirmed: boolean;
  isCompleted: boolean;
  latestDepartureTime: Date | null;
  hasPassedDepartureTime: boolean;
}

/**
 * Determines if a booking is confirmed (departure time hasn't passed) or completed (departure time has passed)
 * For bookings with multiple services from the same venue, uses the latest departure time among them
 * 
 * @param booking - The booking object with booking_services array
 * @param currentTime - Optional current time (defaults to now)
 * @returns BookingStatusInfo object with status details
 */
export function getBookingStatusInfo(
  booking: Booking, 
  currentTime: Date = new Date()
): BookingStatusInfo {
  // If booking is not confirmed or completed, it can't be active or completed
  if (booking.status !== 'confirmed' && booking.status !== 'completed') {
    return {
      isConfirmed: false,
      isCompleted: false,
      latestDepartureTime: null,
      hasPassedDepartureTime: false
    };
  }

  let latestDepartureTime: Date | null = null;

  // Check if booking has individual services with departure times
  if (booking.booking_services && booking.booking_services.length > 0) {
    // Use the new robust datetime handling
    latestDepartureTime = getLatestDepartureTimeFromServices(
      booking.booking_services.map(service => ({
        arrival_datetime: service.arrival_datetime,
        departure_datetime: service.departure_datetime
      }))
    );
  } else {
    // Fallback: use main booking time with 1 hour duration
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    latestDepartureTime = new Date(bookingDateTime.getTime() + 60 * 60 * 1000); // 1 hour
  }

  const hasPassedDepartureTime = latestDepartureTime ? latestDepartureTime < currentTime : false;

  return {
    isConfirmed: booking.status === 'confirmed' && !hasPassedDepartureTime,
    isCompleted: booking.status === 'completed' || (booking.status === 'confirmed' && hasPassedDepartureTime),
    latestDepartureTime,
    hasPassedDepartureTime
  };
}

/**
 * Filters an array of bookings to return only confirmed bookings (departure time hasn't passed)
 * 
 * @param bookings - Array of booking objects
 * @param currentTime - Optional current time (defaults to now)
 * @returns Array of confirmed bookings
 */
export function getConfirmedBookings(
  bookings: Booking[], 
  currentTime: Date = new Date()
): Booking[] {
  return bookings.filter(booking => {
    const statusInfo = getBookingStatusInfo(booking, currentTime);
    return statusInfo.isConfirmed;
  });
}

/**
 * Filters an array of bookings to return only completed bookings (departure time has passed)
 * 
 * @param bookings - Array of booking objects
 * @param currentTime - Optional current time (defaults to now)
 * @returns Array of completed bookings
 */
export function getCompletedBookings(
  bookings: Booking[], 
  currentTime: Date = new Date()
): Booking[] {
  return bookings.filter(booking => {
    const statusInfo = getBookingStatusInfo(booking, currentTime);
    return statusInfo.isCompleted;
  });
}

/**
 * Checks if a specific booking has passed its departure time
 * 
 * @param booking - The booking object
 * @param currentTime - Optional current time (defaults to now)
 * @returns true if departure time has passed, false otherwise
 */
export function hasBookingPassedDepartureTime(
  booking: Booking, 
  currentTime: Date = new Date()
): boolean {
  const statusInfo = getBookingStatusInfo(booking, currentTime);
  return statusInfo.hasPassedDepartureTime;
}

/**
 * Gets the latest departure time for a booking across all its services
 * 
 * @param booking - The booking object
 * @returns Date object of the latest departure time, or null if no departure times found
 */
export function getLatestDepartureTime(booking: Booking): Date | null {
  const statusInfo = getBookingStatusInfo(booking);
  return statusInfo.latestDepartureTime;
}
