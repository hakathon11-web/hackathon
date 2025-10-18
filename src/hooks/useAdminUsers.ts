import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'customer' | 'partner' | 'admin';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // We'll add a status field later if needed
}

export const useAdminUsers = (searchTerm?: string, roleFilter?: string) => {
  return useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter as 'customer' | 'partner' | 'admin');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AdminUser[];
    },
  });
};

export const useUserBookings = (userId: string) => {
  return useQuery({
    queryKey: ['user-bookings-admin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            name,
            location
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Call the Edge Function to properly delete user from both auth.users and profiles
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      // Check if the response contains an error message
      if (data && data.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('notifications.userManagement.deleted'));
    },
    onError: (error) => {
      console.error('Delete user error:', error);
      toast.error(t('notifications.userManagement.failedDeletion', { error: error.message }));
    },
  });
};

