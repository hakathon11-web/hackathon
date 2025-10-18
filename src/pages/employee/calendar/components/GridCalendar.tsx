import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { useSettings } from '../context/SettingsContext';
import { format, addDays, isSameDay, startOfDay, addHours, parseISO } from 'date-fns';
import { EventBlock } from './EventBlock';
// EventForm is now handled by parent component
import { WorkingHours, DaySchedule } from '@/components/DailyWorkingHours';
import { useUpdateEmployeeEvent } from '@/hooks/useEmployeeEvents';
import { useSeatNames } from '@/hooks/useSeatNames';
import { SeatNameEditor } from '@/components/SeatNameEditor';
import type { Event } from '../types.ts';

export function GridCalendar({
  scheduleStartHour: propStart,
  scheduleEndHour: propEnd,
  onShowEventForm
}: {
  scheduleStartHour?: number;
  scheduleEndHour?: number;
  onShowEventForm?: (props: any) => void;
}) {
  const { state, dispatch, venueId } = useScheduler();
  const { selectedDate, resources, events, workingHours } = state;
  const { settings } = useSettings();
  const { seatNames, seatPositions, updateSeatName, moveSeat, isUpdating, isLoading: isSeatSettingsLoading } = useSeatNames(venueId || '');
  
  // Get venue-specific working hours for the selected date
  const getVenueScheduleForDate = (date: Date): { open: string; close: string; closed: boolean } | null => {
    if (!workingHours) return null;
    
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayKeys[date.getDay()];
    const daySchedule = workingHours[dayOfWeek] as DaySchedule;
    
    return daySchedule || null;
  };
  
  const venueSchedule = getVenueScheduleForDate(selectedDate);
  
  // Use venue working hours if available, otherwise fall back to props or settings
  let scheduleStartHour: number;
  let scheduleEndHour: number;
  
  if (venueSchedule && !venueSchedule.closed) {
    // Parse venue working hours
    const [openHour] = venueSchedule.open.split(':').map(Number);
    const [closeHour] = venueSchedule.close.split(':').map(Number);
    scheduleStartHour = openHour;
    scheduleEndHour = closeHour;
  } else {
    // Fall back to props or settings
    scheduleStartHour = propStart ?? settings.scheduleStartHour;
    scheduleEndHour = propEnd ?? settings.scheduleEndHour;
  }
  
  // Event form state is now managed by parent component
  const [editingEvent, setEditingEvent] = useState<import('../types.ts').Event | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  
  // Drag and drop state
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [dragOverResource, setDragOverResource] = useState<string | null>(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<number | null>(null);
  
  // Resize state
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeOriginalDuration, setResizeOriginalDuration] = useState<number>(0);
  const [resizeOriginalStartTime, setResizeOriginalStartTime] = useState<string>('');
  
  // Track if an interaction (drag/resize) just completed to prevent unwanted clicks
  const [interactionJustCompleted, setInteractionJustCompleted] = useState<string | null>(null);
  
  // Update hook
  const updateEmployeeEvent = useUpdateEmployeeEvent();

  // Generate dates for day view only
  const getDates = () => {
    return [{
      date: selectedDate,
      dayName: format(selectedDate, 'EEE'),
      dayNumber: format(selectedDate, 'd'),
      monthName: format(selectedDate, 'MMM'),
      isToday: isSameDay(selectedDate, new Date()),
      isSelected: true
    }];
  };

  const dates = getDates();

  // Generate time slots for day view using configurable schedule window
  const getTimeSlots = () => {
    const slots = [];
    const spansMidnight = scheduleEndHour < scheduleStartHour;

    if (spansMidnight) {
      // Same-day window: startHour..23
      for (let hour = scheduleStartHour; hour <= 23; hour++) {
        const time = addHours(startOfDay(selectedDate), hour);
        slots.push({
          hour,
          time: format(time, 'HH:mm'),
          label: format(time, 'HH:mm')
        });
      }
      // Next-day window: 0..endHour (exclusive of endHour as it represents closing time)
      const nextDay = addDays(selectedDate, 1);
      for (let hour = 0; hour < scheduleEndHour; hour++) {
        const time = addHours(startOfDay(nextDay), hour);
        slots.push({
          hour: hour + 24,
          time: format(time, 'HH:mm'),
          label: format(time, 'HH:mm')
        });
      }
    } else {
      // Single-day window: startHour..endHour (exclusive of endHour as it represents closing time)
      for (let hour = scheduleStartHour; hour < scheduleEndHour; hour++) {
        const time = addHours(startOfDay(selectedDate), hour);
        slots.push({
          hour,
          time: format(time, 'HH:mm'),
          label: format(time, 'HH:mm')
        });
      }
    }

    return slots;
  };

  const timeSlots = getTimeSlots();

  // Set CSS custom properties for dynamic grid columns and row height
  useEffect(() => {
    document.documentElement.style.setProperty('--time-slots-count', timeSlots.length.toString());
    document.documentElement.style.setProperty('--calendar-row-height', `${settings.rowHeight}px`);
    
    // Also set on the calendar container for better scoping
    if (gridRef.current) {
      gridRef.current.style.setProperty('--calendar-row-height', `${settings.rowHeight}px`);
    }
  }, [timeSlots.length, settings.rowHeight]);

  // Update current time every second for higher accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);


  // Calculate current time position for day view with proper grid-based positioning
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const spansMidnight = scheduleEndHour < scheduleStartHour;

    let adjustedHour: number | null = null;
    if (!spansMidnight) {
      if (isSameDay(now, selectedDate) && currentHour >= scheduleStartHour && currentHour <= scheduleEndHour) {
        adjustedHour = currentHour;
      }
    } else {
      if (isSameDay(now, selectedDate) && currentHour >= scheduleStartHour && currentHour <= 23) {
        adjustedHour = currentHour;
      } else if (isSameDay(now, addDays(selectedDate, 1)) && currentHour >= 0 && currentHour <= scheduleEndHour) {
        adjustedHour = currentHour + 24;
      }
    }

    if (adjustedHour === null) return null;

    const index = timeSlots.findIndex(slot => slot.hour === adjustedHour);
    if (index === -1) return null;

    const minutePosition = currentMinute / 60;

    return {
      type: 'day',
      hourIndex: index,
      minutePosition,
      time: format(now, 'HH:mm')
    };
  };

  const currentTimePosition = getCurrentTimePosition();

  // Calculate grid-based positioning for current time indicator
  const getCurrentTimeIndicatorStyle = () => {
    if (!currentTimePosition) return {};

    if (currentTimePosition.hourIndex !== undefined && currentTimePosition.minutePosition !== undefined) {
      const timeSlotIndex = currentTimePosition.hourIndex;
      const minuteOffset = currentTimePosition.minutePosition; // 0-1
      
      // Simplified positioning calculation
      // Calculate the exact position within the time slots area
      const timeSlotWidthPercent = 100 / timeSlots.length;
      const basePositionPercent = (timeSlotIndex / timeSlots.length) * 100;
      const minuteOffsetPercent = minuteOffset * timeSlotWidthPercent;
      
      // Total position percentage within the time slots area
      const totalPositionPercent = basePositionPercent + minuteOffsetPercent;
      
      // Simplified positioning: start after resource column, then position within remaining space
      return {
        left: `calc(280px + ${totalPositionPercent}% * (100% - 280px) / 100%)`,
        top: '4px', // Start 4px down to accommodate the dot (::before with top: -4px)
        height: 'calc(100% - 4px)' // Adjust height to maintain full coverage
      };
    }

    return {};
  };

  // Helper function to get the correct "today" date based on current time and schedule
  const getTodayDate = (): Date => {
    const now = new Date();
    const currentHour = now.getHours();
    const spansMidnight = scheduleEndHour < scheduleStartHour;

    // If schedule spans midnight and current time is before endHour, show previous day
    if (spansMidnight && currentHour >= 0 && currentHour < scheduleEndHour) {
      return addDays(now, -1);
    }

    // Otherwise show current day
    return now;
  };

  const handleNavigation = (direction: 'prev' | 'next' | 'today') => {
    const currentDate = new Date(selectedDate);
    let newDate: Date;

    switch (direction) {
      case 'prev':
        newDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'next':
        newDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'today':
      default:
        newDate = getTodayDate();
        break;
    }

    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };


  const getEventsForResourceAndDate = (resourceId: string, date: Date) => {
    return events.filter(event => {
      if (event.resourceId !== resourceId) return false;
      
      // Check if event starts on this date (using UTC to avoid timezone issues)
      const eventStartUTC = new Date(event.startDate.getUTCFullYear(), event.startDate.getUTCMonth(), event.startDate.getUTCDate());
      const currentDateUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      
      if (eventStartUTC.getTime() === currentDateUTC.getTime()) {
        return true;
      }
      
      // Check if event ends on this date (for overnight events) - using UTC comparison
      if (event.endDate) {
        const eventEndUTC = new Date(event.endDate.getUTCFullYear(), event.endDate.getUTCMonth(), event.endDate.getUTCDate());
        
        if (eventEndUTC.getTime() === currentDateUTC.getTime()) {
          // Only show on end date if it's actually a different day than start date
          // Use UTC date comparison to avoid timezone conversion issues
          const startDateUTC = new Date(event.startDate.getUTCFullYear(), event.startDate.getUTCMonth(), event.startDate.getUTCDate());
          const endDateUTC = new Date(event.endDate.getUTCFullYear(), event.endDate.getUTCMonth(), event.endDate.getUTCDate());
          const isDifferentDay = startDateUTC.getTime() !== endDateUTC.getTime();
          
          // Special handling for midnight-spanning venues: events ending at closing time
          // should be considered as ending on the same business day, not overnight
          if (isDifferentDay) {
            const spansMidnight = scheduleEndHour < scheduleStartHour;
            if (spansMidnight) {
              // Check if the event ends at or before the closing time
              const endHour = event.endDate.getUTCHours();
              if (endHour <= scheduleEndHour) {
                // Event ends at or before closing time - treat as same business day
                return false;
              }
            }
            
            // This is a true overnight event that spans multiple days
            return true;
          }
        }
      }
      return false;
    });
  };

  // Check if a seat is currently occupied
  const isSeatCurrentlyOccupied = (resourceId: string, date: Date) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    
    // Get all events for this resource and date
    const resourceEvents = getEventsForResourceAndDate(resourceId, date);
    
    return resourceEvents.some(event => {
      // Open-duration handling: active sessions occupy the seat; ended sessions do not
      if (event.isOpenDuration) {
        if (event.eventStatus === 'active') {
          // Only mark occupied if start time has passed (use actualStartTime if present)
          const start = event.actualStartTime
            ? new Date(event.actualStartTime)
            : (() => {
                const [h, m] = event.startTime.split(':').map(Number);
                const d = new Date(event.startDate);
                d.setHours(h, m ?? 0, 0, 0);
                return d;
              })();
          return now >= start;
        }
        return false; // ended open-duration should not mark as occupied
      }
      // Parse event times
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
      };
      
      const eventStartTime = parseTime(event.startTime);
      const eventEndTime = eventStartTime + (event.duration || 1);
      
      // Check if current time falls within this event's duration
      // Handle overnight events
      if (eventEndTime >= 24) {
        // Event spans midnight
        const nextDayEventEndTime = eventEndTime - 24;
        return currentTimeDecimal >= eventStartTime || currentTimeDecimal <= nextDayEventEndTime;
      } else {
        // Regular event
        return currentTimeDecimal >= eventStartTime && currentTimeDecimal < eventEndTime;
      }
    });
  };

  // Check if a seat will become available within the next threshold
  const isSeatSoonToBeAvailable = (resourceId: string, date: Date) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    const thresholdHours = (settings.resourceSoonAvailableThresholdMinutes ?? 60) / 60;
    
    // Only check if we're looking at today's date
    if (!isSameDay(now, date)) {
      return false;
    }

    const resourceEvents = getEventsForResourceAndDate(resourceId, date);

    return resourceEvents.some(event => {
      // Open-duration handling: treat active/ended sessions as not predictable for soon-available
      if (event.isOpenDuration) {
        // If it's ended, it's already available (handled by occupied check)
        // If it's active, we don't know exact end; don't flag as soon-available
        return false;
      }
      
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
      };
      
      const start = parseTime(event.startTime);
      const duration = event.duration || 0;
      let end = start + duration;
      
      // Handle midnight-spanning schedules
      const spansMidnight = scheduleEndHour < scheduleStartHour;
      
      if (spansMidnight) {
        // For overnight schedules, adjust end time if it crosses midnight
        if (start <= scheduleEndHour && end > 24) {
          end = end - 24; // Adjust for next day
        }
      }
      
      // Calculate the time when the event ends
      let eventEndTime = end;
      if (end >= 24) {
        eventEndTime = end - 24; // Wrap around to next day
      }
      
      // Check if we're currently in this event and it ends within the threshold
      if (currentTimeDecimal >= start && currentTimeDecimal < end) {
        // We're currently in this event, check if it ends within threshold
        if (end <= 24) {
          // Event ends today
          return eventEndTime <= currentTimeDecimal + thresholdHours;
        } else {
          // Event ends tomorrow (after midnight)
          const nextDayEnd = eventEndTime;
          return nextDayEnd <= thresholdHours;
        }
      }
      
      return false;
    });
  };


  // Check if a seat will be occupied within the next hour
  const isSeatSoonToBeOccupied = (resourceId: string, date: Date) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    const nextMinutes = settings.resourceSoonThresholdMinutes ?? 60;
    const nextHourTime = currentTimeDecimal + (nextMinutes / 60);
    
    // Get all events for this resource and date
    const resourceEvents = getEventsForResourceAndDate(resourceId, date);
    
    return resourceEvents.some(event => {
      // Open-duration: only consider soon-to-be-occupied if active and start is in the future
      if (event.isOpenDuration) {
        if (event.eventStatus !== 'active') return false;
        const start = event.actualStartTime
          ? new Date(event.actualStartTime)
          : (() => {
              const [h, m] = event.startTime.split(':').map(Number);
              const d = new Date(event.startDate);
              d.setHours(h, m ?? 0, 0, 0);
              return d;
            })();
        if (start <= now) return false; // already started; occupancy handled elsewhere
        const startDecimal = start.getHours() + (start.getMinutes() / 60);
        return startDecimal > currentTimeDecimal && startDecimal <= nextHourTime;
      }

      // Fixed-duration events
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
      };
      const eventStartTime = parseTime(event.startTime);
      if (eventStartTime >= 0 && eventStartTime < 24) {
        return eventStartTime > currentTimeDecimal && eventStartTime <= nextHourTime;
      } else if (eventStartTime >= 24) {
        const nextDayEventStartTime = eventStartTime - 24;
        return nextDayEventStartTime > currentTimeDecimal && nextDayEventStartTime <= nextHourTime;
      }
      return false;
    });
  };


  const getDateRange = () => {
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  };


  const handleCellClick = (resourceId: string, _date?: Date, timeSlot?: string) => {
    setSelectedResourceId(resourceId);
    setSelectedTimeSlot(timeSlot || '');
    setEditingEvent(null);
    setIsQuickAddMode(false);
    
    // For overnight schedules, adjust the date if clicking on after-midnight slots
    let eventDate = selectedDate;
    if (timeSlot) {
      const [clickedHour] = timeSlot.split(':').map(Number);
      const spansMidnight = scheduleEndHour < scheduleStartHour;
      
      // If it's an overnight schedule and the clicked hour is in the early morning range (00:00 - scheduleEndHour)
      // then the event should be for the next calendar day
      if (spansMidnight && clickedHour >= 0 && clickedHour < scheduleEndHour) {
        eventDate = addDays(selectedDate, 1);
      }
    }
    
    onShowEventForm?.({
      selectedResourceId: resourceId,
      selectedDate: eventDate,
      selectedTimeSlot: timeSlot || '',
      isQuickAdd: false
    });
  };

  const handleEventClick = (event: import('../types.ts').Event) => {
    // Prevent click if an interaction (drag/resize) just completed
    if (interactionJustCompleted === event.id) {
      console.log('Ignoring click - interaction just completed for event:', event.id);
      return;
    }
    
    // Always open event form for editing (including active sessions)
    setEditingEvent(event);
    setSelectedResourceId('');
    setSelectedTimeSlot('');
    setIsQuickAddMode(false);
    onShowEventForm?.({
      selectedResourceId: '',
      selectedDate,
      selectedTimeSlot: '',
      event,
      isQuickAdd: false
    });
  };

  const handleEventSuccess = () => {
    setEditingEvent(null);
    setSelectedResourceId('');
    setSelectedTimeSlot('');
    setIsQuickAddMode(false);
  };

  // Resource click handler for seat-based quick add
  const handleResourceClick = (resourceId: string) => {
    const now = new Date();
    
    // Get current time in the format expected by the form (e.g., "22:30")
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round UP to next minute increment based on settings
    const roundedMinute = Math.ceil(currentMinute / settings.minuteStep) * settings.minuteStep;
    let finalHour = currentHour;
    
    // Handle hour rollover if minutes round up to 60
    if (roundedMinute >= 60) {
      finalHour = currentHour + 1;
    }
    
    const minuteDisplay = roundedMinute >= 60 ? '00' : roundedMinute.toString().padStart(2, '0');
    const currentTimeSlot = `${finalHour.toString().padStart(2, '0')}:${minuteDisplay}`;
    
    // Check if current time is within our display range
    const spansMidnight = scheduleEndHour < scheduleStartHour;
    let isValidTime = false;
    let targetDate = selectedDate;
    if (!spansMidnight) {
      if (currentHour >= scheduleStartHour && currentHour <= scheduleEndHour) {
        isValidTime = true;
        targetDate = selectedDate;
      }
    } else {
      if (currentHour >= scheduleStartHour && currentHour <= 23) {
        isValidTime = true;
        targetDate = selectedDate;
      } else if (currentHour >= 0 && currentHour <= scheduleEndHour) {
        isValidTime = true;
        targetDate = addDays(now, -1);
      }
    }
    
    if (isValidTime) {
      // Set up for quick add with current time and selected resource
      setSelectedResourceId(resourceId); // Pre-select the clicked resource
      setSelectedTimeSlot(currentTimeSlot);
      dispatch({ type: 'SET_SELECTED_DATE', payload: targetDate });
      setEditingEvent(null);
      setIsQuickAddMode(true);
      onShowEventForm?.({
        selectedResourceId: resourceId,
        selectedDate: targetDate,
        selectedTimeSlot: currentTimeSlot,
        isQuickAdd: true
      });
    } else {
      // Current time is not in our display range, just open normal form with selected resource
      setSelectedResourceId(resourceId); // Pre-select the clicked resource
      setSelectedTimeSlot('');
      setEditingEvent(null);
      setIsQuickAddMode(false);
      onShowEventForm?.({
        selectedResourceId: resourceId,
        selectedDate: targetDate,
        selectedTimeSlot: '',
        isQuickAdd: false
      });
    }
  };

  // Quick add handler for current time
  const handleQuickAdd = () => {
    
    const now = new Date();
    
    // Get current time in the format expected by the form (e.g., "22:30")
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    
    
    // Round UP to next minute increment based on settings
    const roundedMinute = Math.ceil(currentMinute / settings.minuteStep) * settings.minuteStep;
    let finalHour = currentHour;
    
    // Handle hour rollover if minutes round up to 60
    if (roundedMinute >= 60) {
      finalHour = currentHour + 1;
    }
    
    const minuteDisplay = roundedMinute >= 60 ? '00' : roundedMinute.toString().padStart(2, '0');
    const currentTimeSlot = `${finalHour.toString().padStart(2, '0')}:${minuteDisplay}`;
    
    // Check if current time is within our display range
    const spansMidnight = scheduleEndHour < scheduleStartHour;
    let isValidTime = false;
    let targetDate = selectedDate;
    if (!spansMidnight) {
      if (currentHour >= scheduleStartHour && currentHour <= scheduleEndHour) {
        isValidTime = true;
        targetDate = selectedDate;
      }
    } else {
      if (currentHour >= scheduleStartHour && currentHour <= 23) {
        isValidTime = true;
        targetDate = selectedDate;
      } else if (currentHour >= 0 && currentHour <= scheduleEndHour) {
        isValidTime = true;
        targetDate = addDays(now, -1);
      }
    }
    
    
    
    if (isValidTime) {
      // Set up for quick add with current time
      
      setSelectedResourceId(''); // Let user choose
      setSelectedTimeSlot(currentTimeSlot);
      dispatch({ type: 'SET_SELECTED_DATE', payload: targetDate });
      setEditingEvent(null);
      setIsQuickAddMode(true);
      onShowEventForm?.({
        selectedResourceId: '',
        selectedDate: targetDate,
        selectedTimeSlot: currentTimeSlot,
        isQuickAdd: true
      });
    } else {
      // Current time is not in our display range, just open normal form
      
      setSelectedResourceId('');
      setSelectedTimeSlot('');
      setEditingEvent(null);
      setIsQuickAddMode(false);
      onShowEventForm?.({
        selectedResourceId: '',
        selectedDate: targetDate,
        selectedTimeSlot: '',
        isQuickAdd: false
      });
    }
  };

  // Deterministic color per service
  let serviceColorMap = new Map<string, string>();
  let palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];
  const getServiceColor = (service: string): string => {
    if (serviceColorMap.has(service)) return serviceColorMap.get(service)!;
    const index = (Array.from(service).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % palette.length;
    const color = palette[index];
    serviceColorMap.set(service, color);
    return color;
  };

  // (deduped: color per service declared above)

  // Sort resources by service, then by custom position (or seat number if no custom position)
  // Note: Resources from useVenueCalendarData are already sorted with seat positions.
  // We only re-sort here when seat positions are explicitly loaded and different,
  // or when the user is actively reordering seats.
  const sortedResources = !isSeatSettingsLoading && Object.keys(seatPositions).length > 0
    ? [...resources].sort((a, b) => {
        // First, group by service
        const serviceCompare = a.service.localeCompare(b.service);
        if (serviceCompare !== 0) return serviceCompare;
        
        // Within same service, use custom positions if available
        const posA = seatPositions[a.id];
        const posB = seatPositions[b.id];
        
        // If both have custom positions, sort by position
        if (posA !== undefined && posB !== undefined) {
          return posA - posB;
        }
        
        // If only one has a position, prioritize it
        if (posA !== undefined) return -1;
        if (posB !== undefined) return 1;
        
        // Otherwise, maintain original order by seat number from resource ID
        // Extract seat number from resource ID (format: venue-{venueServiceId}-seat-{number})
        const extractSeatNumber = (id: string) => {
          const match = id.match(/seat-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        };
        
        return extractSeatNumber(a.id) - extractSeatNumber(b.id);
      })
    : resources; // Use resources as-is if seat positions haven't loaded yet (they're already sorted from useVenueCalendarData)
  
  // Helper function to check if an event would exceed venue closing time
  const wouldExceedClosingTime = (startTime: string, duration: number): boolean => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startHours = hours + minutes / 60;
    const endHours = startHours + duration;
    
    const spansMidnight = scheduleEndHour < scheduleStartHour;
    
    if (spansMidnight) {
      // For midnight-spanning schedules (e.g., 18:00 to 04:00)
      // Valid range: startHour..23 and 0..endHour (next day)
      if (startHours >= scheduleStartHour) {
        // Event starts on same day
        // Can extend to 24:00 (midnight) or wrap to next day up to scheduleEndHour
        const nextDayEnd = scheduleEndHour;
        const maxAllowedEnd = 24 + nextDayEnd; // e.g., 24 + 4 = 28
        return endHours > maxAllowedEnd;
      } else if (startHours <= scheduleEndHour) {
        // Event starts on next day (after midnight)
        // Must end before scheduleEndHour
        return endHours > scheduleEndHour;
      } else {
        // Start time is in the "closed" window
        return true;
      }
    } else {
      // Normal schedule (e.g., 08:00 to 22:00)
      return endHours > scheduleEndHour;
    }
  };
  
  // Helper function to check for event conflicts
  const wouldCauseConflict = (
    eventId: string,
    resourceId: string,
    startTime: string,
    duration: number,
    eventDate: Date
  ): boolean => {
    // Parse the candidate event's start time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startTimeDecimal = hours + minutes / 60;
    const endTimeDecimal = startTimeDecimal + duration;
    
    // Check against all existing events on the same resource
    const conflictingEvents = events.filter(e => {
      // Skip the event being moved/resized
      if (e.id === eventId) return false;
      
      // Only check events on the same resource and date
      if (e.resourceId !== resourceId) return false;
      if (!isSameDay(e.startDate, eventDate)) return false;
      
      // Parse existing event's time
      const [eHours, eMinutes] = e.startTime.split(':').map(Number);
      const eStartTimeDecimal = eHours + eMinutes / 60;
      
      // Calculate end time for existing event
      let eEndTimeDecimal: number;
      
      if (e.isOpenDuration) {
        // For open duration events
        if (e.eventStatus === 'ended' && e.actualEndTime) {
          // Ended event - use actual end time
          const actualEnd = new Date(e.actualEndTime);
          eEndTimeDecimal = actualEnd.getHours() + actualEnd.getMinutes() / 60;
        } else if (e.eventStatus === 'active') {
          // Active event - assume it goes to end of schedule or next event
          // For simplicity, use a large value to block the slot
          eEndTimeDecimal = 24;
        } else {
          // Scheduled open duration - shouldn't happen, but treat as 1 hour
          eEndTimeDecimal = eStartTimeDecimal + 1;
        }
      } else {
        // Fixed duration event
        eEndTimeDecimal = eStartTimeDecimal + (e.duration || 0);
      }
      
      // Check for overlap
      // Events overlap if: start1 < end2 AND end1 > start2
      const hasOverlap = startTimeDecimal < eEndTimeDecimal && endTimeDecimal > eStartTimeDecimal;
      
      return hasOverlap;
    });
    
    return conflictingEvents.length > 0;
  };
  
  // Helper function to check if moving to a different service
  const isDifferentService = (fromResourceId: string, toResourceId: string): boolean => {
    const fromResource = resources.find(r => r.id === fromResourceId);
    const toResource = resources.find(r => r.id === toResourceId);
    
    if (!fromResource || !toResource) return false;
    
    return fromResource.service !== toResource.service;
  };
  // Helper function to calculate maximum allowed duration for a given start time
  const getMaxAllowedDuration = (startTime: string): number => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startHours = hours + minutes / 60;
    
    const spansMidnight = scheduleEndHour < scheduleStartHour;
    
    if (spansMidnight) {
      if (startHours >= scheduleStartHour) {
        // Event starts on same day, can go until scheduleEndHour next day
        const maxEnd = 24 + scheduleEndHour;
        return maxEnd - startHours;
      } else if (startHours <= scheduleEndHour) {
        // Event starts on next day (after midnight)
        return scheduleEndHour - startHours;
      } else {
        // Start time is in closed window
        return 0;
      }
    } else {
      // Normal schedule
      return scheduleEndHour - startHours;
    }
  };
  const handleEventDragStart = (e: React.DragEvent, event: Event) => {
    setDraggingEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };
  
  const handleDragOver = (e: React.DragEvent, resourceId: string, timeSlotIndex: number) => {
    if (!draggingEvent) return;
    e.preventDefault();
    
    // Calculate the time slot this corresponds to
    const timeSlot = timeSlots[timeSlotIndex];
    if (!timeSlot) return;
    
    // Check if trying to move to a different service
    const differentService = isDifferentService(draggingEvent.resourceId, resourceId);
    
    // Check if dropping here would exceed closing time
    const wouldExceed = wouldExceedClosingTime(timeSlot.time, draggingEvent.duration);
    
    // Check if dropping here would cause a conflict
    const hasConflict = wouldCauseConflict(
      draggingEvent.id,
      resourceId,
      timeSlot.time,
      draggingEvent.duration,
      selectedDate
    );
    
    // Set different drop effect based on validity
    e.dataTransfer.dropEffect = (wouldExceed || hasConflict || differentService) ? 'none' : 'move';
    
    setDragOverResource(resourceId);
    setDragOverTimeSlot(timeSlotIndex);
  };
  
  const handleDrop = async (e: React.DragEvent, resourceId: string, timeSlotIndex: number) => {
    e.preventDefault();
    if (!draggingEvent) return;
    
    // Calculate new start time from time slot index
    const timeSlot = timeSlots[timeSlotIndex];
    if (!timeSlot) return;
    
    const newStartTime = timeSlot.time;
    
    console.log('🎯 Drop event:', {
      eventId: draggingEvent.id,
      from: { resource: draggingEvent.resourceId, time: draggingEvent.startTime },
      to: { resource: resourceId, time: newStartTime },
      duration: draggingEvent.duration,
      positionChanged: draggingEvent.resourceId !== resourceId || draggingEvent.startTime !== newStartTime
    });
    
    // Validate that the event isn't being moved to a different service
    if (isDifferentService(draggingEvent.resourceId, resourceId)) {
      console.warn('Cannot drop event here: cannot move to different service');
      // Reset drag state without making any changes
      setDraggingEvent(null);
      setDragOverResource(null);
      setDragOverTimeSlot(null);
      return;
    }
    
    // Validate that the event wouldn't exceed closing time at new position
    if (wouldExceedClosingTime(newStartTime, draggingEvent.duration)) {
      // Show visual feedback that the drop is not allowed
      console.warn('Cannot drop event here: would exceed venue closing time');
      // Reset drag state without making any changes
      setDraggingEvent(null);
      setDragOverResource(null);
      setDragOverTimeSlot(null);
      return;
    }
    
    // Validate that the event wouldn't cause a conflict
    if (wouldCauseConflict(draggingEvent.id, resourceId, newStartTime, draggingEvent.duration, selectedDate)) {
      // Show visual feedback that the drop is not allowed
      console.warn('Cannot drop event here: would cause conflict with existing event');
      // Reset drag state without making any changes
      setDraggingEvent(null);
      setDragOverResource(null);
      setDragOverTimeSlot(null);
      return;
    }
    
    // Only update if position changed
    if (draggingEvent.resourceId !== resourceId || draggingEvent.startTime !== newStartTime) {
      console.log('✅ Position changed, updating event...');
      
      // Mark that a drag interaction just completed for this event
      setInteractionJustCompleted(draggingEvent.id);
      
      // Clear the flag after a short delay (enough time for click event to be ignored)
      setTimeout(() => {
        setInteractionJustCompleted(null);
      }, 200);
      
      // Store original values for potential rollback
      const originalResourceId = draggingEvent.resourceId;
      const originalStartTime = draggingEvent.startTime;
      
      // OPTIMISTIC UPDATE: Update local state immediately
      dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          ...draggingEvent,
          resourceId: resourceId,
          startTime: newStartTime,
        },
      });
      
      console.log('✅ Optimistic update dispatched');
      
      try {
        // Extract venue service ID from resource ID (format: venue-{venueServiceId}-seat-{seatNumber})
        const resourceParts = resourceId.split('-');
        const venueServiceId = resourceParts[1];
        
        if (!venueServiceId) {
          console.error('Failed to extract venue service ID from resource ID:', resourceId);
          // Revert optimistic update
          dispatch({
            type: 'UPDATE_EVENT',
            payload: {
              ...draggingEvent,
              resourceId: originalResourceId,
              startTime: originalStartTime,
            },
          });
          
          // Reset drag state
          setDraggingEvent(null);
          setDragOverResource(null);
          setDragOverTimeSlot(null);
          return;
        }
        
        // Prepare event data for update
        const eventData = {
          resourceId: resourceId,
          startDate: selectedDate,
          endDate: selectedDate,
          startTime: newStartTime,
          duration: draggingEvent.duration,
          guestCount: draggingEvent.guestCount,
          totalPrice: 0, // Will be calculated by backend
          eventType: 'employee' as const,
          color: draggingEvent.color,
          isOpenDuration: draggingEvent.isOpenDuration,
          eventStatus: draggingEvent.eventStatus,
          products: draggingEvent.products,
          specialRequests: draggingEvent.specialRequests,
        };
        
        console.log('🔄 Sending update to backend...', { eventId: draggingEvent.id, eventData });
        
        // Update the event in background (no await for immediate UI response)
        updateEmployeeEvent.mutate({
          eventId: draggingEvent.id,
          eventData,
          venueServiceId,
        }, {
          onSuccess: () => {
            console.log('✅ Backend update successful');
          },
          onError: (error) => {
            console.error('❌ Failed to update event position:', error);
            // Revert optimistic update on error
            dispatch({
              type: 'UPDATE_EVENT',
              payload: {
                ...draggingEvent,
                resourceId: originalResourceId,
                startTime: originalStartTime,
              },
            });
          }
        });
      } catch (error) {
        console.error('❌ Failed to update event position:', error);
        // Revert optimistic update
        dispatch({
          type: 'UPDATE_EVENT',
          payload: {
            ...draggingEvent,
            resourceId: originalResourceId,
            startTime: originalStartTime,
          },
        });
      }
    } else {
      console.log('ℹ️ No position change detected, skipping update');
    }
    
    // Reset drag state immediately for smooth UX
    setDraggingEvent(null);
    setDragOverResource(null);
    setDragOverTimeSlot(null);
  };
  
  const handleDragEnd = () => {
    setDraggingEvent(null);
    setDragOverResource(null);
    setDragOverTimeSlot(null);
  };
  
  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, event: Event, handle: 'left' | 'right') => {
    setResizingEvent(event);
    setResizeHandle(handle);
    setResizeStartX(e.clientX);
    setResizeOriginalDuration(event.duration);
    setResizeOriginalStartTime(event.startTime);
  };
  
  useEffect(() => {
    if (!resizingEvent || !resizeHandle) {
      // Remove resizing class when not resizing
      document.body.classList.remove('resizing');
      return;
    }
    
    // Add resizing class to body
    document.body.classList.add('resizing');
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      
      // Get the time slots container width to calculate hour change
      const timeSlotsContainer = document.querySelector('.time-slots-container');
      if (!timeSlotsContainer) return;
      
      const containerWidth = timeSlotsContainer.clientWidth;
      const hourWidth = containerWidth / timeSlots.length;
      
      // Calculate hour change based on horizontal movement
      const hourChange = deltaX / hourWidth;
      
      // Convert duration step from minutes to hours for rounding
      const durationStepHours = settings.durationStepMinutes / 60;
      const roundingFactor = 1 / durationStepHours;
      
      // Calculate minimum duration based on duration step
      const minDuration = durationStepHours;
      
      if (resizeHandle === 'right') {
        // Adjust duration by dragging the right edge
        const newDuration = Math.max(minDuration, resizeOriginalDuration + hourChange);
        
        // Round to nearest duration step
        const roundedDuration = Math.round(newDuration * roundingFactor) / roundingFactor;
        
        // Check if new duration would exceed closing time
        if (wouldExceedClosingTime(resizeOriginalStartTime, roundedDuration)) {
          // Cap at maximum allowed duration
          const maxDuration = getMaxAllowedDuration(resizeOriginalStartTime);
          const cappedDuration = Math.floor(maxDuration / durationStepHours) * durationStepHours;
          
          if (cappedDuration >= minDuration && cappedDuration !== resizingEvent.duration) {
            dispatch({
              type: 'UPDATE_EVENT',
              payload: {
                ...resizingEvent,
                duration: cappedDuration,
              },
            });
          }
          return;
        }
        
        // Check if new duration would cause a conflict
        if (wouldCauseConflict(
          resizingEvent.id,
          resizingEvent.resourceId,
          resizeOriginalStartTime,
          roundedDuration,
          selectedDate
        )) {
          // Don't allow resize that would cause conflict
          return;
        }
        
        // Update event locally for visual feedback
        dispatch({
          type: 'UPDATE_EVENT',
          payload: {
            ...resizingEvent,
            duration: roundedDuration,
          },
        });
      } else if (resizeHandle === 'left') {
        // Adjust start time by dragging the left edge
        const [hours, minutes] = resizeOriginalStartTime.split(':').map(Number);
        const originalStartHours = hours + minutes / 60;
        const newStartHours = originalStartHours + hourChange;
        
        // Round to nearest duration step
        const roundedStartHours = Math.round(newStartHours * roundingFactor) / roundingFactor;
        
        // Calculate new duration (end time stays fixed, so duration changes inversely)
        const newDuration = resizeOriginalDuration - (roundedStartHours - originalStartHours);
        
        if (newDuration >= minDuration && roundedStartHours >= scheduleStartHour) {
          const finalHours = Math.floor(roundedStartHours);
          const finalMinutes = Math.round((roundedStartHours - finalHours) * 60);
          const newStartTime = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
          
          // Validate that new start time is within venue hours
          // and doesn't create an event that would exceed closing time
          if (!wouldExceedClosingTime(newStartTime, newDuration)) {
            // Check if adjustment would cause a conflict
            if (!wouldCauseConflict(
              resizingEvent.id,
              resizingEvent.resourceId,
              newStartTime,
              newDuration,
              selectedDate
            )) {
              // Update event locally for visual feedback
              dispatch({
                type: 'UPDATE_EVENT',
                payload: {
                  ...resizingEvent,
                  startTime: newStartTime,
                  duration: newDuration,
                },
              });
            }
          }
        }
      }
    };
    
    const handleMouseUp = async () => {
      if (resizingEvent) {
        // Find the updated event in state
        const updatedEvent = events.find(e => e.id === resizingEvent.id);
        
        if (updatedEvent && (
          updatedEvent.duration !== resizeOriginalDuration || 
          updatedEvent.startTime !== resizeOriginalStartTime
        )) {
          // Mark that a resize interaction just completed for this event
          setInteractionJustCompleted(resizingEvent.id);
          
          // Clear the flag after a short delay (enough time for click event to be ignored)
          setTimeout(() => {
            setInteractionJustCompleted(null);
          }, 200);
          
          try {
            // Extract venue service ID from resource ID (format: venue-{venueServiceId}-seat-{seatNumber})
            const resourceParts = updatedEvent.resourceId.split('-');
            const venueServiceId = resourceParts[1];
            
            if (!venueServiceId) {
              console.error('Failed to extract venue service ID from resource ID:', updatedEvent.resourceId);
              // Revert to original
              dispatch({
                type: 'UPDATE_EVENT',
                payload: {
                  ...resizingEvent,
                  startTime: resizeOriginalStartTime,
                  duration: resizeOriginalDuration,
                },
              });
              setResizingEvent(null);
              setResizeHandle(null);
              document.body.classList.remove('resizing');
              return;
            }
            
            // Prepare event data for update
            const eventData = {
              resourceId: updatedEvent.resourceId,
              startDate: updatedEvent.startDate,
              endDate: updatedEvent.endDate,
              startTime: updatedEvent.startTime,
              duration: updatedEvent.duration,
              guestCount: updatedEvent.guestCount,
              totalPrice: 0, // Will be calculated by backend
              eventType: 'employee' as const,
              color: updatedEvent.color,
              isOpenDuration: updatedEvent.isOpenDuration,
              eventStatus: updatedEvent.eventStatus,
              products: updatedEvent.products,
              specialRequests: updatedEvent.specialRequests,
            };
            
            // Update the event in background (no await for immediate UI response)
            // The optimistic update is already in place from handleMouseMove
            updateEmployeeEvent.mutate({
              eventId: updatedEvent.id,
              eventData,
              venueServiceId,
            }, {
              onError: (error) => {
                console.error('Failed to update event duration:', error);
                // Revert to original on error
                dispatch({
                  type: 'UPDATE_EVENT',
                  payload: {
                    ...resizingEvent,
                    startTime: resizeOriginalStartTime,
                    duration: resizeOriginalDuration,
                  },
                });
              }
            });
          } catch (error) {
            console.error('Failed to update event duration:', error);
            // Revert to original
            dispatch({
              type: 'UPDATE_EVENT',
              payload: {
                ...resizingEvent,
                startTime: resizeOriginalStartTime,
                duration: resizeOriginalDuration,
              },
            });
          }
        }
      }
      
      // Reset resize state immediately for smooth UX
      setResizingEvent(null);
      setResizeHandle(null);
      document.body.classList.remove('resizing');
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [resizingEvent, resizeHandle, resizeStartX, resizeOriginalDuration, resizeOriginalStartTime, timeSlots, scheduleStartHour, settings.durationStepMinutes, dispatch, events, updateEmployeeEvent]);

  return (
    <div 
      className="grid-calendar" 
      style={{ 
        position: 'relative',
        '--calendar-row-height': `${settings.rowHeight}px`
      } as React.CSSProperties}
    >
      {/* Current Time Indicator - positioned relative to entire grid-calendar */}
      {currentTimePosition && isSameDay(new Date(), dates[0].date) && (
        <div 
          className="current-time-indicator day-view"
          style={{
            ...getCurrentTimeIndicatorStyle(),
            height: '100%', // Span full height of grid-calendar
            zIndex: 1000 // On top of everything including headers
          } as React.CSSProperties}
          title={`Current time: ${currentTimePosition.time}`}
        />
      )}

      {/* Header */}
      <div className="calendar-header">
        <div className="header-left">
          <div className="date-range">{getDateRange()}</div>
          {venueSchedule && (
            <div className="venue-schedule-info">
              {venueSchedule.closed ? (
                <span className="text-red-600 font-medium">Closed today</span>
              ) : (
                <span className="text-green-600 font-medium">
                  Open: {venueSchedule.open} - {venueSchedule.close}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="header-center">
          <button 
            className="nav-button"
            onClick={() => handleNavigation('prev')}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            className="nav-button"
            onClick={() => handleNavigation('next')}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="header-right">
          
          <button 
            className="quick-add-button"
            onClick={handleQuickAdd}
            title="Quick add event for current time"
          >
            <Calendar size={16} />
            Add Event
          </button>
          
          <button 
            className="today-button"
            onClick={() => handleNavigation('today')}
          >
            <Calendar size={16} />
            Today
          </button>
          
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid" style={{ position: 'relative' }} ref={gridRef}>
        {/* Resource and Time Headers */}
        <div className="day-headers day-view-headers">
          <div className="resource-header">Resources</div>
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot.time} className="time-header-cell">
              <div className="time-label">{timeSlot.label}</div>
            </div>
          ))}
        </div>

        {/* Resource Rows (grouped by service) */}
        {sortedResources.map((resource, idx) => {
          const isFirstInGroup = idx === 0 || sortedResources[idx - 1].service !== resource.service;
          const groupHeader = isFirstInGroup ? (
            <div key={`day-group-${resource.service}-${idx}`} className="resource-row day-view-row service-group">
              <div className="service-group-header" style={{ ['--service-color' as any]: getServiceColor(resource.service) }}>{resource.service}</div>
              <div className="time-slots-container service-group-spacer"></div>
            </div>
          ) : null;
          return (
            <>
              {groupHeader}
              <div key={resource.id} className="resource-row day-view-row">
                {/* Resource Info */}
                <div 
                  className={`resource-cell clickable-resource ${
                    isSeatSoonToBeAvailable(resource.id, dates[0].date)
                      ? 'seat-soon-available'
                      : isSeatCurrentlyOccupied(resource.id, dates[0].date)
                        ? 'seat-occupied'
                        : isSeatSoonToBeOccupied(resource.id, dates[0].date)
                          ? 'seat-soon-occupied'
                          : 'seat-available'
                  }`}
                  style={{ ['--service-color' as any]: getServiceColor(resource.service) }}
                  onClick={() => handleResourceClick(resource.id)}
                  title={
                    isSeatSoonToBeAvailable(resource.id, dates[0].date)
                      ? `${resource.name} - Will be available soon`
                      : isSeatCurrentlyOccupied(resource.id, dates[0].date)
                        ? `${resource.name} - Currently occupied`
                        : isSeatSoonToBeOccupied(resource.id, dates[0].date)
                          ? `${resource.name} - Will be occupied within the next hour`
                          : `Click to quick add for ${resource.name}`
                  }
                >
                  <div className="resource-info" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <div className="resource-name" style={{ flex: 1, minWidth: 0 }}>
                      <SeatNameEditor
                        seatName={resource.name}
                        onSave={(newName) => updateSeatName({ resourceId: resource.id, newName })}
                        isUpdating={isUpdating}
                      />
                    </div>
                    <div className="seat-reorder-controls" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSeat(resource.id, 'up', sortedResources);
                        }}
                        disabled={(() => {
                          const serviceResources = sortedResources.filter(r => r.service === resource.service);
                          const currentIndex = serviceResources.findIndex(r => r.id === resource.id);
                          return currentIndex === 0;
                        })()}
                        className="seat-reorder-btn"
                        title="Move seat up"
                        style={{
                          padding: '2px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          transition: 'all 0.2s',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.color = '#3b82f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSeat(resource.id, 'down', sortedResources);
                        }}
                        disabled={(() => {
                          const serviceResources = sortedResources.filter(r => r.service === resource.service);
                          const currentIndex = serviceResources.findIndex(r => r.id === resource.id);
                          return currentIndex === serviceResources.length - 1;
                        })()}
                        className="seat-reorder-btn"
                        title="Move seat down"
                        style={{
                          padding: '2px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          transition: 'all 0.2s',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.color = '#3b82f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Time Cells Container */}
                <div className="time-slots-container">
                  {/* Time Cells */}
                  {timeSlots.map((timeSlot, timeSlotIndex) => {
                    const isDragOverCell = dragOverResource === resource.id && dragOverTimeSlot === timeSlotIndex;
                    const wouldExceed = draggingEvent && wouldExceedClosingTime(timeSlot.time, draggingEvent.duration);
                    const hasConflict = draggingEvent && wouldCauseConflict(
                      draggingEvent.id,
                      resource.id,
                      timeSlot.time,
                      draggingEvent.duration,
                      selectedDate
                    );
                    const differentService = draggingEvent && isDifferentService(draggingEvent.resourceId, resource.id);
                    
                    return (
                      <div 
                        key={`${resource.id}-${timeSlot.time}`}
                        className={`day-cell time-slot-cell ${
                          isDragOverCell
                            ? (wouldExceed || hasConflict || differentService) ? 'drag-over-invalid' : 'drag-over'
                            : ''
                        }`}
                        onClick={() => handleCellClick(resource.id, dates[0].date, timeSlot.time)}
                        onDragOver={(e) => handleDragOver(e, resource.id, timeSlotIndex)}
                        onDrop={(e) => handleDrop(e, resource.id, timeSlotIndex)}
                      >
                      </div>
                    );
                  })}
                  
                  
                  {/* Events positioned absolutely */}
                  {getEventsForResourceAndDate(resource.id, dates[0].date).map((event) => {
                    // Determine start time source (use actualStartTime for open-duration if available)
                    let startHours: number;
                    let startMinutes: number;
                    if (event.isOpenDuration && event.actualStartTime) {
                      startHours = event.actualStartTime.getHours();
                      startMinutes = event.actualStartTime.getMinutes();
                    } else {
                      const [h, m] = event.startTime.split(':').map(Number);
                      startHours = h;
                      startMinutes = m;
                    }
                    let eventHour24 = startHours;
                    const spansMidnight = scheduleEndHour < scheduleStartHour;
                    // For next-day hours in an overnight schedule, add 24 to match timeSlots format
                    if (spansMidnight && eventHour24 >= 0 && eventHour24 <= scheduleEndHour) {
                      eventHour24 += 24;
                    }
                    
                    // Find the base time slot index for this event (hour-based)
                    const timeSlotIndex = timeSlots.findIndex(slot => slot.hour === eventHour24);
                    
                    if (timeSlotIndex === -1) return null;
                    
                    // Calculate position within the time slots container
                    // Each time slot is 1fr (equal width), so we calculate the percentage within the time slots area
                    const timeSlotWidthPercent = 100 / timeSlots.length;
                    const basePositionPercent = (timeSlotIndex / timeSlots.length) * 100;
                    const minuteOffsetPercent = (startMinutes / 60) * timeSlotWidthPercent;
                    const leftPositionPercent = basePositionPercent + minuteOffsetPercent;

                    // Compute dynamic width based on actual duration
                    let widthHours: number;
                    if (event.isOpenDuration) {
                      // If the open-duration session has ended, size it to actual duration
                      if (event.eventStatus === 'ended' && event.actualStartTime && event.actualEndTime) {
                        // Calculate actual duration in hours
                        const actualDurationMs = event.actualEndTime.getTime() - event.actualStartTime.getTime();
                        widthHours = actualDurationMs / (1000 * 60 * 60); // Convert to hours
                        
                        // Ensure it doesn't exceed the visible schedule window
                        const maxWidth = timeSlots.length - (timeSlotIndex + (startMinutes / 60));
                        widthHours = Math.min(widthHours, maxWidth);
                        
                      } else {
                        // Active open-duration: stretch to end of schedule or next event
                        const resourceEvents = getEventsForResourceAndDate(resource.id, dates[0].date);
                        
                        // Find the next event start time
                        let nextEventStart: number | null = null;
                        for (const otherEvent of resourceEvents) {
                          if (otherEvent.id === event.id) continue;
                          
                          const [otherHour, otherMinute] = otherEvent.startTime.split(':').map(Number);
                          let otherHourAdj = otherHour;
                          
                          // Adjust for midnight-spanning schedules
                          if (spansMidnight && otherHourAdj >= 0 && otherHourAdj <= scheduleEndHour) {
                            otherHourAdj += 24;
                          }
                          
                          const otherTimeSlotIndex = timeSlots.findIndex(slot => slot.hour === otherHourAdj);
                          if (otherTimeSlotIndex !== -1) {
                            const otherStartPos = otherTimeSlotIndex + (otherMinute / 60);
                            const currentStartPos = timeSlotIndex + (startMinutes / 60);
                            
                            if (otherStartPos > currentStartPos) {
                              if (nextEventStart === null || otherStartPos < nextEventStart) {
                                nextEventStart = otherStartPos;
                              }
                            }
                          }
                        }
                        
                        // Calculate width to next event or end of schedule
                        const currentStartPos = timeSlotIndex + (startMinutes / 60);
                        const maxWidth = timeSlots.length - currentStartPos;
                        
                        if (nextEventStart !== null) {
                          widthHours = Math.min(nextEventStart - currentStartPos, maxWidth);
                        } else {
                          widthHours = maxWidth;
                        }
                      }
                    } else {
                      // Fixed duration: use the actual duration
                      widthHours = event.duration || 1;
                      
                      // Ensure it doesn't exceed the visible schedule window
                      const currentStartPos = timeSlotIndex + (startMinutes / 60);
                      const maxWidth = timeSlots.length - currentStartPos;
                      widthHours = Math.min(widthHours, maxWidth);
                    }

                    // Convert width to percentage within the time slots area
                    const widthPercent = (widthHours / timeSlots.length) * 100;
                    
                    
                    return (
                      <EventBlock 
                        key={event.id} 
                        event={event} 
                        onClick={() => handleEventClick(event)}
                        onDragStart={handleEventDragStart}
                        onDragEnd={handleDragEnd}
                        onResizeStart={handleResizeStart}
                        isDragging={draggingEvent?.id === event.id}
                        style={{
                          position: 'absolute',
                          left: `${leftPositionPercent}%`,
                          width: `${widthPercent}%`,
                          top: '8px',
                          height: 'calc(100% - 16px)',
                          zIndex: 10,
                          visibility: draggingEvent?.id === event.id ? 'hidden' : 'visible'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          );
        })}
      </div>


      {/* Event Form Modal is now handled by parent component */}

    </div>
  );
}
