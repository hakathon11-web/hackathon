import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';

/**
 * Checks if a booking has expired based on its creation time and the system timeout
 * @param createdAt - The booking creation timestamp
 * @param timeoutMinutes - Optional timeout in minutes (defaults to system setting)
 * @returns true if the booking has expired, false otherwise
 */
export function isBookingExpired(
  createdAt: string, 
  timeoutMinutes: number = BOOKING_TIMEOUT_MINUTES
): boolean {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (timeoutMinutes * 60 * 1000));
  const bookingCreatedAt = new Date(createdAt);
  return bookingCreatedAt <= cutoffTime;
}

/**
 * Filters an array of bookings to exclude expired ones
 * @param bookings - Array of bookings with created_at property
 * @param timeoutMinutes - Optional timeout in minutes (defaults to system setting)
 * @returns Array of non-expired bookings
 */
export function filterNonExpiredBookings<T extends { created_at: string }>(
  bookings: T[],
  timeoutMinutes: number = BOOKING_TIMEOUT_MINUTES
): T[] {
  return bookings.filter(booking => !isBookingExpired(booking.created_at, timeoutMinutes));
}

/**
 * Gets the cutoff time for booking expiration
 * @param timeoutMinutes - Timeout in minutes
 * @returns Date object representing the cutoff time
 */
export function getBookingExpirationCutoff(timeoutMinutes: number = BOOKING_TIMEOUT_MINUTES): Date {
  const now = new Date();
  return new Date(now.getTime() - (timeoutMinutes * 60 * 1000));
}
