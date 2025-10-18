/**
 * Event Status Types and Enums
 * 
 * This module defines the complete type system for handling event statuses,
 * particularly for open duration events that can be in different states.
 */

export enum EventStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended'
}

export enum EventDurationType {
  FIXED = 'fixed',
  OPEN = 'open'
}

export interface EventTimeInfo {
  scheduledStart: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  duration?: number; // in hours
}

export interface EventStatusInfo {
  status: EventStatus;
  durationType: EventDurationType;
  timeInfo: EventTimeInfo;
  canBeModified: boolean;
  canBeEnded: boolean;
  canBeStarted: boolean;
}

export interface EventConflictInfo {
  hasConflict: boolean;
  conflictingEventId?: string;
  conflictReason?: string;
}

/**
 * Determines the current status of an event based on its properties
 */
export function getEventStatusInfo(event: {
  isOpenDuration?: boolean;
  eventStatus?: string;
  startDate: Date;
  startTime: string;
  duration?: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
}): EventStatusInfo {
  const durationType = event.isOpenDuration ? EventDurationType.OPEN : EventDurationType.FIXED;
  
  // Build time info
  const scheduledStart = new Date(event.startDate);
  const [hours, minutes] = event.startTime.split(':').map(Number);
  scheduledStart.setHours(hours, minutes, 0, 0);
  
  const timeInfo: EventTimeInfo = {
    scheduledStart,
    actualStart: event.actualStartTime,
    actualEnd: event.actualEndTime
  };

  if (durationType === EventDurationType.FIXED && event.duration) {
    timeInfo.scheduledEnd = new Date(scheduledStart.getTime() + (event.duration * 60 * 60 * 1000));
    timeInfo.duration = event.duration;
  }

  // Determine status
  let status: EventStatus;
  let canBeModified: boolean;
  let canBeEnded: boolean;
  let canBeStarted: boolean;

  if (durationType === EventDurationType.FIXED) {
    // Fixed duration events are always scheduled (they start and end automatically)
    status = EventStatus.SCHEDULED;
    canBeModified = true;
    canBeEnded = false;
    canBeStarted = false;
  } else {
    // Open duration events can be in different states
    const currentStatus = event.eventStatus as EventStatus;
    
    switch (currentStatus) {
      case EventStatus.ACTIVE:
        status = EventStatus.ACTIVE;
        canBeModified = true; // Can still modify some properties while active
        canBeEnded = true;
        canBeStarted = false;
        break;
        
      case EventStatus.ENDED:
        status = EventStatus.ENDED;
        canBeModified = false; // Ended events should be read-only
        canBeEnded = false;
        canBeStarted = false;
        break;
        
      default:
        // No status set or invalid status - treat as scheduled
        status = EventStatus.SCHEDULED;
        canBeModified = true;
        canBeEnded = false;
        canBeStarted = true;
        break;
    }
  }

  return {
    status,
    durationType,
    timeInfo,
    canBeModified,
    canBeEnded,
    canBeStarted
  };
}

/**
 * Checks if two events have time conflicts
 */
export function checkEventConflict(
  event1: {
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
  },
  event2: {
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
    id?: string;
  },
  currentTime: Date = new Date()
): EventConflictInfo {
  // No conflict if different resources
  if (event1.resourceId !== event2.resourceId) {
    return { hasConflict: false };
  }

  // Get time ranges for both events
  const event1Range = getEventTimeRange(event1, currentTime);
  const event2Range = getEventTimeRange(event2, currentTime);


  // Check for overlap
  const hasOverlap = event1Range.start < event2Range.end && event1Range.end > event2Range.start;

  return {
    hasConflict: hasOverlap,
    conflictingEventId: event2.id,
    conflictReason: hasOverlap ? 'Time slot overlaps with existing event' : undefined
  };
}

/**
 * Gets the effective time range for an event
 */
export function getEventTimeRange(
  event: {
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
  },
  currentTime: Date = new Date(),
  nextScheduledEventStart?: Date
): { start: Date; end: Date } {
  // Build scheduled start time
  const scheduledStart = new Date(event.startDate);
  const [hours, minutes] = event.startTime.split(':').map(Number);
  scheduledStart.setHours(hours, minutes, 0, 0);

  if (event.isOpenDuration) {
    const status = event.eventStatus as EventStatus;
    
    switch (status) {
      case EventStatus.ENDED:
        // Ended open duration: use actual start and end times
        if (event.actualStartTime && event.actualEndTime) {
          return {
            start: event.actualStartTime,
            end: event.actualEndTime
          };
        }
        // Fallback to scheduled times if actual times are missing
        return {
          start: scheduledStart,
          end: nextScheduledEventStart || new Date(scheduledStart.getTime() + 24 * 60 * 60 * 1000)
        };
        
      case EventStatus.ACTIVE:
        // Active open duration: use actual start time if available, otherwise scheduled start
        const activeStartTime = event.actualStartTime || scheduledStart;
        
        // For active events, end time should be current time OR next scheduled event
        // But current time must be after the actual start time
        const endTime = nextScheduledEventStart && nextScheduledEventStart < currentTime 
          ? nextScheduledEventStart 
          : currentTime;
        
        // Ensure endTime is not before the actual start time
        const finalEndTime = endTime > activeStartTime ? endTime : activeStartTime;
        
        
        return {
          start: activeStartTime,
          end: finalEndTime
        };
        
      default:
      // Scheduled open duration: use scheduled start and next scheduled event
      // If no next scheduled event, we cannot determine the end time (should be NULL)
      if (!nextScheduledEventStart) {
        // For conflict detection, we need some end time, so use end of day as fallback
        const endOfDay = new Date(scheduledStart);
        endOfDay.setHours(23, 59, 59, 999); // End of day
        
        return {
          start: scheduledStart,
          end: endOfDay
        };
      }
        
        // Use next scheduled event as end time
        const finalScheduledEndTime = nextScheduledEventStart > scheduledStart ? nextScheduledEventStart : scheduledStart;
        
        
        return {
          start: scheduledStart,
          end: finalScheduledEndTime
        };
    }
  } else {
    // Fixed duration event
    const duration = event.duration || 1;
    return {
      start: scheduledStart,
      end: new Date(scheduledStart.getTime() + (duration * 60 * 60 * 1000))
    };
  }
}

/**
 * Calculates the actual duration of an event
 */
export function calculateEventDuration(event: {
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration?: number;
  isOpenDuration?: boolean;
}): number {
  if (event.isOpenDuration && event.actualStartTime && event.actualEndTime) {
    return (event.actualEndTime.getTime() - event.actualStartTime.getTime()) / (1000 * 60 * 60);
  }
  
  return event.duration || 0;
}

/**
 * Validates if an event can transition to a new status
 */
export function canTransitionToStatus(
  currentStatus: EventStatus,
  newStatus: EventStatus,
  durationType: EventDurationType
): boolean {
  // Fixed duration events can't change status
  if (durationType === EventDurationType.FIXED) {
    return false;
  }

  // Valid transitions for open duration events
  const validTransitions: Record<EventStatus, EventStatus[]> = {
    [EventStatus.SCHEDULED]: [EventStatus.ACTIVE],
    [EventStatus.ACTIVE]: [EventStatus.ENDED],
    [EventStatus.ENDED]: [] // No transitions from ended
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}
