/**
 * Comprehensive booking datetime utilities for handling overnight bookings
 * This module provides functions to work with the new datetime fields that properly handle overnight scenarios
 */

import { timeToMinutes } from './workingHours';
import { 
  createTbilisiDateTimeFromStrings, 
  formatTbilisiTime, 
  formatTbilisiDate,
  toTbilisiTime,
  getCurrentTbilisiTime
} from './timezone';

export interface BookingDateTimeInfo {
  arrivalDateTime: Date;
  departureDateTime: Date;
  isOvernight: boolean;
  durationHours: number;
  durationMinutes: number;
}

/**
 * Creates a proper DateTime for booking times, handling overnight scenarios
 * This is the new robust version that uses the datetime fields
 */
export const createBookingDateTime = (
  bookingDate: string, 
  time: string, 
  isNextDay: boolean = false
): Date => {
  // Parse the date components
  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create date in local time, adding a day if needed for overnight bookings
  const targetDay = isNextDay ? day + 1 : day;
  return new Date(year, month - 1, targetDay, hours, minutes, 0, 0);
};

/**
 * Parses booking service datetime information
 * Uses the new datetime fields for accurate overnight booking handling
 */
export const parseBookingServiceDateTime = (
  arrivalDateTime: string,
  departureDateTime: string
): BookingDateTimeInfo => {
  const arrivalDateTimeObj = new Date(arrivalDateTime);
  const departureDateTimeObj = new Date(departureDateTime);

  const isOvernight = departureDateTimeObj.getDate() !== arrivalDateTimeObj.getDate();
  const durationMs = departureDateTimeObj.getTime() - arrivalDateTimeObj.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const durationHours = durationMinutes / 60;

  return {
    arrivalDateTime: arrivalDateTimeObj,
    departureDateTime: departureDateTimeObj,
    isOvernight,
    durationHours,
    durationMinutes
  };
};

/**
 * Formats booking time range for display, handling overnight bookings
 */
export const formatBookingTimeRange = (
  arrivalDateTime: string,
  departureDateTime: string,
  options: {
    showDate?: boolean;
    showDuration?: boolean;
    locale?: string;
  } = {}
): string => {
  const { showDate = false, showDuration = false, locale = 'en' } = options;
  
  const dateTimeInfo = parseBookingServiceDateTime(
    arrivalDateTime,
    departureDateTime
  );

  const { arrivalDateTime: arrival, departureDateTime: departure, isOvernight, durationHours } = dateTimeInfo;

  // Format times in Tbilisi timezone
  const formatTime = (date: Date) => {
    return formatTbilisiTime(date, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return formatTbilisiDate(date, {
      month: 'short',
      day: 'numeric'
    });
  };

  let timeRange = `${formatTime(arrival)} - ${formatTime(departure)}`;

  if (showDate) {
    const arrivalDateStr = formatDate(arrival);
    const departureDateStr = formatDate(departure);
    
    if (isOvernight) {
      timeRange = `${arrivalDateStr} ${formatTime(arrival)} - ${departureDateStr} ${formatTime(departure)}`;
    } else {
      timeRange = `${arrivalDateStr} ${timeRange}`;
    }
  }

  if (showDuration) {
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);
    const durationStr = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    timeRange += ` (${durationStr})`;
  }

  return timeRange;
};

/**
 * Checks if a booking service is currently active
 * Uses the new datetime fields for accurate time comparison
 */
export const isBookingServiceActive = (
  arrivalDateTime: string,
  departureDateTime: string,
  currentTime: Date = getCurrentTbilisiTime()
): boolean => {
  const dateTimeInfo = parseBookingServiceDateTime(
    arrivalDateTime,
    departureDateTime
  );

  return currentTime >= dateTimeInfo.arrivalDateTime && currentTime <= dateTimeInfo.departureDateTime;
};

/**
 * Checks if a booking service has passed its departure time
 * Uses the new datetime fields for accurate time comparison
 */
export const hasBookingServicePassed = (
  arrivalDateTime: string,
  departureDateTime: string,
  currentTime: Date = getCurrentTbilisiTime()
): boolean => {
  const dateTimeInfo = parseBookingServiceDateTime(
    arrivalDateTime,
    departureDateTime
  );

  return currentTime > dateTimeInfo.departureDateTime;
};

/**
 * Gets the latest departure time across multiple booking services
 * Uses the new datetime fields for accurate overnight booking handling
 */
export const getLatestDepartureTime = (
  bookingServices: Array<{
    arrival_datetime: string;
    departure_datetime: string;
  }>
): Date | null => {
  if (!bookingServices || bookingServices.length === 0) {
    return null;
  }

  let latestDeparture: Date | null = null;

  for (const service of bookingServices) {
    const dateTimeInfo = parseBookingServiceDateTime(
      service.arrival_datetime,
      service.departure_datetime
    );

    if (!latestDeparture || dateTimeInfo.departureDateTime > latestDeparture) {
      latestDeparture = dateTimeInfo.departureDateTime;
    }
  }

  return latestDeparture;
};

/**
 * Validates that arrival and departure datetimes are consistent
 * This is a safety check to ensure the datetime fields are properly set
 */
export const validateBookingServiceDateTime = (
  arrivalDateTime: string,
  departureDateTime: string
): { isValid: boolean; errorMessage?: string } => {
  try {
    const arrival = new Date(arrivalDateTime);
    const departure = new Date(departureDateTime);

    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
      return {
        isValid: false,
        errorMessage: 'Invalid datetime format'
      };
    }

    if (departure <= arrival) {
      return {
        isValid: false,
        errorMessage: 'Departure time must be after arrival time'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: 'Error validating datetime fields'
    };
  }
};
