import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

export const useDeleteAccount = () => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (confirmationText: string) => {
      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        body: { confirmationText }
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
      toast({
        title: t('common.profile.accountDeleted'),
        description: t('common.profile.accountDeletedDescription'),
        variant: "default",
      });
      
      // Sign out the user after successful deletion
      setTimeout(() => {
        signOut();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Delete account error:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete account',
        variant: "destructive",
      });
    },
  });
};
