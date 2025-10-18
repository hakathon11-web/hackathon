/**
 * Timezone utilities for Tbilisi, Georgia (UTC+4)
 * Ensures consistent timezone handling throughout the application
 */

import { 
  APP_TIMEZONE, 
  APP_TIMEZONE_OFFSET,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  DATETIME_FORMAT_OPTIONS
} from '../config/timezone';

// Tbilisi timezone identifier
export const TBILISI_TIMEZONE = APP_TIMEZONE;
export const TBILISI_UTC_OFFSET = APP_TIMEZONE_OFFSET;

/**
 * Creates a Date object in Tbilisi timezone
 */
export const createTbilisiDate = (dateString?: string): Date => {
  if (dateString) {
    // If we have a date string, create the date and adjust for Tbilisi timezone
    const date = new Date(dateString);
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (TBILISI_UTC_OFFSET * 3600000));
  }
  
  // Create current date in Tbilisi timezone
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (TBILISI_UTC_OFFSET * 3600000));
};

/**
 * Creates a Date object from date and time components in Tbilisi timezone
 */
export const createTbilisiDateTime = (
  year: number,
  month: number, // 1-12
  day: number,
  hours: number,
  minutes: number,
  seconds: number = 0
): Date => {
  // Create date in UTC first
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - TBILISI_UTC_OFFSET, minutes, seconds));
  return utcDate;
};

/**
 * Creates a Date object from a date string and time string in Tbilisi timezone
 */
export const createTbilisiDateTimeFromStrings = (
  dateString: string, // YYYY-MM-DD format
  timeString: string, // HH:MM format
  isNextDay: boolean = false
): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const targetDay = isNextDay ? day + 1 : day;
  
  return createTbilisiDateTime(year, month, targetDay, hours, minutes);
};

/**
 * Formats a date to Tbilisi timezone string
 */
export const formatTbilisiTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  return date.toLocaleTimeString('en-GB', {
    ...TIME_FORMAT_OPTIONS,
    ...options
  });
};

/**
 * Formats a date to Tbilisi timezone date string
 */
export const formatTbilisiDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  return date.toLocaleDateString('en-GB', {
    ...DATE_FORMAT_OPTIONS,
    ...options
  });
};

/**
 * Formats a date to Tbilisi timezone datetime string
 */
export const formatTbilisiDateTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  return date.toLocaleString('en-GB', {
    ...DATETIME_FORMAT_OPTIONS,
    ...options
  });
};

/**
 * Converts a UTC date to Tbilisi timezone
 */
export const toTbilisiTime = (utcDate: Date): Date => {
  return new Date(utcDate.getTime() + (TBILISI_UTC_OFFSET * 3600000));
};

/**
 * Converts a Tbilisi timezone date to UTC
 */
export const toUTC = (tbilisiDate: Date): Date => {
  return new Date(tbilisiDate.getTime() - (TBILISI_UTC_OFFSET * 3600000));
};

/**
 * Gets current time in Tbilisi timezone
 */
export const getCurrentTbilisiTime = (): Date => {
  return createTbilisiDate();
};

/**
 * Checks if a date is in Tbilisi timezone
 */
export const isTbilisiTime = (date: Date): boolean => {
  const tbilisiOffset = -240; // UTC+4 in minutes
  return date.getTimezoneOffset() === tbilisiOffset;
};

/**
 * Creates an ISO string in Tbilisi timezone
 */
export const toTbilisiISOString = (date: Date): string => {
  const tbilisiDate = toTbilisiTime(date);
  return tbilisiDate.toISOString();
};

/**
 * Parses an ISO string and returns a Date in Tbilisi timezone
 */
export const parseTbilisiISOString = (isoString: string): Date => {
  const utcDate = new Date(isoString);
  return toTbilisiTime(utcDate);
};
