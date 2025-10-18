import { WorkingHours, DaySchedule } from '@/components/DailyWorkingHours';
import { 
  isTimeWithinWorkingHours, 
  isOvernightSchedule, 
  getAvailableMinutesUntilClose,
  timeToMinutes
} from './workingHours';
import { formatWorkingHoursDisplay } from './timeSlotGeneration';

export interface TimeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface TimeValidationContext {
  workingHours?: WorkingHours | null;
  selectedDate?: Date;
  fallbackOpeningTime?: string;
  fallbackClosingTime?: string;
  minimumBookingMinutes?: number;
}

/**
 * Gets the opening and closing times for a specific day
 */
export const getDaySchedule = (
  workingHours: WorkingHours | null | undefined,
  date: Date | undefined,
  fallbackOpeningTime?: string,
  fallbackClosingTime?: string
): { openingTime: string; closingTime: string } | null => {
  if (!date) return null;

  let openingTime: string;
  let closingTime: string;

  if (workingHours) {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayKeys[date.getDay()];
    const daySchedule = workingHours[dayOfWeek] as DaySchedule;

    if (!daySchedule || daySchedule.closed) {
      return null; // Venue is closed on this day
    }

    openingTime = daySchedule.open;
    closingTime = daySchedule.close;
  } else {
    // Fallback to old format
    openingTime = fallbackOpeningTime || '00:00';
    closingTime = fallbackClosingTime || '23:59';
  }

  return { openingTime, closingTime };
};

/**
 * Validates if an arrival time is within venue working hours
 */
export const validateArrivalTime = (
  arrivalTime: string,
  context: TimeValidationContext
): TimeValidationResult => {
  const { workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime } = context;

  const schedule = getDaySchedule(workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime);
  
  if (!schedule) {
    return {
      isValid: false,
      errorMessage: "Venue is closed on the selected day"
    };
  }

  const { openingTime, closingTime } = schedule;

  // Use overnight-aware validation
  if (!isTimeWithinWorkingHours(arrivalTime, openingTime, closingTime)) {
    const displayText = formatWorkingHoursDisplay(openingTime, closingTime);
    return {
      isValid: false,
      errorMessage: `Arrival time must be within venue hours: ${displayText}`
    };
  }

  return { isValid: true };
};

/**
 * Validates if a departure time is valid for a given arrival time and venue schedule
 */
export const validateDepartureTime = (
  arrivalTime: string,
  departureTime: string,
  context: TimeValidationContext
): TimeValidationResult => {
  const { workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime } = context;

  const schedule = getDaySchedule(workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime);
  
  if (!schedule) {
    return {
      isValid: false,
      errorMessage: "Venue is closed on the selected day"
    };
  }

  const { openingTime, closingTime } = schedule;

  const arrivalMinutes = timeToMinutes(arrivalTime);
  const departureMinutes = timeToMinutes(departureTime);
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);

  // Check if departure time is after arrival time
  if (isOvernightSchedule(openingTime, closingTime)) {
    // Overnight schedule logic
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
      const displayText = formatWorkingHoursDisplay(openingTime, closingTime);
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue hours: ${displayText}`
      };
    }
    if (arrivalMinutes <= closingMinutes && departureMinutes > closingMinutes) {
      const displayText = formatWorkingHoursDisplay(openingTime, closingTime);
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue hours: ${displayText}`
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
      const displayText = formatWorkingHoursDisplay(openingTime, closingTime);
      return {
        isValid: false,
        errorMessage: `Booking cannot extend beyond venue hours: ${displayText}`
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates if an arrival time has enough remaining time for minimum booking duration
 */
export const validateMinimumBookingTime = (
  arrivalTime: string,
  context: TimeValidationContext
): TimeValidationResult => {
  const { workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime, minimumBookingMinutes = 60 } = context;

  const schedule = getDaySchedule(workingHours, selectedDate, fallbackOpeningTime, fallbackClosingTime);
  
  if (!schedule) {
    return {
      isValid: false,
      errorMessage: "Venue is closed on the selected day"
    };
  }

  const { openingTime, closingTime } = schedule;
  const availableMinutes = getAvailableMinutesUntilClose(arrivalTime, closingTime, openingTime);

  if (availableMinutes < minimumBookingMinutes) {
    const hours = Math.floor(minimumBookingMinutes / 60);
    const minutes = minimumBookingMinutes % 60;
    const durationText = minutes === 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours}h ${minutes}m`;
    
    return {
      isValid: false,
      errorMessage: `Not enough time remaining. Minimum booking duration is ${durationText}.`
    };
  }

  return { isValid: true };
};

/**
 * Validates if a time is not in the past (for today's bookings)
 */
export const validateNotInPast = (
  time: string,
  selectedDate: Date,
  bufferMinutes: number = 2
): TimeValidationResult => {
  const now = new Date();
  
  // Create local date strings for comparison (YYYY-MM-DD format)
  const today = new Date();
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const selectedDateString = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

  if (selectedDateString === todayString) {
    const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
    const currentTimeString = `${bufferTime.getHours().toString().padStart(2, '0')}:${bufferTime.getMinutes().toString().padStart(2, '0')}`;

    if (time < currentTimeString) {
      return {
        isValid: false,
        errorMessage: `Cannot select time less than ${bufferMinutes} minutes from now`
      };
    }
  }

  return { isValid: true };
};

/**
 * Comprehensive validation for arrival and departure times
 */
export const validateBookingTimes = (
  arrivalTime: string,
  departureTime: string,
  context: TimeValidationContext
): TimeValidationResult => {
  // Validate arrival time
  const arrivalValidation = validateArrivalTime(arrivalTime, context);
  if (!arrivalValidation.isValid) {
    return arrivalValidation;
  }

  // Validate minimum booking time
  const minimumTimeValidation = validateMinimumBookingTime(arrivalTime, context);
  if (!minimumTimeValidation.isValid) {
    return minimumTimeValidation;
  }

  // Validate not in past (if date is provided)
  if (context.selectedDate) {
    const pastValidation = validateNotInPast(arrivalTime, context.selectedDate);
    if (!pastValidation.isValid) {
      return pastValidation;
    }
  }

  // Validate departure time if provided
  if (departureTime) {
    const departureValidation = validateDepartureTime(arrivalTime, departureTime, context);
    if (!departureValidation.isValid) {
      return departureValidation;
    }
  }

  return { isValid: true };
};
