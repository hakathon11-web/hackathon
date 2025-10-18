import { WorkingHours, DaySchedule } from '@/components/DailyWorkingHours';

/**
 * Checks if a time range spans across midnight (e.g., 13:00-02:00)
 */
export const isOvernightSchedule = (openTime: string, closeTime: string): boolean => {
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  return closeMinutes < openMinutes;
};

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24; // Handle values > 24 hours
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Checks if a given time falls within the working hours, handling overnight schedules
 */
export const isTimeWithinWorkingHours = (
  currentTime: string,
  openTime: string,
  closeTime: string
): boolean => {
  const currentMinutes = timeToMinutes(currentTime);
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  if (isOvernightSchedule(openTime, closeTime)) {
    // Overnight schedule: either after opening time OR before closing time
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    // Regular schedule: between opening and closing time
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
};

/**
 * Calculates available minutes from current time until closing, handling overnight schedules
 */
export const getAvailableMinutesUntilClose = (
  currentTime: string,
  closeTime: string,
  openTime?: string
): number => {
  const currentMinutes = timeToMinutes(currentTime);
  const closeMinutes = timeToMinutes(closeTime);

  if (openTime && isOvernightSchedule(openTime, closeTime)) {
    // Overnight schedule
    if (currentMinutes <= closeMinutes) {
      // We're in the early morning part (before close time)
      return closeMinutes - currentMinutes;
    } else {
      // We're in the late night part (after open time)
      // Time until midnight + time from midnight to close
      return (24 * 60 - currentMinutes) + closeMinutes;
    }
  } else {
    // Regular schedule
    return Math.max(0, closeMinutes - currentMinutes);
  }
};

export const formatWorkingHours = (workingHours?: WorkingHours, openingTime?: string, closingTime?: string) => {
  // If we have the new working_hours format, use it
  if (workingHours) {
    const openDays = Object.entries(workingHours).filter(([_, schedule]) => !schedule.closed);
    
    if (openDays.length === 0) {
      return "Closed";
    }
    
    if (openDays.length === 7) {
      // All days open with same hours
      const firstDay = openDays[0][1];
      const allSameHours = openDays.every(([_, schedule]) => 
        schedule.open === firstDay.open && schedule.close === firstDay.close
      );
      
      if (allSameHours) {
        return `${formatTimeDisplay(firstDay.open)} - ${formatTimeDisplay(firstDay.close)}`;
      }
    }
    
    // Different hours for different days
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const formattedDays = dayKeys.map((key, index) => {
      const schedule = workingHours[key as keyof WorkingHours];
      if (schedule.closed) return null;
      return `${dayNames[index]}: ${formatTimeDisplay(schedule.open)}-${formatTimeDisplay(schedule.close)}`;
    }).filter(Boolean);
    
    return formattedDays.join(', ');
  }
  
  // Fallback to old format
  if (!openingTime || !closingTime) {
    return "24/7";
  }
  
  return `${formatTimeDisplay(openingTime)} - ${formatTimeDisplay(closingTime)}`;
};

export const formatTimeDisplay = (time: string) => {
  // Use 24-hour format
  return time;
};

export const getTodaySchedule = (workingHours?: WorkingHours): DaySchedule | null => {
  if (!workingHours) return null;
  
  const today = new Date().getDay();
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayKeys[today] as keyof WorkingHours;
  
  return workingHours[todayKey] || null;
};

export const getTodayScheduleDisplay = (workingHours?: WorkingHours): string => {
  const todaySchedule = getTodaySchedule(workingHours);
  
  if (!todaySchedule) {
    return "24/7";
  }
  
  if (todaySchedule.closed) {
    return "Closed today";
  }
  
  return `${todaySchedule.open} - ${todaySchedule.close}`;
};

export const isVenueOpenNow = (workingHours?: WorkingHours): boolean => {
  const todaySchedule = getTodaySchedule(workingHours);
  if (!todaySchedule || todaySchedule.closed) return false;
  
  // Use Georgia timezone (Asia/Tbilisi)
  const now = new Date();
  const georgiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tbilisi"}));
  const currentTime = `${georgiaTime.getHours().toString().padStart(2, '0')}:${georgiaTime.getMinutes().toString().padStart(2, '0')}`;
  
  return isTimeWithinWorkingHours(currentTime, todaySchedule.open, todaySchedule.close);
};

/**
 * Checks if a venue is currently bookable (considering minimum booking time requirement)
 * A venue is bookable if:
 * 1. It's open today
 * 2. Current time is within opening hours
 * 3. There's at least 1 hour available until closing time
 */
export const isVenueBookableNow = (workingHours?: WorkingHours, minimumBookingHours: number = 1): boolean => {
  const todaySchedule = getTodaySchedule(workingHours);
  if (!todaySchedule || todaySchedule.closed) return false;
  
  // Use Georgia timezone (Asia/Tbilisi)
  const now = new Date();
  const georgiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tbilisi"}));
  const currentTime = `${georgiaTime.getHours().toString().padStart(2, '0')}:${georgiaTime.getMinutes().toString().padStart(2, '0')}`;
  
  // Check if current time is within opening hours
  if (!isTimeWithinWorkingHours(currentTime, todaySchedule.open, todaySchedule.close)) {
    return false;
  }
  
  // Check if there's enough time left for minimum booking duration
  const availableMinutes = getAvailableMinutesUntilClose(currentTime, todaySchedule.close, todaySchedule.open);
  const minimumMinutes = minimumBookingHours * 60;
  
  return availableMinutes >= minimumMinutes;
};

export const getNextOpenTime = (workingHours?: WorkingHours): string | null => {
  if (!workingHours) return null;
  
  const now = new Date();
  const currentDay = now.getDay();
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Check today first
  const todayKey = dayKeys[currentDay] as keyof WorkingHours;
  const todaySchedule = workingHours[todayKey];
  
  if (!todaySchedule.closed) {
    // Use Georgia timezone (Asia/Tbilisi)
    const georgiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tbilisi"}));
    const currentTime = `${georgiaTime.getHours().toString().padStart(2, '0')}:${georgiaTime.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime < todaySchedule.open) {
      return `Today at ${formatTimeDisplay(todaySchedule.open)}`;
    }
  }
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const nextDayKey = dayKeys[nextDay] as keyof WorkingHours;
    const nextDaySchedule = workingHours[nextDayKey];
    
    if (!nextDaySchedule.closed) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${dayNames[nextDay]} at ${formatTimeDisplay(nextDaySchedule.open)}`;
    }
  }
  
  return null;
};
