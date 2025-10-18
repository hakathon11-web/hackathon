import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateAdminAccess } from '@/utils/adminSecurity';
import type { Database } from '@/integrations/supabase/types';

type AdminProfile = Database['public']['Tables']['profiles']['Row'];

export const useAdminAuth = () => {
  // useAdminAuth: Hook called
  const { user, session, loading: authLoading, signOut } = useAuth();
  
  // useAdminAuth: Auth state logged (sensitive data removed)

  const { data: profile, isLoading: profileLoading, error: profileError, isError } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetching admin profile
      
      // Fetch the profile directly without syncing first
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id!)
        .single();

      if (error) {
        console.error('Critical: Error fetching admin profile');
        
        // SECURITY FIX: Do not automatically create admin profiles
        // This prevents privilege escalation attacks
        if (error.code === 'PGRST116') { // No rows returned
          console.warn('⚠️ No admin profile found for user. Admin privileges must be granted manually.');
          return null;
        }
        
        // For other errors, return null to prevent infinite loading
        return null;
      }
      
      // Admin profile fetched successfully
      return data;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 60000, // Cache for 1 minute
    retry: 1, // Retry once to handle profile creation
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Enhanced admin validation with security checks
  const isAdmin = profile && profile.role === 'admin' && profile.id === user?.id;
  
  // Additional security validation using the secure admin validation function
  const { data: adminValidation } = useQuery({
    queryKey: ['admin-validation', user?.id],
    queryFn: async () => {
      if (!user?.id || !isAdmin) return { isValid: false, isAdmin: false };
      return await validateAdminAccess(user.id);
    },
    enabled: !!user?.id && isAdmin,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Final admin status with enhanced security validation
  const finalIsAdmin = isAdmin && adminValidation?.isValid === true;
  
  // Show loading if auth is loading OR if we're actively fetching profile
  // But don't show loading if we have an error (to prevent infinite loading)
  const loading = authLoading || (profileLoading && !isError);

  // Debug logging
  // Admin Auth Debug: sensitive data removed from logs

  return {
    user,
    session,
    profile,
    loading,
    isAdmin: finalIsAdmin,
    signOut,
    // Additional security information
    adminValidation,
  };
};