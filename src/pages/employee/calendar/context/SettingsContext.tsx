import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../types.ts';
import { 
  useVenueCalendarSettings, 
  useUpdateVenueCalendarSettings, 
  useResetVenueCalendarSettings 
} from '@/hooks/useVenueCalendarSettings';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';

export type VenueSettings = {
  scheduleStartHour: number; // 0-23
  scheduleEndHour: number;   // 0-23 (can be less than start to span midnight)
  minuteStep: number;        // 5, 10, 15, etc.
  defaultEventDurationHours: number; // default for fixed events
  durationStepMinutes: number; // e.g., 30, 15, 60 (affects EventForm options)
  resourceSoonThresholdMinutes: number; // e.g., 60
  resourceSoonAvailableThresholdMinutes: number; // e.g., 60
  rowHeight: number; // Height of calendar rows in pixels (e.g., 60, 80, 100, 120)
  resourceColors: {
    available: string;
    soon: string;
    occupied: string;
    soonAvailable: string;
  };
  productsCatalog: Product[]; // predefined list of attachable products
};

type SettingsContextType = {
  settings: VenueSettings;
  updateSettings: (partial: Partial<VenueSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { employee } = useEmployeeAuth();
  const venueId = employee?.venue_id;

  // Fetch settings from database
  const { 
    data: settings = {} as VenueSettings, 
    isLoading, 
    isError, 
    error 
  } = useVenueCalendarSettings(venueId || '');

  // Mutation hooks for updating settings
  const updateSettingsMutation = useUpdateVenueCalendarSettings();
  const resetSettingsMutation = useResetVenueCalendarSettings();

  // Local state to handle immediate UI updates before database sync
  const [localSettings, setLocalSettings] = useState<VenueSettings>(settings);

  // Update local state when database settings change
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateSettings = async (partial: Partial<VenueSettings>) => {
    // Optimistically update local state for immediate UI feedback
    setLocalSettings(prev => ({ ...prev, ...partial }));

    // Update database if venue ID is available
    if (venueId) {
      updateSettingsMutation.mutate({ venueId, settings: partial });
    }
  };

  const resetSettings = async () => {
    if (venueId) {
      resetSettingsMutation.mutate(venueId);
    }
  };

  const value = useMemo<SettingsContextType>(() => ({
    settings: localSettings,
    updateSettings,
    resetSettings,
    isLoading,
    isError,
    error,
  }), [localSettings, isLoading, isError, error, updateSettings, resetSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export type { VenueSettings };


