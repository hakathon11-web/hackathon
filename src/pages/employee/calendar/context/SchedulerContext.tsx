import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import { addDays } from 'date-fns';
import type { WeekDate } from '../types.ts';
import { useVenueCalendarData, type VenueCalendarResource, type VenueCalendarEvent } from '@/hooks/useVenueCalendarData';
import { WorkingHours } from '@/components/DailyWorkingHours';

interface SchedulerState {
  resources: VenueCalendarResource[];
  events: VenueCalendarEvent[];
  selectedDate: Date;
  weekDates: WeekDate[];
  workingHours: WorkingHours | null;
}

type SchedulerAction =
  | { type: 'SET_RESOURCES'; payload: VenueCalendarResource[] }
  | { type: 'ADD_RESOURCE'; payload: VenueCalendarResource }
  | { type: 'UPDATE_RESOURCE'; payload: VenueCalendarResource }
  | { type: 'DELETE_RESOURCE'; payload: string }
  | { type: 'SET_EVENTS'; payload: VenueCalendarEvent[] }
  | { type: 'ADD_EVENT'; payload: VenueCalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: VenueCalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_WEEK_DATES'; payload: WeekDate[] }
  | { type: 'SET_WORKING_HOURS'; payload: WorkingHours | null }
  | { type: 'NAVIGATE_WEEK'; payload: 'prev' | 'next' | 'today' };

// Helper function to determine the correct initial date based on current time
const getInitialDate = (): Date => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If current time is between 00:00-02:59, show previous day
  if (currentHour >= 0 && currentHour <= 2) {
    return addDays(now, -1);
  }
  
  // Otherwise show current day
  return now;
};

const initialState: SchedulerState = {
  resources: [],
  events: [],
  selectedDate: getInitialDate(),
  weekDates: [],
  workingHours: null
};

function schedulerReducer(state: SchedulerState, action: SchedulerAction): SchedulerState {
  switch (action.type) {
    case 'SET_RESOURCES':
      return { ...state, resources: action.payload };
    
    case 'ADD_RESOURCE':
      return { ...state, resources: [...state.resources, action.payload] };
    
    case 'UPDATE_RESOURCE':
      return {
        ...state,
        resources: state.resources.map(resource =>
          resource.id === action.payload.id ? action.payload : resource
        )
      };
    
    case 'DELETE_RESOURCE':
      return {
        ...state,
        resources: state.resources.filter(resource => resource.id !== action.payload),
        events: state.events.filter(event => event.resourceId !== action.payload)
      };
    
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id ? action.payload : event
        )
      };
    
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    
    case 'SET_WEEK_DATES':
      return { ...state, weekDates: action.payload };
    
    case 'SET_WORKING_HOURS':
      return { ...state, workingHours: action.payload };
    
    case 'NAVIGATE_WEEK':
      const currentDate = new Date(state.selectedDate);
      let newDate: Date;
      
      switch (action.payload) {
        case 'prev':
          newDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'next':
          newDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'today':
        default:
          newDate = getInitialDate();
          break;
      }
      
      return { ...state, selectedDate: newDate };
    
    default:
      return state;
  }
}

interface SchedulerContextType {
  state: SchedulerState;
  dispatch: React.Dispatch<SchedulerAction>;
  venueId?: string;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export function SchedulerProvider({ 
  children, 
  venueId,
  initialResources, 
  initialEvents, 
  onEventChange 
}: { 
  children: ReactNode;
  venueId?: string;
  initialResources?: any[];
  initialEvents?: any[];
  onEventChange?: (event: any) => void;
}) {
  // Fetch venue calendar data
  const { data: venueData, isLoading } = useVenueCalendarData(venueId || '');
  
  const [state, dispatch] = useReducer(schedulerReducer, {
    ...initialState,
    resources: initialResources || venueData?.resources || initialState.resources,
    events: initialEvents || venueData?.events || initialState.events,
    workingHours: venueData?.workingHours || initialState.workingHours
  });

  // Update state when venue data changes
  React.useEffect(() => {
    if (venueData) {
      dispatch({ type: 'SET_RESOURCES', payload: venueData.resources });
      dispatch({ type: 'SET_EVENTS', payload: venueData.events });
      dispatch({ type: 'SET_WORKING_HOURS', payload: venueData.workingHours });
    }
  }, [venueData]);

  return (
    <SchedulerContext.Provider value={{ state, dispatch, venueId }}>
      {children}
    </SchedulerContext.Provider>
  );
}

export function useScheduler() {
  const context = useContext(SchedulerContext);
  if (context === undefined) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
}
