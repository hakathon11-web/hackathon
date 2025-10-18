import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SeatNamesMap {
  [resourceId: string]: string;
}

interface SeatPositionsMap {
  [resourceId: string]: number;
}

interface CalendarSettings {
  seatNames?: SeatNamesMap;
  seatPositions?: SeatPositionsMap;
  [key: string]: any;
}

export const useSeatNames = (venueId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch seat names and positions from venue_calendar_settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['seat-settings', venueId],
    queryFn: async () => {
      if (!venueId) return { seatNames: {}, seatPositions: {} };

      const { data, error } = await supabase
        .from('venue_calendar_settings')
        .select('settings')
        .eq('venue_id', venueId)
        .single();

      if (error) {
        // If no settings exist yet, return empty objects
        if (error.code === 'PGRST116') {
          return { seatNames: {}, seatPositions: {} };
        }
        throw error;
      }

      const settings = data?.settings as CalendarSettings;
      return {
        seatNames: settings?.seatNames || {},
        seatPositions: settings?.seatPositions || {},
      };
    },
    enabled: !!venueId,
  });

  // Update seat name mutation with optimistic updates
  const updateSeatName = useMutation({
    mutationFn: async ({ resourceId, newName }: { resourceId: string; newName: string }) => {
      if (!venueId) throw new Error('Venue ID is required');

      // Store old name for potential rollback
      const oldName = settingsData?.seatNames?.[resourceId];

      // OPTIMISTIC UPDATE: Update UI immediately
      const newSeatNames = {
        ...(settingsData?.seatNames || {}),
        [resourceId]: newName,
      };

      // Update seat-settings cache
      queryClient.setQueryData(['seat-settings', venueId], {
        seatNames: newSeatNames,
        seatPositions: settingsData?.seatPositions || {},
      });

      // ALSO update venue-calendar-data cache directly (optimistic)
      // This prevents a refetch from the database which still has the old name
      const currentCalendarData = queryClient.getQueryData(['venue-calendar-data', venueId]) as any;
      if (currentCalendarData?.resources) {
        const updatedResources = currentCalendarData.resources.map((resource: any) => {
          if (resource.id === resourceId) {
            return { ...resource, name: newName };
          }
          return resource;
        });
        
        queryClient.setQueryData(['venue-calendar-data', venueId], {
          ...currentCalendarData,
          resources: updatedResources,
        });
      }

      console.log(`🎯 Optimistically renamed seat to: ${newName}`);

      // Update database in background
      try {
        // First, get existing settings
        const { data: existingData, error: fetchError } = await supabase
          .from('venue_calendar_settings')
          .select('settings')
          .eq('venue_id', venueId)
          .single();

        let settings: CalendarSettings = {};
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existingData) {
          settings = existingData.settings as CalendarSettings;
        }

        // Update seat names
        const updatedSeatNames = {
          ...(settings.seatNames || {}),
          [resourceId]: newName,
        };

        const updatedSettings = {
          ...settings,
          seatNames: updatedSeatNames,
        };

        // Upsert the settings
        const { error: upsertError } = await supabase
          .from('venue_calendar_settings')
          .upsert({
            venue_id: venueId,
            settings: updatedSettings,
          }, {
            onConflict: 'venue_id',
          });

        if (upsertError) throw upsertError;

        console.log(`✅ Database updated successfully - seat renamed to: ${newName}`);

        return { 
          seatNames: updatedSeatNames, 
          seatPositions: settings.seatPositions || {},
          oldName,
          resourceId,
        };
      } catch (error) {
        // If database update fails, throw to trigger onError
        throw error;
      }
    },
    onSuccess: ({ seatNames, seatPositions }) => {
      // Update the cache with confirmed data (should already match optimistic update)
      queryClient.setQueryData(['seat-settings', venueId], { seatNames, seatPositions });
      
      // NOW we can invalidate to ensure everything is in sync with the database
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });
      
      toast({
        title: 'Seat renamed successfully',
        description: 'The seat name has been updated.',
      });
    },
    onError: (error, variables) => {
      console.error('❌ Failed to update seat name in database:', error);
      
      // ROLLBACK: Revert optimistic update on error
      const oldSeatNames = { ...(settingsData?.seatNames || {}) };
      
      queryClient.setQueryData(['seat-settings', venueId], {
        seatNames: oldSeatNames,
        seatPositions: settingsData?.seatPositions || {},
      });
      
      // Also revert the calendar data cache
      const currentCalendarData = queryClient.getQueryData(['venue-calendar-data', venueId]) as any;
      if (currentCalendarData?.resources) {
        const revertedResources = currentCalendarData.resources.map((resource: any) => {
          if (resource.id === variables.resourceId) {
            // Revert to old name (or default if no old name)
            const oldName = oldSeatNames[variables.resourceId];
            if (oldName) {
              return { ...resource, name: oldName };
            }
          }
          return resource;
        });
        
        queryClient.setQueryData(['venue-calendar-data', venueId], {
          ...currentCalendarData,
          resources: revertedResources,
        });
      }
      
      // Re-invalidate to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });
      
      toast({
        title: 'Failed to rename seat',
        description: 'An error occurred while updating the seat name. Changes have been reverted.',
        variant: 'destructive',
      });
    },
  });

  // Function to move a seat up or down with optimistic updates
  const moveSeat = async (resourceId: string, direction: 'up' | 'down', sortedResources: any[]) => {
    if (!venueId) return;

    // Find the resource being moved
    const resource = sortedResources.find((r: any) => r.id === resourceId);
    if (!resource) return;

    // Get resources in the same service
    const serviceResources = sortedResources.filter((r: any) => r.service === resource.service);
    const currentIndex = serviceResources.findIndex((r: any) => r.id === resourceId);

    // Check if move is valid
    if (direction === 'up' && currentIndex === 0) return; // Already at top
    if (direction === 'down' && currentIndex === serviceResources.length - 1) return; // Already at bottom

    // Calculate new positions for all seats in this service
    const newPositions = { ...settingsData?.seatPositions || {} };
    const oldPositions = { ...settingsData?.seatPositions || {} }; // Keep backup for rollback
    
    if (direction === 'up') {
      // Swap with previous seat
      const prevResource = serviceResources[currentIndex - 1];
      newPositions[resourceId] = currentIndex - 1;
      newPositions[prevResource.id] = currentIndex;
    } else {
      // Swap with next seat
      const nextResource = serviceResources[currentIndex + 1];
      newPositions[resourceId] = currentIndex + 1;
      newPositions[nextResource.id] = currentIndex;
    }

    // OPTIMISTIC UPDATE: Update UI immediately
    queryClient.setQueryData(['seat-settings', venueId], {
      seatNames: settingsData?.seatNames || {},
      seatPositions: newPositions,
    });

    // Invalidate venue calendar data to trigger re-render with new positions
    queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });

    console.log(`🎯 Optimistically moved ${resource.name} ${direction}`);

    // Update database in background
    try {
      const { data: existingData, error: fetchError } = await supabase
        .from('venue_calendar_settings')
        .select('settings')
        .eq('venue_id', venueId)
        .single();

      let settings: CalendarSettings = {};
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        settings = existingData.settings as CalendarSettings;
      }

      const updatedSettings = {
        ...settings,
        seatPositions: newPositions,
      };

      const { error: upsertError } = await supabase
        .from('venue_calendar_settings')
        .upsert({
          venue_id: venueId,
          settings: updatedSettings,
        }, {
          onConflict: 'venue_id',
        });

      if (upsertError) throw upsertError;

      console.log(`✅ Database updated successfully for ${resource.name}`);

      toast({
        title: 'Seat position updated',
        description: `Moved ${resource.name} ${direction}.`,
      });
    } catch (error) {
      console.error('❌ Failed to update seat position in database:', error);
      
      // ROLLBACK: Revert optimistic update on error
      queryClient.setQueryData(['seat-settings', venueId], {
        seatNames: settingsData?.seatNames || {},
        seatPositions: oldPositions,
      });

      // Re-invalidate to revert the UI
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });

      toast({
        title: 'Failed to move seat',
        description: 'An error occurred while updating the seat position. Changes have been reverted.',
        variant: 'destructive',
      });
    }
  };

  return {
    seatNames: settingsData?.seatNames || {},
    seatPositions: settingsData?.seatPositions || {},
    isLoading,
    updateSeatName: updateSeatName.mutate,
    moveSeat,
    isUpdating: updateSeatName.isPending,
  };
};

