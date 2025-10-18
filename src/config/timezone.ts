/**
 * Timezone configuration for the application
 * Centralized timezone settings to ensure consistency across all components
 */

// Primary timezone for the application (Tbilisi, Georgia)
export const APP_TIMEZONE = 'Asia/Tbilisi';
export const APP_TIMEZONE_OFFSET = 4; // UTC+4

// Locale settings
export const DEFAULT_LOCALE = 'en-GB';
export const GEORGIAN_LOCALE = 'ka-GE';

// Date formatting options
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric'
};

export const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

export const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

export const FULL_DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

// Email formatting options (for server-side functions)
export const EMAIL_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
};

export const EMAIL_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

// CSV export formatting options
export const CSV_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
};

export const CSV_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};
