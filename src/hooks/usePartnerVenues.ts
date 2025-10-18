import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Venue } from './useVenues';

import { WorkingHours } from '@/components/DailyWorkingHours';

export interface CreateVenueData {
  name: string;
  location: string;
  district: string;
  images: string[];
  workingHours: WorkingHours;
  latitude?: number;
  longitude?: number;
  main_category?: string;
}

export const usePartnerVenues = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['partner-venues', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('partner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch partner venues:', error);
        // Return empty array instead of throwing to prevent infinite retries
        return [];
      }
      return data as Venue[];
    },
    enabled: !!user?.id,
    retry: false, // Don't retry on error to prevent infinite loading
    retryOnMount: false, // Don't retry when component mounts
  });
};

export const useCreateVenue = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueData: CreateVenueData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('venues')
        .insert([{
          name: venueData.name,
          location: venueData.location,
          district: venueData.district,
          images: venueData.images,
          working_hours: venueData.workingHours,
          latitude: venueData.latitude,
          longitude: venueData.longitude,
          main_category: venueData.main_category || 'gaming',
          partner_id: user.id,
          rating: 0,
          review_count: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
    },
  });
};

export const useUpdateVenue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...venueData }: Partial<Venue> & { id: string }) => {
      const { data, error } = await supabase
        .from('venues')
        .update(venueData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};

export const useDeleteVenue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
};