/**
 * Secure Admin Management Utilities
 * 
 * This module provides secure functions for admin account management.
 * Admin privileges should only be granted through authorized processes.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AdminCreationRequest {
  email: string;
  fullName: string;
  reason: string;
  authorizedBy: string; // Email of the person authorizing this
}

export interface AdminValidationResult {
  isValid: boolean;
  isAdmin: boolean;
  profileId: string | null;
  error?: string;
}

/**
 * Securely validate if a user is an admin
 * This function performs additional security checks beyond basic role validation
 */
export const validateAdminAccess = async (userId: string): Promise<AdminValidationResult> => {
  try {
    // First, check if user exists and is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return {
        isValid: false,
        isAdmin: false,
        profileId: null,
        error: 'User not authenticated or ID mismatch'
      };
    }

    // Check if user has a profile with admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', userId)
      .eq('role', 'admin')
      .single();

    if (profileError || !profile) {
      return {
        isValid: false,
        isAdmin: false,
        profileId: null,
        error: 'No admin profile found'
      };
    }

    // Additional security: Verify email matches
    if (profile.email !== user.email) {
      return {
        isValid: false,
        isAdmin: false,
        profileId: profile.id,
        error: 'Email mismatch between auth and profile'
      };
    }

    return {
      isValid: true,
      isAdmin: true,
      profileId: profile.id
    };

  } catch (error) {
    console.error('Admin validation error:', error);
    return {
      isValid: false,
      isAdmin: false,
      profileId: null,
      error: 'Validation failed due to system error'
    };
  }
};

/**
 * Request admin privileges for a user
 * This should only be called by existing admins or through secure processes
 */
export const requestAdminPrivileges = async (request: AdminCreationRequest): Promise<{ success: boolean; error?: string }> => {
  try {
    // Log the admin creation request for audit purposes
    console.log('🔐 Admin privilege request:', {
      email: request.email,
      authorizedBy: request.authorizedBy,
      reason: request.reason,
      timestamp: new Date().toISOString()
    });

    // For now, this function logs the request
    // In a production system, this would:
    // 1. Send notification to system administrators
    // 2. Require additional approval steps
    // 3. Log to audit system
    // 4. Potentially integrate with external approval systems

    return {
      success: true
    };

  } catch (error) {
    console.error('Admin privilege request error:', error);
    return {
      success: false,
      error: 'Failed to process admin privilege request'
    };
  }
};

/**
 * Check if current user can grant admin privileges
 * Only existing admins should be able to grant admin privileges
 */
export const canGrantAdminPrivileges = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const validation = await validateAdminAccess(user.id);
    return validation.isValid && validation.isAdmin;

  } catch (error) {
    console.error('Error checking admin grant permissions:', error);
    return false;
  }
};

/**
 * Get list of current admin users (for audit purposes)
 * Only accessible by existing admins
 */
export const getAdminUsers = async (): Promise<{ success: boolean; admins?: any[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify current user is admin
    const validation = await validateAdminAccess(user.id);
    if (!validation.isValid || !validation.isAdmin) {
      return { success: false, error: 'Insufficient privileges' };
    }

    // Get admin users
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to fetch admin users' };
    }

    return { success: true, admins };

  } catch (error) {
    console.error('Error fetching admin users:', error);
    return { success: false, error: 'System error' };
  }
};

/**
 * Security constants for admin management
 */
export const ADMIN_SECURITY = {
  // Minimum requirements for admin accounts
  MIN_ADMIN_ACCOUNTS: 1,
  MAX_ADMIN_ACCOUNTS: 10,
  
  // Audit requirements
  AUDIT_LOG_ADMIN_ACTIONS: true,
  REQUIRE_ADMIN_APPROVAL: true,
  
  // Security checks
  VALIDATE_EMAIL_DOMAIN: false, // Set to true if you want to restrict admin emails to specific domains
  ALLOWED_ADMIN_DOMAINS: ['iset.ge'], // Example: only allow admin accounts from specific domains
} as const;
