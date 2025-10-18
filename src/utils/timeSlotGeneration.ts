import { WorkingHours, DaySchedule } from '@/components/DailyWorkingHours';
import { format } from 'date-fns';
import { 
  isOvernightSchedule, 
  getAvailableMinutesUntilClose,
  timeToMinutes 
} from './workingHours';

export interface TimeSlotGenerationOptions {
  workingHours?: WorkingHours | null;
  selectedDate?: Date | null;
  fallbackOpeningTime?: string;
  fallbackClosingTime?: string;
  slotIntervalMinutes?: number;
  minimumBookingMinutes?: number;
  bufferMinutes?: number;
}

/**
 * Centralized time slot generation that handles both regular and overnight schedules
 */
export const generateTimeSlots = (options: TimeSlotGenerationOptions): string[] => {
  const {
    workingHours,
    selectedDate,
    fallbackOpeningTime = '09:00',
    fallbackClosingTime = '18:00',
    slotIntervalMinutes = 15,
    minimumBookingMinutes = 30,
    bufferMinutes = 15
  } = options;

  const slots: string[] = [];
  
  // Determine opening and closing times
  let openTime = fallbackOpeningTime;
  let closeTime = fallbackClosingTime;
  
  // Get working hours for the selected date
  if (workingHours && selectedDate) {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayKeys[selectedDate.getDay()];
    const daySchedule = workingHours[dayOfWeek] as DaySchedule;
    
    if (daySchedule && !daySchedule.closed) {
      openTime = daySchedule.open;
      closeTime = daySchedule.close;
    } else {
      // Venue is closed on this day
      return [];
    }
  }
  
  // Validate time format
  if (!openTime.includes(':') || !closeTime.includes(':')) {
    console.warn('Invalid time format detected, using fallback times');
    openTime = fallbackOpeningTime;
    closeTime = fallbackClosingTime;
  }
  
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  // Validate parsed numbers
  if (isNaN(openHour) || isNaN(openMinute) || isNaN(closeHour) || isNaN(closeMinute)) {
    console.warn('Invalid time values detected');
    return [];
  }
  
  // Get current time in Georgia timezone (Asia/Tbilisi) with buffer for today's bookings
  const now = new Date();
  const georgiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tbilisi"}));
  const bufferTime = new Date(georgiaTime.getTime() + bufferMinutes * 60 * 1000);
  const currentTimeString = `${bufferTime.getHours().toString().padStart(2, '0')}:${bufferTime.getMinutes().toString().padStart(2, '0')}`;
  
  // Get today's date in Georgia timezone for proper comparison
  const now_utc = new Date();
  const georgiaToday = new Date(now_utc.toLocaleString("en-US", {timeZone: "Asia/Tbilisi"}));
  const todayString = format(georgiaToday, 'yyyy-MM-dd');
  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isToday = selectedDateString === todayString;
  
  // Debug logging for overnight venues (can be removed in production)
  if (isOvernightSchedule(openTime, closeTime)) {
    console.log('⏰ OVERNIGHT VENUE DEBUG:', {
      openTime,
      closeTime,
      currentTimeString,
      todayString,
      selectedDateString,
      isToday,
      currentHour: bufferTime.getHours()
    });
  }
  
  // Check if this is an overnight schedule
  const isOvernight = isOvernightSchedule(openTime, closeTime);
  
  if (isOvernight) {
    // Handle overnight schedule: two periods
    console.log('🌙 OVERNIGHT LOGIC:', {
      openTime,
      closeTime,
      isToday,
      currentTimeString
    });
    
    // Period 1: Opening time to midnight (23:59)
    // Always generate these slots, but filter based on current time if booking for today
    generateSlotsForPeriod({
      startHour: openHour,
      startMinute: openMinute,
      endHour: 23,
      endMinute: 59,
      slotIntervalMinutes,
      minimumBookingMinutes,
      closeTime,
      openTime,
      isToday,
      currentTimeString,
      slots
    });
    
    // Period 2: Midnight (00:00) to closing time
    // For early morning slots, we need to be more careful about time filtering
    // If it's today and we're in early morning hours, we should still filter past times
    generateSlotsForPeriod({
      startHour: 0,
      startMinute: 0,
      endHour: closeHour,
      endMinute: closeMinute,
      slotIntervalMinutes,
      minimumBookingMinutes,
      closeTime,
      openTime,
      isToday: isToday, // Always respect today's time filtering
      currentTimeString,
      slots
    });
  } else {
    // Handle regular schedule: single period
    generateSlotsForPeriod({
      startHour: openHour,
      startMinute: openMinute,
      endHour: closeHour,
      endMinute: closeMinute,
      slotIntervalMinutes,
      minimumBookingMinutes,
      closeTime,
      openTime,
      isToday,
      currentTimeString,
      slots
    });
  }
  
  // Sort slots properly for overnight venues
  if (isOvernightSchedule(openTime, closeTime)) {
    // For overnight venues, sort so early morning times (00:00-closeTime) come first,
    // then late night times (openTime-23:59)
    const closeHour = parseInt(closeTime.split(':')[0]);
    const openHour = parseInt(openTime.split(':')[0]);
    
    slots.sort((a, b) => {
      const aHour = parseInt(a.split(':')[0]);
      const bHour = parseInt(b.split(':')[0]);
      
      // Determine if times are in early morning or late night period
      const aIsEarlyMorning = aHour <= closeHour;
      const bIsEarlyMorning = bHour <= closeHour;
      
      // Early morning times come first
      if (aIsEarlyMorning && !bIsEarlyMorning) return -1;
      if (!aIsEarlyMorning && bIsEarlyMorning) return 1;
      
      // Within the same period, sort normally
      return a.localeCompare(b);
    });
    
    console.log('⏰ OVERNIGHT SLOTS SORTED:', {
      totalSlots: slots.length,
      firstFew: slots.slice(0, 8),
      lastFew: slots.slice(-8)
    });
  }
  
  return slots;
};

