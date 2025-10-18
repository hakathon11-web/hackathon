import React, { useState } from 'react';
import { SchedulerProvider } from './context/SchedulerContext';
import { SettingsProvider } from './context/SettingsContext';
import { GridCalendar } from './components/GridCalendar';
import { SettingsDialog } from './components/SettingsDialog';
import { EventForm } from './components/EventForm';
import { useVenueCalendarData } from '@/hooks/useVenueCalendarData';
import './calendar.css';

// Standalone scheduler component that can be imported into other React apps
export interface SchedulerStandaloneProps {
  // Optional props to customize the scheduler
  title?: string;
  showSettings?: boolean;
  scheduleStartHour?: number;
  scheduleEndHour?: number;
  className?: string;
  style?: React.CSSProperties;
  // Venue ID to fetch real venue data
  venueId?: string;
  // Callback for when events are created/updated
  onEventChange?: (event: any) => void;
  // Initial data (fallback if venueId not provided)
  initialResources?: any[];
  initialEvents?: any[];
}

export function SchedulerStandalone({
  title = "Calendar",
  showSettings = true,
  scheduleStartHour,
  scheduleEndHour,
  className = "",
  style,
  venueId,
  onEventChange,
  initialResources,
  initialEvents
}: SchedulerStandaloneProps) {
  if (!venueId) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400">
          <h3 className="text-lg font-semibold mb-2">Configuration Error</h3>
          <p>Venue ID is required but was not provided. Please contact your administrator.</p>
        </div>
      </div>
    );
  }
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormProps, setEventFormProps] = useState<any>(null);

  // Clean up function for when event form is closed or completed
  const handleEventFormClose = () => {
    setShowEventForm(false);
    setEventFormProps(null);
  };

  // Success callback for when event is created/updated
  const handleEventSuccess = () => {
    // Any additional cleanup or success handling can go here
    // For now, we just close the form
    handleEventFormClose();
  };
  
  // Fetch venue data for loading states
  const { data: venueData, isLoading, error } = useVenueCalendarData(venueId || '');

  // Show loading state
  if (isLoading && venueId) {
    return (
      <div className={`scheduler-standalone ${className}`} style={style}>
        <header className="app-header">
          <h1 className="app-title">{title}</h1>
        </header>
        <main className="app-main">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading venue resources...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error && venueId) {
    return (
      <div className={`scheduler-standalone ${className}`} style={style}>
        <header className="app-header">
          <h1 className="app-title">{title}</h1>
        </header>
        <main className="app-main">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Failed to load venue data</p>
              <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show empty state if no resources
  if (venueData && venueData.resources.length === 0) {
    return (
      <div className={`scheduler-standalone ${className}`} style={style}>
        <header className="app-header">
          <h1 className="app-title">{title}</h1>
        </header>
        <main className="app-main">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No services configured</p>
              <p className="text-sm text-muted-foreground">This venue doesn't have any services set up yet</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <SchedulerProvider 
        venueId={venueId}
        initialResources={initialResources}
        initialEvents={initialEvents}
        onEventChange={onEventChange}
      >
        <div className={`scheduler-standalone ${className}`} style={style}>
          <main className="app-main">
            <GridCalendar 
              scheduleStartHour={scheduleStartHour}
              scheduleEndHour={scheduleEndHour}
              onShowEventForm={(props) => {
                setEventFormProps(props);
                setShowEventForm(true);
              }}
            />
          </main>

          {showSettings && (
            <SettingsDialog 
              open={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
            />
          )}

          {showEventForm && eventFormProps && (
            <EventForm
              {...eventFormProps}
              venueId={venueId}
              onClose={handleEventFormClose}
              onSuccess={handleEventSuccess}
            />
          )}
        </div>
      </SchedulerProvider>
    </SettingsProvider>
  );
}

// Default export for easy importing
export default SchedulerStandalone;
