/**
 * Event Validation Utilities
 * 
 * This module provides comprehensive validation for event creation, modification,
 * and state transitions. It ensures data integrity and proper business rules.
 */

import { EventStatus, EventDurationType, checkEventConflict, getEventTimeRange } from '@/types/eventStatus';
import { validateDuration, isTimeWithinBusinessHours } from '@/utils/eventDuration';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface EventValidationOptions {
  businessStartHour?: number;
  businessEndHour?: number;
  minDurationHours?: number;
  maxDurationHours?: number;
  durationStepHours?: number;
  maxGuestCount?: number;
  requireResource?: boolean;
  requireService?: boolean;
  allowPastDates?: boolean;
}

export interface EventData {
  resourceId?: string;
  startDate?: Date;
  startTime?: string;
  duration?: number;
  guestCount?: number;
  isOpenDuration?: boolean;
  eventStatus?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
  color?: string;
  specialRequests?: string;
}

/**
 * Validates a complete event
 */
export function validateEvent(
  eventData: EventData,
  options: EventValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field validation
  if (!eventData.resourceId && options.requireResource !== false) {
    errors.push({
      field: 'resourceId',
      message: 'Seat selection is required',
      code: 'REQUIRED_RESOURCE'
    });
  }

  if (!eventData.startDate) {
    errors.push({
      field: 'startDate',
      message: 'Start date is required',
      code: 'REQUIRED_START_DATE'
    });
  }

  if (!eventData.startTime) {
    errors.push({
      field: 'startTime',
      message: 'Start time is required',
      code: 'REQUIRED_START_TIME'
    });
  }

  // Time validation
  if (eventData.startTime) {
    const timeValidation = validateTime(eventData.startTime, options);
    if (!timeValidation.isValid) {
      errors.push(...timeValidation.errors);
    }
  }

  // Duration validation
  if (!eventData.isOpenDuration && eventData.duration !== undefined) {
    const durationValidation = validateDuration(eventData.duration, {
      minHours: options.minDurationHours,
      maxHours: options.maxDurationHours,
      stepHours: options.durationStepHours
    });
    
    if (!durationValidation.isValid) {
      errors.push({
        field: 'duration',
        message: durationValidation.error || 'Invalid duration',
        code: 'INVALID_DURATION'
      });
    }
  }

  // Guest count validation
  if (eventData.guestCount !== undefined) {
    const guestValidation = validateGuestCount(eventData.guestCount, options);
    if (!guestValidation.isValid) {
      errors.push(...guestValidation.errors);
    }
  }

  // Date validation
  if (eventData.startDate) {
    const dateValidation = validateDate(eventData.startDate, options);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
  }

  // Business hours validation
  if (eventData.startTime && eventData.startDate && options.businessStartHour !== undefined && options.businessEndHour !== undefined) {
    const [hours, minutes] = eventData.startTime.split(':').map(Number);
    const isWithinHours = isTimeWithinBusinessHours(hours, minutes, options.businessStartHour, options.businessEndHour);
    
    if (!isWithinHours) {
      errors.push({
        field: 'startTime',
        message: `Time must be within business hours (${options.businessStartHour}:00 - ${options.businessEndHour}:00)`,
        code: 'OUTSIDE_BUSINESS_HOURS'
      });
    }
    
    // Check if event end time would exceed venue closing time (only for fixed duration events)
    if (!eventData.isOpenDuration && eventData.duration !== undefined) {
      const startTimeDecimal = hours + (minutes / 60);
      const endTimeDecimal = startTimeDecimal + eventData.duration;
      const spansMidnight = options.businessEndHour < options.businessStartHour;
      
      let exceedsClosingTime = false;
      
      if (spansMidnight) {
        // For midnight-spanning schedules (e.g., 18:00 to 04:00)
        if (startTimeDecimal >= options.businessStartHour) {
          // Event starts on same day, can extend to next day up to businessEndHour
          const maxAllowedEnd = 24 + options.businessEndHour;
          exceedsClosingTime = endTimeDecimal > maxAllowedEnd;
        } else if (startTimeDecimal <= options.businessEndHour) {
          // Event starts on next day (after midnight)
          exceedsClosingTime = endTimeDecimal > options.businessEndHour;
        } else {
          // Start time is in closed window
          exceedsClosingTime = true;
        }
      } else {
        // Normal schedule (e.g., 08:00 to 22:00)
        exceedsClosingTime = endTimeDecimal > options.businessEndHour;
      }
      
      if (exceedsClosingTime) {
        const endHour = Math.floor(endTimeDecimal % 24);
        const endMinute = Math.round((endTimeDecimal - Math.floor(endTimeDecimal)) * 60);
        const formattedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        const formattedClosingTime = `${String(options.businessEndHour).padStart(2, '0')}:00`;
        
        errors.push({
          field: 'duration',
          message: `Event would end at ${formattedEndTime}, exceeding venue closing time at ${formattedClosingTime}. Please reduce the duration.`,
          code: 'EXCEEDS_CLOSING_TIME'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates time format and value
 */
export function validateTime(
  time: string,
  options: EventValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    errors.push({
      field: 'startTime',
      message: 'Time must be in HH:MM format',
      code: 'INVALID_TIME_FORMAT'
    });
    return { isValid: false, errors };
  }

  const [hours, minutes] = time.split(':').map(Number);

  // Validate hours
  if (hours < 0 || hours > 23) {
    errors.push({
      field: 'startTime',
      message: 'Hours must be between 00 and 23',
      code: 'INVALID_HOURS'
    });
  }

  // Validate minutes
  if (minutes < 0 || minutes > 59) {
    errors.push({
      field: 'startTime',
      message: 'Minutes must be between 00 and 59',
      code: 'INVALID_MINUTES'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates guest count
 */
export function validateGuestCount(
  guestCount: number,
  options: EventValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(guestCount) || guestCount < 1) {
    errors.push({
      field: 'guestCount',
      message: 'Guest count must be a positive integer',
      code: 'INVALID_GUEST_COUNT'
    });
  }

  if (options.maxGuestCount && guestCount > options.maxGuestCount) {
    errors.push({
      field: 'guestCount',
      message: `Guest count cannot exceed ${options.maxGuestCount}`,
      code: 'GUEST_COUNT_TOO_HIGH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates date
 */
export function validateDate(date: Date, options: EventValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    errors.push({
      field: 'startDate',
      message: 'Invalid date',
      code: 'INVALID_DATE'
    });
    return { isValid: false, errors };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  // Allow events for today and future dates
  // If allowPastDates is true, skip this validation (for employee events)
  if (!options.allowPastDates && eventDate < today) {
    errors.push({
      field: 'startDate',
      message: 'Event date cannot be in the past',
      code: 'PAST_DATE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates event state transitions
 */
export function validateStateTransition(
  currentStatus: EventStatus,
  newStatus: EventStatus,
  durationType: EventDurationType,
  eventData?: EventData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if transition is allowed
  const allowedTransitions: Record<EventStatus, EventStatus[]> = {
    [EventStatus.SCHEDULED]: [EventStatus.ACTIVE],
    [EventStatus.ACTIVE]: [EventStatus.ENDED],
    [EventStatus.ENDED]: [] // No transitions from ended
  };

  if (durationType === EventDurationType.FIXED) {
    errors.push({
      field: 'eventStatus',
      message: 'Fixed duration events cannot change status',
      code: 'FIXED_DURATION_NO_TRANSITION'
    });
    return { isValid: false, errors };
  }

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    errors.push({
      field: 'eventStatus',
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      code: 'INVALID_TRANSITION'
    });
  }

  // Additional validation for specific transitions
  if (newStatus === EventStatus.ACTIVE) {
    if (eventData?.startDate && eventData.startTime) {
      const eventDateTime = new Date(eventData.startDate);
      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      eventDateTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      if (eventDateTime > now) {
        errors.push({
          field: 'eventStatus',
          message: 'Cannot start event before scheduled time',
          code: 'EARLY_START_NOT_ALLOWED'
        });
      }
    }
  }

  if (newStatus === EventStatus.ENDED) {
    if (!eventData?.actualStartTime) {
      errors.push({
        field: 'eventStatus',
        message: 'Cannot end event that has not been started',
        code: 'NO_ACTUAL_START_TIME'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Finds the next scheduled event for a given resource after a specific time
 */
export function findNextScheduledEvent(
  existingEvents: Array<{
    id: string;
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    eventStatus?: string;
  }>,
  resourceId: string,
  afterTime: Date,
  excludeEventId?: string
): Date | null {
  const candidateEvents = existingEvents
    .filter(event => 
      event.id !== excludeEventId && 
      event.resourceId === resourceId &&
      event.eventStatus !== 'ended' // Consider both fixed and open duration events
    )
    .map(event => {
      // Create a new date using the event's date and time in local timezone
      const [hours, minutes] = event.startTime.split(':').map(Number);
      
      // Create date in local timezone to avoid timezone conversion issues
      const eventDate = new Date(event.startDate);
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth();
      const day = eventDate.getDate();
      const startDate = new Date(year, month, day, hours, minutes, 0, 0);
      
      return { event, startDate };
    })
    .filter(({ startDate }) => startDate > afterTime)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());


  return candidateEvents.length > 0 ? candidateEvents[0].startDate : null;
}

/**
 * Validates event conflicts with existing events
 */
export function validateEventConflicts(
  candidateEvent: EventData,
  existingEvents: Array<{
    id: string;
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
  }>,
  excludeEventId?: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!candidateEvent.resourceId || !candidateEvent.startDate || !candidateEvent.startTime) {
    return { isValid: true, errors }; // Skip conflict check if basic data is missing
  }

  // For open duration events, find the next scheduled event to determine proper end time
  const [hours, minutes] = candidateEvent.startTime.split(':').map(Number);
  const candidateDate = new Date(candidateEvent.startDate);
  const candidateStartTime = new Date(candidateDate.getFullYear(), candidateDate.getMonth(), candidateDate.getDate(), hours, minutes, 0, 0);

  console.log('🔍 About to call findNextScheduledEvent:', {
    candidateStartTime: candidateStartTime.toISOString(),
    resourceId: candidateEvent.resourceId,
    isOpenDuration: candidateEvent.isOpenDuration
  });

  const nextScheduledEvent = candidateEvent.isOpenDuration 
    ? findNextScheduledEvent(existingEvents, candidateEvent.resourceId, candidateStartTime, excludeEventId)
    : null;

  console.log('🔍 findNextScheduledEvent result:', nextScheduledEvent?.toISOString() || 'null');


  const conflictingEvents = existingEvents
    .filter(event => event.id !== excludeEventId && event.resourceId === candidateEvent.resourceId)
    .filter(event => {
      // Ensure required fields are present before calling getEventTimeRange
      if (!candidateEvent.startDate || !candidateEvent.startTime || !event.startDate || !event.startTime) {
        return false; // Skip if required fields are missing
      }
      
      // Calculate time ranges directly here where we have access to nextScheduledEventStart
      const currentTime = new Date();
      const candidateRange = getEventTimeRange(candidateEvent, currentTime, nextScheduledEvent);
      const eventRange = getEventTimeRange(event, currentTime);
      
      // Check for overlap
      const hasOverlap = candidateRange.start < eventRange.end && candidateRange.end > eventRange.start;
      
      console.log('🔍 Individual conflict check:', {
        candidateEvent: {
          id: candidateEvent.id || 'new',
          startTime: candidateEvent.startTime,
          isOpenDuration: candidateEvent.isOpenDuration,
          rangeStart: candidateRange.start.toISOString(),
          rangeEnd: candidateRange.end.toISOString()
        },
        existingEvent: {
          id: event.id,
          startTime: event.startTime,
          isOpenDuration: event.isOpenDuration,
          rangeStart: eventRange.start.toISOString(),
          rangeEnd: eventRange.end.toISOString()
        },
        hasConflict: hasOverlap,
        overlap: hasOverlap
      });
      
      return hasOverlap;
    });

  if (conflictingEvents.length > 0) {
    errors.push({
      field: 'startTime',
      message: `Time slot conflicts with ${conflictingEvents.length} existing event(s)`,
      code: 'TIME_CONFLICT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets a user-friendly error message for validation errors
 */
export function getValidationErrorMessage(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  // Return the first error message
  return errors[0].message;
}

/**
 * Gets all error messages for a specific field
 */
export function getFieldErrors(errors: ValidationError[], field: string): string[] {
  return errors
    .filter(error => error.field === field)
    .map(error => error.message);
}
