/**
 * Utility functions for duration calculations in booking services
 * Handles both duration format (HH:MM) and actual departure time scenarios
 */

export interface DurationCalculationResult {
  durationHours: number;
  actualDepartureTime: string;
  isOvernight: boolean;
}

/**
 * Calculates duration and actual departure time from arrival time and departure time/duration
 * Handles both cases:
 * 1. departureTime is actual departure time (e.g., "01:00" for 1 AM)
 * 2. departureTime is duration in HH:MM format (e.g., "02:00" for 2 hours duration)
 * 
 * @param arrivalTime - Arrival time in HH:MM format (e.g., "23:00")
 * @param departureTime - Either actual departure time or duration in HH:MM format
 * @returns DurationCalculationResult with duration, actual departure time, and overnight flag
 */
export function calculateDurationAndDepartureTime(
  arrivalTime: string,
  departureTime: string
): DurationCalculationResult {
  const arrivalDate = new Date(`2000-01-01T${arrivalTime}:00`);
  const departureDate = new Date(`2000-01-01T${departureTime}:00`);
  
  // Calculate duration assuming departureTime is actual departure time
  let diffMs = departureDate.getTime() - arrivalDate.getTime();
  let durationHours = diffMs / (1000 * 60 * 60);
  
  // Check if we need to treat departureTime as duration instead
  const shouldTreatAsDuration = durationHours < 0 || durationHours > 24;
  
  if (shouldTreatAsDuration) {
    // Parse departureTime as duration (HH:MM format)
    const [durationHoursPart, durationMinutes] = departureTime.split(':').map(Number);
    durationHours = durationHoursPart + (durationMinutes / 60);
    
    // Calculate actual departure time from arrival time + duration
    const durationMs = (durationHoursPart * 60 + durationMinutes) * 60 * 1000;
    departureDate.setTime(arrivalDate.getTime() + durationMs);
  }
  
  const actualDepartureTime = departureDate.toTimeString().slice(0, 5);
  
  // Check if this is an overnight booking (departure time is next day)
  const arrivalMinutes = timeToMinutes(arrivalTime);
  const departureMinutes = timeToMinutes(actualDepartureTime);
  const isOvernight = departureMinutes < arrivalMinutes;
  
  return {
    durationHours,
    actualDepartureTime,
    isOvernight
  };
}

/**
 * Converts time string (HH:MM) to minutes since midnight
 * @param timeStr - Time in HH:MM format
 * @returns Minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string (HH:MM)
 * @param minutes - Minutes since midnight
 * @returns Time in HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Validates that a duration calculation makes sense
 * @param arrivalTime - Arrival time in HH:MM format
 * @param departureTime - Departure time in HH:MM format
 * @param maxDurationHours - Maximum allowed duration in hours (default: 24)
 * @returns Validation result with isValid flag and error message
 */
export function validateDurationCalculation(
  arrivalTime: string,
  departureTime: string,
  maxDurationHours: number = 24
): { isValid: boolean; errorMessage?: string } {
  try {
    const result = calculateDurationAndDepartureTime(arrivalTime, departureTime);
    
    if (result.durationHours <= 0) {
      return {
        isValid: false,
        errorMessage: 'Duration must be greater than 0'
      };
    }
    
    if (result.durationHours > maxDurationHours) {
      return {
        isValid: false,
        errorMessage: `Duration cannot exceed ${maxDurationHours} hours`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: 'Invalid time format'
    };
  }
}
