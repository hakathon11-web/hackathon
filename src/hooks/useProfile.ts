
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  role: 'customer' | 'partner' | 'admin';
  created_at: string | null;
  updated_at: string | null;
  terms_accepted_at?: string | null;
  location_consent?: boolean | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data as UserProfile;
    },
    enabled: !!user,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('User not authenticated');

      // First get the current profile to see what fields exist
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Failed to fetch current profile:', fetchError);
        throw fetchError;
      }

      // Only include fields that exist in the current profile
      const validUpdates = Object.keys(updates).reduce((acc, key) => {
        if (key in currentProfile) {
          acc[key] = updates[key];
        }
        return acc;
      }, {} as Record<string, any>);

      // Add updated_at if it exists in the schema
      if ('updated_at' in currentProfile) {
        validUpdates.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(validUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Profile update mutation error:', error);
    }
  });
};
