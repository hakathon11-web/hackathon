/**
 * Centralized Supabase Configuration
 * 
 * This module provides a single source of truth for all Supabase-related configuration.
 * It eliminates hardcoded references and makes it easy to switch between different
 * Supabase projects or environments.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
}

/**
 * Get Supabase configuration from environment variables
 * This works for both client-side (Vite) and server-side (Deno) environments
 */
export function getSupabaseConfig(): SupabaseConfig {
  // Client-side environment (Vite)
  if (typeof window !== 'undefined') {
    const windowEnv = (window as any).__ENV__;
    const url = windowEnv?.VITE_SUPABASE_URL || '';
    const anonKey = windowEnv?.VITE_SUPABASE_ANON_KEY || '';
    const projectId = extractProjectIdFromUrl(url);
    
    return { url, anonKey, projectId };
  }
  
  // Server-side environment (Deno)
  if (typeof Deno !== 'undefined') {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const projectId = extractProjectIdFromUrl(url);
    
    return { url, anonKey, projectId };
  }
  
  // Fallback for other environments
  return {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    projectId: extractProjectIdFromUrl(process.env.VITE_SUPABASE_URL || '')
  };
}

/**
 * Extract project ID from Supabase URL
 * Example: https://zwddcabpuqbkomwjiymv.supabase.co -> zwddcabpuqbkomwjiymv
 */
function extractProjectIdFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

/**
 * Get session storage key for Supabase auth
 * This replaces hardcoded session keys with dynamic ones based on project ID
 */
export function getSupabaseSessionKey(): string {
  const config = getSupabaseConfig();
  return `sb-${config.projectId}-auth-token`;
}

/**
 * Get function URLs for edge functions
 * This ensures all function calls use the correct project URL
 */
export function getFunctionUrl(functionName: string): string {
  const config = getSupabaseConfig();
  if (!config.url || !config.projectId) {
    throw new Error('Supabase configuration is incomplete');
  }
  return `${config.url}/functions/v1/${functionName}`;
}

/**
 * Validate Supabase configuration
 */
export function validateSupabaseConfig(): { isValid: boolean; errors: string[] } {
  const config = getSupabaseConfig();
  const errors: string[] = [];
  
  if (!config.url) {
    errors.push('Supabase URL is missing');
  } else if (!config.url.includes('supabase.co')) {
    errors.push('Invalid Supabase URL format');
  }
  
  if (!config.anonKey) {
    errors.push('Supabase anonymous key is missing');
  }
  
  if (!config.projectId) {
    errors.push('Could not extract project ID from URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration for logging (sanitized)
 */
export function getSanitizedConfig(): Omit<SupabaseConfig, 'anonKey'> & { anonKey: string } {
  const config = getSupabaseConfig();
  return {
    ...config,
    anonKey: config.anonKey ? `${config.anonKey.substring(0, 20)}...` : ''
  };
}
