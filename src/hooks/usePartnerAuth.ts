import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PartnerProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: 'customer' | 'partner' | 'admin';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const usePartnerAuth = () => {
  const { user, session, loading: authLoading, signInWithEmail, signUpWithEmail, signOut } = useAuth();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['partner-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First check if we have a cached profile
      const cachedProfile = sessionStorage.getItem(`partner_profile_${user.id}`);
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.role === 'partner' || parsed.role === 'admin') {
            return parsed as PartnerProfile;
          }
        } catch (e) {
          // Clear invalid cache
          sessionStorage.removeItem(`partner_profile_${user.id}`);
        }
      }

      // If no cache or not a partner, fetch from API
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_number, role, avatar_url, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch partner profile:', error);
        // Don't throw error, return null instead to prevent infinite retries
        return null;
      }

      // Cache the profile if it's a partner/admin
      if (data && (data.role === 'partner' || data.role === 'admin')) {
        sessionStorage.setItem(`partner_profile_${user.id}`, JSON.stringify(data));
      }

      return data as PartnerProfile;
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 3600000, // Keep in cache for 1 hour (formerly cacheTime)
    retry: false, // Don't retry on error to prevent infinite loading
    retryOnMount: false, // Don't retry when component mounts
  });

  const signUpAsPartner = async (email: string, password: string, fullName: string, phoneNumber: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/partner/dashboard`,
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            role: 'partner'
          }
        }
      });

      if (!error) {
        // Clear any existing profile cache
        if (user?.id) {
          sessionStorage.removeItem(`partner_profile_${user.id}`);
        }
      }

      return { error };
    } catch (error) {
      console.error('Partner signup error:', error);
      return { error };
    }
  };

  // Consider user a partner if they have the role or are an admin
  const isPartner = profile?.role === 'partner' || profile?.role === 'admin';
  
  // Only show loading if auth is loading OR if we're actively fetching profile
  // Don't show loading if profile query failed
  const loading = authLoading || (profileLoading && !profileError);

  return {
    user,
    session,
    profile,
    loading,
    isPartner,
    signInWithEmail,
    signUpAsPartner,
    signOut,
  };
};