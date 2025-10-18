import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemSettings {
  id: string;
  booking_timeout_minutes: number;
  pre_arrival_reminder_hours: number;
  min_advance_booking_hours_for_reminder: number;
  partner_booking_request_emails_enabled: boolean;
  auto_approval_enabled: boolean;
  email_notifications_enabled: boolean;
  review_moderation_enabled: boolean;
  require_email_verification: boolean;
  allow_guest_bookings: boolean;
  default_commission_rate: number;
  minimum_booking_amount: number;
  max_advance_booking_days: number;
  maintenance_mode: boolean;
  created_at: string;
  updated_at: string;
}

const getDefaultSettings = (): Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'> => ({
  booking_timeout_minutes: 5, // Default to 5 minutes
  pre_arrival_reminder_hours: 24,
  min_advance_booking_hours_for_reminder: 6,
  partner_booking_request_emails_enabled: false,
  auto_approval_enabled: false,
  email_notifications_enabled: true,
  review_moderation_enabled: true,
  require_email_verification: true,
  allow_guest_bookings: false,
  default_commission_rate: 15,
  minimum_booking_amount: 25,
  max_advance_booking_days: 90,
  maintenance_mode: false,
});

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      console.log('🔧 Fetching system settings from database...');
      
      // Try to get settings from database first
      let { data, error } = await supabase
        .rpc('get_system_settings_v2');
      if (error) {
        console.warn('get_system_settings_v2 failed, falling back to v1:', error?.message || error);
        const fallback = await supabase.rpc('get_system_settings');
        data = fallback.data as any;
        if (fallback.error) throw fallback.error;
      }

      if (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log('🔧 System settings loaded from database:', data[0]);
        return data[0];
      }

      // Fallback to default settings if no data found
      console.log('🔧 No system settings found, using defaults');
      const defaultSettings = getDefaultSettings();
      return {
        id: 'default',
        ...defaultSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    staleTime: 30000, // Refetch every 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>>) => {
      console.log('🔄 Updating system settings:', settings);
      
      // Upsert via RPC to avoid RLS/policy issues and ensure creation on empty
      const { data, error } = await supabase
        .rpc('upsert_system_settings', {
          p_settings: settings as any
        });

      if (error) {
        console.error('Error updating system settings:', error);
        throw error;
      }

      console.log('🔄 System settings updated successfully:', data);
      console.log('⏱️ New timeout minutes:', data.booking_timeout_minutes);
      
      // Broadcast settings change to other components immediately
      window.dispatchEvent(new CustomEvent('system-settings-changed', { 
        detail: data 
      }));
      
      // Also broadcast a specific timeout change event
      window.dispatchEvent(new CustomEvent('admin-timeout-sync', { 
        detail: { timeoutMinutes: data.booking_timeout_minutes } 
      }));
      
      return data;
    },
    onSuccess: (data) => {
      // Update the cache immediately
      queryClient.setQueryData(['system-settings'], data);
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });
};