interface SlotGenerationPeriodOptions {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotIntervalMinutes: number;
  minimumBookingMinutes: number;
  closeTime: string;
  openTime: string;
  isToday: boolean;
  currentTimeString: string;
  slots: string[];
}

/**
 * Generate time slots for a specific time period
 */
function generateSlotsForPeriod(options: SlotGenerationPeriodOptions): void {
  const {
    startHour,
    startMinute,
    endHour,
    endMinute,
    slotIntervalMinutes,
    minimumBookingMinutes,
    closeTime,
    openTime,
    isToday,
    currentTimeString,
    slots
  } = options;
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  // Round start time to nearest slot interval
  const remainder = currentMinute % slotIntervalMinutes;
  if (remainder !== 0) {
    currentMinute = currentMinute + (slotIntervalMinutes - remainder);
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
  
  // Generate slots for this period
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Check if there's enough time available until closing
    const availableMinutes = getAvailableMinutesUntilClose(timeString, closeTime, openTime);
    
    if (availableMinutes >= minimumBookingMinutes) {
      // For today's bookings, only add slots that are not in the past
      if (isToday) {
        // Always filter out past times for today's bookings, regardless of venue type
        if (timeString >= currentTimeString) {
          slots.push(timeString);
        }
      } else {
        slots.push(timeString);
      }
    }
    
    // Move to next slot
    currentMinute += slotIntervalMinutes;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
}

/**
 * Format working hours display with overnight support
 */
export const formatWorkingHoursDisplay = (openTime: string, closeTime: string): string => {
  if (isOvernightSchedule(openTime, closeTime)) {
    return `${openTime} - ${closeTime}`;
  }
  return `${openTime} - ${closeTime}`;
};

/**
 * Get working hours display text for a specific date
 */
export const getWorkingHoursForDate = (
  workingHours: WorkingHours | null,
  date: Date,
  fallbackOpenTime?: string,
  fallbackCloseTime?: string
): { openTime: string; closeTime: string; isClosed: boolean } => {
  if (!workingHours) {
    return {
      openTime: fallbackOpenTime || '00:00',
      closeTime: fallbackCloseTime || '23:59',
      isClosed: false
    };
  }

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayOfWeek = dayKeys[date.getDay()];
  const daySchedule = workingHours[dayOfWeek] as DaySchedule;

  if (!daySchedule || daySchedule.closed) {
    return {
      openTime: '',
      closeTime: '',
      isClosed: true
    };
  }

  return {
    openTime: daySchedule.open,
    closeTime: daySchedule.close,
    isClosed: false
  };
};