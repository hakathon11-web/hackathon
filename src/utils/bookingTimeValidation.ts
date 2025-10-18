import { WorkingHours, DaySchedule } from '@/components/DailyWorkingHours';
import { 
  timeToMinutes, 
  minutesToTime, 
  isOvernightSchedule, 
  getAvailableMinutesUntilClose,
  isTimeWithinWorkingHours 
} from './workingHours';
import { validateBookingTimes } from './timeValidation';

/**
 * Gets the closing time for a specific day from working hours
 */
export const getClosingTimeForDay = (
  workingHours: WorkingHours | null,
  date: Date,
  fallbackClosingTime?: string
): string | null => {
  if (!workingHours || !date) {
    return fallbackClosingTime || null;
  }

  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
  const dayOfWeek = dayKeys[date.getDay()];
  const daySchedule = workingHours[dayOfWeek] as DaySchedule;

  if (!daySchedule || daySchedule.closed) {
    return null; // Venue is closed on this day
  }

  return daySchedule.close;
};

/**
 * Calculates the maximum booking duration in minutes based on arrival time and venue closing time
 * Now supports overnight schedules (e.g., 13:00-02:00)
 */
export const getMaxBookingDuration = (
  arrivalTime: string,
  closingTime: string,
  openingTime?: string,
  maxDurationHours: number = 12
): number => {
  // Calculate available time until closing (handles overnight schedules)
  const availableMinutes = getAvailableMinutesUntilClose(arrivalTime, closingTime, openingTime);
  
  // If less than 1 hour available, return 0 (no booking possible)
  if (availableMinutes < 60) {
    return 0;
  }
  
  // Return the minimum of available time and maximum allowed duration
  const maxDurationMinutes = maxDurationHours * 60;
  return Math.min(availableMinutes, maxDurationMinutes);
};

/**
 * Validates if a departure time is valid for a given arrival time and venue closing time
 * Now supports overnight schedules (e.g., 13:00-02:00)
 */
export const validateDepartureTime = (
  arrivalTime: string,
  departureTime: string,
  closingTime: string,
  openingTime?: string
): { isValid: boolean; errorMessage?: string } => {
  const arrivalMinutes = timeToMinutes(arrivalTime);
  const departureMinutes = timeToMinutes(departureTime);
  const closingMinutes = timeToMinutes(closingTime);

  // Check if departure time is after arrival time
  // For overnight schedules, we need to handle cross-midnight scenarios
  if (openingTime && isOvernightSchedule(openingTime, closingTime)) {
    // Overnight schedule logic
    const openingMinutes = timeToMinutes(openingTime);
    
    // Both times in the same period (either both before midnight or both after midnight)
    if ((arrivalMinutes >= openingMinutes && departureMinutes >= openingMinutes) ||
        (arrivalMinutes <= closingMinutes && departureMinutes <= closingMinutes)) {
      if (departureMinutes <= arrivalMinutes) {
        return {
          isValid: false,
          errorMessage: "Departure time must be after arrival time"
        };
      }
    }
    // Arrival before midnight, departure after midnight
    else if (arrivalMinutes >= openingMinutes && departureMinutes <= closingMinutes) {
      // This is valid - crossing midnight
    }
    // Invalid combinations
    else {
      return {
        isValid: false,
        errorMessage: "Departure time must be after arrival time"
      };
    }

    // Check if departure time exceeds closing time
    if (arrivalMinutes >= openingMinutes && departureMinutes > closingMinutes && departureMinutes < openingMinutes) {
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue closing time (${closingTime})`
      };
    }
    if (arrivalMinutes <= closingMinutes && departureMinutes > closingMinutes) {
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue closing time (${closingTime})`
      };
    }
  } else {
    // Regular schedule logic
    if (departureMinutes <= arrivalMinutes) {
      return {
        isValid: false,
        errorMessage: "Departure time must be after arrival time"
      };
    }

    // Check if departure time exceeds closing time
    if (departureMinutes > closingMinutes) {
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue closing time (${closingTime})`
      };
    }
  }

  return { isValid: true };
};

/**
 * Generates available duration options based on arrival time and venue closing time
 * Now supports overnight schedules (e.g., 13:00-02:00)
 */
export const generateDurationOptions = (
  arrivalTime: string,
  closingTime: string,
  openingTime?: string,
  maxDurationHours: number = 12
): Array<{ label: string; value: string; totalMinutes: number }> => {
  const maxDuration = getMaxBookingDuration(arrivalTime, closingTime, openingTime, maxDurationHours);
  const options: Array<{ label: string; value: string; totalMinutes: number }> = [];

  // Generate duration options in 30-minute increments, starting from 1 hour (60 minutes)
  for (let minutes = 60; minutes <= maxDuration; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let label: string;
    if (hours === 0) {
      label = `${remainingMinutes} min`;
    } else if (remainingMinutes === 0) {
      label = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      label = `${hours}h ${remainingMinutes}m`;
    }

    const value = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
    options.push({ label, value, totalMinutes: minutes });
  }

  return options;
};

/**
 * Calculates the actual departure time based on arrival time and duration
 */
export const calculateDepartureTime = (arrivalTime: string, durationMinutes: number): string => {
  const arrivalMinutes = timeToMinutes(arrivalTime);
  const departureMinutes = arrivalMinutes + durationMinutes;
  return minutesToTime(departureMinutes);
};

/**
 * Validates if a booking time range is within venue working hours
 * Now supports overnight schedules (e.g., 13:00-02:00)
 * 
 * @deprecated Use validateBookingTimes from timeValidation.ts instead
 */
export const validateBookingTimeRange = (
  arrivalTime: string,
  departureTime: string,
  workingHours: WorkingHours | null,
  date: Date,
  fallbackOpeningTime?: string,
  fallbackClosingTime?: string
): { isValid: boolean; errorMessage?: string } => {
  const result = validateBookingTimes(arrivalTime, departureTime, {
    workingHours,
    selectedDate: date,
    fallbackOpeningTime,
    fallbackClosingTime,
    minimumBookingMinutes: 60
  });

  return {
    isValid: result.isValid,
    errorMessage: result.errorMessage
  };
};
