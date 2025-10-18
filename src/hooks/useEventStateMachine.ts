/**
 * Event State Machine Hook
 * 
 * This hook provides a state machine for managing event state transitions,
 * particularly for open duration events. It ensures proper state management
 * and provides validation for all state transitions.
 */

import { useCallback, useMemo } from 'react';
import { EventStatus, EventDurationType, EventStatusInfo, getEventStatusInfo, canTransitionToStatus, checkEventConflict } from '@/types/eventStatus';
import { roundDateToMinuteStep } from '@/utils/eventDuration';

export interface EventStateMachine {
  currentStatus: EventStatusInfo;
  canStart: boolean;
  canEnd: boolean;
  canModify: boolean;
  startEvent: () => EventStateTransition;
  endEvent: () => EventStateTransition;
  modifyEvent: (modifications: EventModifications) => EventStateTransition;
  validateTransition: (newStatus: EventStatus) => ValidationResult;
}

export interface EventModifications {
  startTime?: string;
  duration?: number;
  guestCount?: number;
  color?: string;
  specialRequests?: string;
}

export interface EventStateTransition {
  success: boolean;
  newStatus?: EventStatus;
  newActualStartTime?: Date;
  newActualEndTime?: Date;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface UseEventStateMachineProps {
  event: {
    id?: string;
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    guestCount?: number;
    color?: string;
    specialRequests?: string;
    isOpenDuration?: boolean;
    eventStatus?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
  };
  currentTime?: Date;
  minuteStep?: number;
}

export function useEventStateMachine({
  event,
  currentTime = new Date(),
  minuteStep = 1
}: UseEventStateMachineProps): EventStateMachine {
  
  const currentStatus = useMemo(() => {
    return getEventStatusInfo({
      isOpenDuration: event.isOpenDuration,
      eventStatus: event.eventStatus,
      startDate: event.startDate,
      startTime: event.startTime,
      duration: event.duration,
      actualStartTime: event.actualStartTime,
      actualEndTime: event.actualEndTime
    });
  }, [event, currentTime]);

  const canStart = useMemo(() => {
    return currentStatus.canBeStarted && 
           currentStatus.durationType === EventDurationType.OPEN &&
           currentStatus.status === EventStatus.SCHEDULED;
  }, [currentStatus]);

  const canEnd = useMemo(() => {
    return currentStatus.canBeEnded && 
           currentStatus.durationType === EventDurationType.OPEN &&
           currentStatus.status === EventStatus.ACTIVE;
  }, [currentStatus]);

  const canModify = useMemo(() => {
    return currentStatus.canBeModified;
  }, [currentStatus]);

  const validateTransition = useCallback((newStatus: EventStatus): ValidationResult => {
    if (!canTransitionToStatus(currentStatus.status, newStatus, currentStatus.durationType)) {
      return {
        isValid: false,
        error: `Cannot transition from ${currentStatus.status} to ${newStatus}`
      };
    }

    // Additional validation based on the transition
    switch (newStatus) {
      case EventStatus.ACTIVE:
        if (currentTime < currentStatus.timeInfo.scheduledStart) {
          return {
            isValid: false,
            error: 'Cannot start event before scheduled time'
          };
        }
        break;
        
      case EventStatus.ENDED:
        if (!event.actualStartTime) {
          return {
            isValid: false,
            error: 'Cannot end event that has not been started'
          };
        }
        break;
    }

    return { isValid: true };
  }, [currentStatus, currentTime, event.actualStartTime]);

  const startEvent = useCallback((): EventStateTransition => {
    const validation = validateTransition(EventStatus.ACTIVE);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const actualStartTime = roundDateToMinuteStep(currentTime, { minuteStep });

    return {
      success: true,
      newStatus: EventStatus.ACTIVE,
      newActualStartTime: actualStartTime
    };
  }, [validateTransition, currentTime, minuteStep]);

  const endEvent = useCallback((): EventStateTransition => {
    const validation = validateTransition(EventStatus.ENDED);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const actualEndTime = roundDateToMinuteStep(currentTime, { minuteStep });

    return {
      success: true,
      newStatus: EventStatus.ENDED,
      newActualEndTime: actualEndTime
    };
  }, [validateTransition, currentTime, minuteStep]);

  const modifyEvent = useCallback((modifications: EventModifications): EventStateTransition => {
    if (!canModify) {
      return {
        success: false,
        error: 'Event cannot be modified in its current state'
      };
    }

    // Validate modifications based on current status
    if (currentStatus.status === EventStatus.ACTIVE) {
      // For active events, only allow certain modifications
      const allowedModifications = ['guestCount', 'color', 'specialRequests'];
      const invalidModifications = Object.keys(modifications).filter(
        key => !allowedModifications.includes(key)
      );
      
      if (invalidModifications.length > 0) {
        return {
          success: false,
          error: `Cannot modify ${invalidModifications.join(', ')} while event is active`
        };
      }
    }

    if (currentStatus.status === EventStatus.ENDED) {
      return {
        success: false,
        error: 'Cannot modify ended events'
      };
    }

    // Validate time modifications if present
    if (modifications.startTime) {
      // Additional time validation can be added here
      const [hours, minutes] = modifications.startTime.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return {
          success: false,
          error: 'Invalid time format'
        };
      }
    }

    if (modifications.duration !== undefined && modifications.duration <= 0) {
      return {
        success: false,
        error: 'Duration must be greater than 0'
      };
    }

    return {
      success: true
    };
  }, [canModify, currentStatus.status]);

  return {
    currentStatus,
    canStart,
    canEnd,
    canModify,
    startEvent,
    endEvent,
    modifyEvent,
    validateTransition
  };
}

/**
 * Hook for managing event conflicts
 */
export function useEventConflicts(
  events: Array<{
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
  currentTime: Date = new Date()
) {
  return useCallback((candidateEvent: {
    resourceId: string;
    startDate: Date;
    startTime: string;
    duration?: number;
    isOpenDuration?: boolean;
    excludeEventId?: string;
  }) => {
    const conflicts = events
      .filter(event => event.id !== candidateEvent.excludeEventId)
      .map(event => {
        return checkEventConflict(candidateEvent, event, currentTime);
      })
      .filter(conflict => conflict.hasConflict);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }, [events, currentTime]);
}
