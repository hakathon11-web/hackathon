/**
 * Utility functions for displaying booking information consistently
 * Handles overnight bookings and provides consistent formatting across the app
 */

import { formatBookingTimeRange } from './bookingDateTime';

/**
 * Formats booking time range for display with overnight indication
 */
export const formatBookingTimeDisplay = (
  arrivalDateTime: string,
  departureDateTime: string,
  options: {
    showOvernightIndicator?: boolean;
    locale?: string;
  } = {}
): string => {
  const { showOvernightIndicator = true, locale = 'en' } = options;
  
  return formatBookingTimeRange(
    arrivalDateTime,
    departureDateTime,
    {
      showDate: false,
      showDuration: false,
      locale
    }
  );
};

/**
 * Formats booking time range for detailed display (with date and duration)
 */
export const formatBookingTimeDetailed = (
  arrivalDateTime: string,
  departureDateTime: string,
  options: {
    showDate?: boolean;
    showDuration?: boolean;
    locale?: string;
  } = {}
): string => {
  const { showDate = true, showDuration = true, locale = 'en' } = options;
  
  return formatBookingTimeRange(
    arrivalDateTime,
    departureDateTime,
    {
      showDate,
      showDuration,
      locale
    }
  );
};

/**
 * Checks if a booking service is an overnight booking
 */
export const isOvernightBooking = (
  arrivalTime: string,
  departureTime: string
): boolean => {
  const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
  const [departureHour, departureMinute] = departureTime.split(':').map(Number);
  
  const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
  const departureMinutes = departureHour * 60 + departureMinute;
  
  return departureMinutes < arrivalMinutes;
};

/**
 * Gets a simple time range string with overnight indicator
 */
export const getSimpleTimeRange = (
  arrivalTime: string,
  departureTime: string,
  showOvernightIndicator: boolean = true
): string => {
  const isOvernight = isOvernightBooking(arrivalTime, departureTime);
  const timeRange = `${arrivalTime} - ${departureTime}`;
  
  return timeRange;
};
