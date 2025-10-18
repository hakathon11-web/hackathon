/**
 * Event Duration Utilities
 * 
 * This module provides utility functions for handling event duration calculations,
 * time rounding, and duration-related operations.
 */

import { EventStatus, EventDurationType, EventStatusInfo, getEventStatusInfo } from '@/types/eventStatus';

export interface DurationCalculationResult {
  duration: number;
  isOvernight: boolean;
  endDate: Date;
  endTime: string;
}

export interface TimeRoundingOptions {
  minuteStep?: number;
  roundUp?: boolean;
}

/**
 * Rounds a date to the next minute step
 */
export function roundDateToMinuteStep(
  date: Date, 
  options: TimeRoundingOptions = {}
): Date {
  const { minuteStep = 1, roundUp = true } = options;
  const step = Math.max(1, minuteStep);
  
  const d = new Date(date);
  const minutes = d.getMinutes();
  
  const rounded = roundUp 
    ? Math.ceil(minutes / step) * step
    : Math.floor(minutes / step) * step;
    
  if (rounded >= 60) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  } else {
    d.setMinutes(rounded, 0, 0);
  }
  
  return d;
}

/**
 * Calculates duration and end time for an event
 */
export function calculateEventDuration(
  startDate: Date,
  startTime: string,
  durationHours: number,
  isOpenDuration: boolean = false
): DurationCalculationResult {
  // Parse start time
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDateTime = new Date(startDate);
  startDateTime.setHours(hours, minutes, 0, 0);
  
  // Calculate end time
  const duration = isOpenDuration ? 24 : durationHours; // Use 24 hours as max for open duration
  const endDateTime = new Date(startDateTime.getTime() + (duration * 60 * 60 * 1000));
  
  // Check if overnight
  const isOvernight = endDateTime.getDate() !== startDateTime.getDate();
  const endDate = isOvernight ? new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate()) : startDate;
  
  // Format end time
  const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;
  
  return {
    duration,
    isOvernight,
    endDate,
    endTime
  };
}

/**
 * Gets the current effective duration of an event
 */
export function getCurrentEventDuration(
  event: {
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
    duration?: number;
  },
  currentTime: Date = new Date()
): number {
  if (!event.isOpenDuration) {
    return event.duration || 0;
  }
  
  const statusInfo = getEventStatusInfo({
    isOpenDuration: event.isOpenDuration,
    eventStatus: event.eventStatus,
    startDate: new Date(),
    startTime: '00:00',
    duration: event.duration,
    actualStartTime: event.actualStartTime,
    actualEndTime: event.actualEndTime
  });
  
  switch (statusInfo.status) {
    case EventStatus.ACTIVE:
      if (event.actualStartTime) {
        return (currentTime.getTime() - event.actualStartTime.getTime()) / (1000 * 60 * 60);
      }
      return 0;
      
    case EventStatus.ENDED:
      if (event.actualStartTime && event.actualEndTime) {
        return (event.actualEndTime.getTime() - event.actualStartTime.getTime()) / (1000 * 60 * 60);
      }
      return 0;
      
    default:
      return 0; // Scheduled events have no current duration
  }
}

/**
 * Formats duration in a human-readable way
 */
export function formatDuration(
  durationHours: number,
  options: {
    showMinutes?: boolean;
    showSeconds?: boolean;
    locale?: string;
  } = {}
): string {
  const { showMinutes = true, showSeconds = false, locale = 'en' } = options;
  
  if (durationHours < 1) {
    const minutes = Math.round(durationHours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);
  
  let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
  
  if (showMinutes && minutes > 0) {
    result += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return result;
}

/**
 * Calculates the price for an open duration event based on actual time
 */
export function calculateOpenDurationPrice(
  basePricePerHour: number,
  actualDurationHours: number,
  guestCount: number = 1,
  pricingModel?: string
): number {
  // For now, use simple per-hour pricing
  // This can be extended to support different pricing models
  return basePricePerHour * actualDurationHours * guestCount;
}

/**
 * Validates duration constraints
 */
export function validateDuration(
  duration: number,
  constraints: {
    minHours?: number;
    maxHours?: number;
    stepHours?: number;
  } = {}
): { isValid: boolean; error?: string } {
  const { minHours = 0.25, maxHours = 24, stepHours = 0.25 } = constraints;
  
  if (duration < minHours) {
    return {
      isValid: false,
      error: `Duration must be at least ${formatDuration(minHours)}`
    };
  }
  
  if (duration > maxHours) {
    return {
      isValid: false,
      error: `Duration cannot exceed ${formatDuration(maxHours)}`
    };
  }
  
  if (stepHours > 0) {
    const remainder = duration % stepHours;
    const tolerance = 0.001; // Small tolerance for floating point precision
    if (remainder > tolerance && remainder < (stepHours - tolerance)) {
      return {
        isValid: false,
        error: `Duration must be in increments of ${formatDuration(stepHours)}`
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Gets the next valid duration based on step constraints
 */
export function getNextValidDuration(
  currentDuration: number,
  stepHours: number,
  direction: 'up' | 'down' = 'up'
): number {
  if (stepHours <= 0) return currentDuration;
  
  const steps = Math.round(currentDuration / stepHours);
  const nextSteps = direction === 'up' ? steps + 1 : Math.max(0, steps - 1);
  
  return nextSteps * stepHours;
}

/**
 * Checks if a time is within business hours
 */
export function isTimeWithinBusinessHours(
  hour: number,
  minute: number,
  businessStartHour: number,
  businessEndHour: number
): boolean {
  const timeDecimal = hour + (minute / 60);
  const spansMidnight = businessEndHour < businessStartHour;
  
  if (spansMidnight) {
    // For midnight-spanning schedules (e.g., 13:00 - 03:00)
    return (timeDecimal >= businessStartHour && timeDecimal <= 23.999) || 
           (timeDecimal >= 0 && timeDecimal <= businessEndHour);
  } else {
    // Regular schedule (e.g., 09:00 - 21:00)
    return timeDecimal >= businessStartHour && timeDecimal <= businessEndHour;
  }
}
