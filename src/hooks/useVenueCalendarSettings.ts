import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { VenueSettings } from '@/pages/employee/calendar/context/SettingsContext';

export interface VenueCalendarSettingsRecord {
  id: string;
  venue_id: string;
  settings: VenueSettings;
  created_at: string;
  updated_at: string;
}

// Default settings that match the original VenueSettings interface
const DEFAULT_SETTINGS: VenueSettings = {
  scheduleStartHour: 9,
  scheduleEndHour: 23,
  minuteStep: 5,
  defaultEventDurationHours: 1,
  durationStepMinutes: 30,
  resourceSoonThresholdMinutes: 60,
  resourceSoonAvailableThresholdMinutes: 60,
  rowHeight: 80, // Default row height in pixels
  resourceColors: {
    available: '#22c55e',
    soon: '#f59e0b',
    occupied: '#ef4444',
    soonAvailable: '#06b6d4',
  },
  productsCatalog: [
    { id: 'prod-cola', name: 'Coca-Cola', price: 2.5 },
    { id: 'prod-chips', name: 'Chips', price: 1.8 },
    { id: 'prod-water', name: 'Water', price: 1.2 },
    { id: 'prod-energy', name: 'Energy Drink', price: 3.0 },
  ],
};

/**
 * Hook to fetch venue calendar settings
 * Returns default settings if no settings exist in database
 */
export const useVenueCalendarSettings = (venueId: string) => {
  return useQuery({
    queryKey: ['venue-calendar-settings', venueId],
    queryFn: async (): Promise<VenueSettings> => {
      if (!venueId) {
        throw new Error('Venue ID is required');
      }

      // Ensure employee session is set if we're in an employee context
      const storedEmployee = sessionStorage.getItem('employee_session');
      if (storedEmployee) {
        try {
          const employee = JSON.parse(storedEmployee);
          console.log('🔧 Setting employee session for venue calendar settings fetch:', employee.id);
          await supabase.rpc('set_config', {
            setting_name: 'app.current_employee_id',
            setting_value: employee.id
          });
        } catch (e) {
          console.warn('Failed to set employee session for settings fetch:', e);
        }
      }

      const { data, error } = await supabase
        .from('venue_calendar_settings')
        .select('settings')
        .eq('venue_id', venueId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching venue calendar settings:', error);
        throw error;
      }

      // Return database settings or default settings if none exist
      if (data?.settings) {
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_SETTINGS, ...data.settings } as VenueSettings;
      }

      return DEFAULT_SETTINGS;
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to update venue calendar settings
 */
export const useUpdateVenueCalendarSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ venueId, settings }: { venueId: string; settings: Partial<VenueSettings> }) => {
      if (!venueId) {
        throw new Error('Venue ID is required');
      }

      // Ensure employee session is set if we're in an employee context
      const storedEmployee = sessionStorage.getItem('employee_session');
      if (storedEmployee) {
        try {
          const employee = JSON.parse(storedEmployee);
          console.log('🔧 Setting employee session for venue calendar settings update:', employee.id);
          await supabase.rpc('set_config', {
            setting_name: 'app.current_employee_id',
            setting_value: employee.id
          });
        } catch (e) {
          console.warn('Failed to set employee session for settings update:', e);
        }
      }

      // First, get current settings to merge with updates
      const { data: existingData, error: fetchError } = await supabase
        .from('venue_calendar_settings')
        .select('settings')
        .eq('venue_id', venueId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      // Merge existing settings with updates
      const currentSettings = existingData?.settings || DEFAULT_SETTINGS;
      const updatedSettings = { ...currentSettings, ...settings };

      // Upsert the settings (insert if not exists, update if exists)
      // Use onConflict to properly handle the unique constraint
      let data, error;
      
      if (existingData) {
        // Record exists, update it
        const updateResult = await supabase
          .from('venue_calendar_settings')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('venue_id', venueId)
          .select()
          .single();
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Record doesn't exist, insert it
        const insertResult = await supabase
          .from('venue_calendar_settings')
          .insert({
            venue_id: venueId,
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the settings query
      queryClient.invalidateQueries({
        queryKey: ['venue-calendar-settings', variables.venueId],
      });

      toast({
        title: 'Settings updated',
        description: 'Calendar settings have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating venue calendar settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to reset venue calendar settings to defaults
 */
export const useResetVenueCalendarSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (venueId: string) => {
      if (!venueId) {
        throw new Error('Venue ID is required');
      }

      // Ensure employee session is set if we're in an employee context
      const storedEmployee = sessionStorage.getItem('employee_session');
      if (storedEmployee) {
        try {
          const employee = JSON.parse(storedEmployee);
          console.log('🔧 Setting employee session for venue calendar settings reset:', employee.id);
          await supabase.rpc('set_config', {
            setting_name: 'app.current_employee_id',
            setting_value: employee.id
          });
        } catch (e) {
          console.warn('Failed to set employee session for settings reset:', e);
        }
      }

      // Upsert with default settings
      // First check if record exists
      const { data: existingData } = await supabase
        .from('venue_calendar_settings')
        .select('id')
        .eq('venue_id', venueId)
        .maybeSingle();

      let data, error;
      
      if (existingData) {
        // Record exists, update it
        const updateResult = await supabase
          .from('venue_calendar_settings')
          .update({
            settings: DEFAULT_SETTINGS,
            updated_at: new Date().toISOString(),
          })
          .eq('venue_id', venueId)
          .select()
          .single();
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Record doesn't exist, insert it
        const insertResult = await supabase
          .from('venue_calendar_settings')
          .insert({
            venue_id: venueId,
            settings: DEFAULT_SETTINGS,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, venueId) => {
      // Invalidate and refetch the settings query
      queryClient.invalidateQueries({
        queryKey: ['venue-calendar-settings', venueId],
      });

      toast({
        title: 'Settings reset',
        description: 'Calendar settings have been reset to defaults.',
      });
    },
    onError: (error) => {
      console.error('Error resetting venue calendar settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset calendar settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete venue calendar settings (removes custom settings, reverts to defaults)
 */
export const useDeleteVenueCalendarSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (venueId: string) => {
      if (!venueId) {
        throw new Error('Venue ID is required');
      }

      const { error } = await supabase
        .from('venue_calendar_settings')
        .delete()
        .eq('venue_id', venueId);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, venueId) => {
      // Invalidate and refetch the settings query (will return defaults)
      queryClient.invalidateQueries({
        queryKey: ['venue-calendar-settings', venueId],
      });

      toast({
        title: 'Settings deleted',
        description: 'Custom calendar settings have been removed. Using default settings.',
      });
    },
    onError: (error) => {
      console.error('Error deleting venue calendar settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete calendar settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
};
