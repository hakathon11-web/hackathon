
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseSessionKey } from '@/config/supabase';
import { isPasswordStrong, getPasswordValidationMessage } from '@/utils/passwordValidation';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Memoized functions to prevent unnecessary re-renders
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Critical: Sign in failed');
        return { error };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { error: { message: 'Please confirm your email address before signing in' } };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      // Basic validation
      if (!email.trim() || !password.trim()) {
        return { error: { message: 'Email and password are required' } };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      // Strong password validation
      if (!isPasswordStrong(password)) {
        return { error: { message: getPasswordValidationMessage(password) } };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            // Add any additional user metadata here
            signup_date: new Date().toISOString(),
            source: 'web'
          }
        }
      });

      if (error) {
        console.error('Critical: Sign up failed');
        return { error };
      }

      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        // User created successfully, email confirmation required
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Starting sign out process
      
      // Clear local state first to prevent UI issues
      setUser(null);
      setSession(null);
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      // Clear storage regardless of Supabase result
      try {
        // Clear all Supabase-related localStorage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage but preserve employee sessions
        const employeeSession = sessionStorage.getItem('employee_session');
        sessionStorage.clear();
        if (employeeSession) {
          sessionStorage.setItem('employee_session', employeeSession);
        }
        
        // Clear any pending booking data that might be stored
        localStorage.removeItem('pendingBookingData');
        localStorage.removeItem('pendingBookingDialog');
      } catch (storageError) {
        // Error clearing storage, doing selective clear
        const employeeSession = sessionStorage.getItem('employee_session');
        localStorage.clear();
        sessionStorage.clear();
        if (employeeSession) {
          sessionStorage.setItem('employee_session', employeeSession);
        }
      }
      
      if (error) {
        // Supabase sign out had error, but continuing
      }
      
      // Sign out completed successfully
      return { error: null }; // Always return success since we cleared local state
    } catch (error) {
      console.error('Critical: Unexpected sign out error');
      
      // Force clear everything even if there was an error
      setUser(null);
      setSession(null);
      try {
        const employeeSession = sessionStorage.getItem('employee_session');
        localStorage.clear();
        sessionStorage.clear();
        if (employeeSession) {
          sessionStorage.setItem('employee_session', employeeSession);
        }
      } catch (e) {
        console.error('Critical: Even clearing storage failed');
      }
      
      return { error: null }; // Return success anyway since we cleared local state
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      if (!email.trim()) {
        return { error: { message: 'Email is required' } };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Critical: Password reset failed');
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Critical: Unexpected password reset error');
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      if (!password.trim()) {
        return { error: { message: 'Password is required' } };
      }

      if (password.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } };
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Critical: Password update failed');
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Critical: Unexpected password update error');
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Setting up auth state listener
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Auth state changed
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_OUT':
          case 'TOKEN_REFRESHED':
            setSession(session);
            setUser(session?.user ?? null);
            break;
          case 'SIGNED_IN':
            setSession(session);
            setUser(session?.user ?? null);
            try {
              // If guest bookings exist for same email, claim them into account
              const guestEmail = localStorage.getItem('guestEmail');
              const signedInEmail = session?.user?.email?.toLowerCase();
              if (guestEmail && signedInEmail && guestEmail.toLowerCase() === signedInEmail) {
                await supabase.rpc('claim_guest_bookings', { claim_email: signedInEmail });
                // Invalidate both guest and user booking queries
                queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
                queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
                // Optionally clear the guest email to avoid confusion
                // Keep it if you want to continue showing guest widget when logged out later
                // localStorage.removeItem('guestEmail');
              }
            } catch (e) {
              // Non-fatal; merging is best-effort
            }
            break;
          case 'USER_UPDATED':
            setSession(session);
            setUser(session?.user ?? null);
            break;
          case 'PASSWORD_RECOVERY':
            // Handle password recovery if needed
            break;
          default:
            // Unhandled auth event
        }
        
        setLoading(false);
        
        // Log auth events for debugging
        if (event && session?.user) {
          // Auth event processed
        }
      }
    );

    // Then get initial session
    const getInitialSession = async () => {
      try {
        // Getting initial session
        
        // Check localStorage first
        const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
        // Checking for existing session
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout after 10 seconds')), 10000);
        });
        
        const sessionPromise = (async () => {
          console.log('🔐 AuthProvider: Calling supabase.auth.getSession()...');
          const result = await supabase.auth.getSession();
          console.log('🔐 AuthProvider: getSession() completed');
          return result;
        })();
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!mounted) return;
        
        const { data: { session } } = result;
        
        console.log('🔐 AuthProvider: Initial session result:', {
          hasSession: !!session,
          userId: session?.user?.id ? 'user_id_present' : 'no_user',
          userEmail: session?.user?.email ? 'email_present' : 'no_email',
          emailConfirmed: !!session?.user?.email_confirmed_at,
          sessionExpiresAt: session?.expires_at ? 'expires_at_present' : 'no_expiry',
          currentTime: Math.floor(Date.now() / 1000)
        });
        
        const storedSession = localStorage.getItem(getSupabaseSessionKey());
        console.log('🔐 AuthProvider: Stored session in localStorage:', !!storedSession);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('🔐 Error getting initial session:', error);
        console.error('🔐 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // If it's a timeout error, clear potentially corrupted localStorage data
        if (error.message.includes('timeout')) {
          console.warn('🔐 Session fetch timed out, clearing potentially corrupted localStorage data');
          const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
          supabaseKeys.forEach(key => {
            console.log('🔐 Clearing localStorage key:', key.startsWith('sb-') ? 'supabase_key' : 'other_key');
            localStorage.removeItem(key);
          });
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
