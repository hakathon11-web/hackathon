/**
 * Secure CORS configuration for Supabase Edge Functions
 * Restricts origins to specific domains instead of allowing all
 */

// CORS configuration - restrict to specific domains only
export const getAllowedOrigins = () => {
  // Always include production domains regardless of environment
  const productionDomains = [
    'https://dajavshne.io',
    'https://www.dajavshne.io',
    'https://staging.dajavshne.io'
  ]
  
  const env = Deno.env.get('DENO_ENV') || 'development'
  
  if (env === 'production') {
    // Production domains + localhost for testing
    return [
      ...productionDomains,
      'http://localhost:8080',
      'http://localhost:3000'
    ]
  }
  
  // Development/local origins + production domains for testing
  return [
    ...productionDomains,
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://localhost:5173', // Vite default port
    'http://127.0.0.1:5173',
    'http://13.49.37.101:8080'
  ]
}

// Flexible domain matcher for apex and subdomains
const isOriginOnPrimaryDomain = (origin: string | null) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.host.toLowerCase();
    return host === 'dajavshne.io' || host.endsWith('.dajavshne.io');
  } catch {
    return false;
  }
}

/**
 * Get secure CORS headers based on request origin
 */
export const getCorsHeaders = (origin: string | null, allowedMethods: string = 'GET, POST, OPTIONS') => {
  const allowedOrigins = getAllowedOrigins()
  const isAllowed = (origin && allowedOrigins.includes(origin)) || isOriginOnPrimaryDomain(origin)
  
  return {
    // Echo validated origin (includes *.dajavshne.io) to avoid CORS null blocking
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : 'https://dajavshne.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Handle CORS preflight requests
 */
export const handleCorsPreflightRequest = (origin: string | null, allowedMethods?: string) => {
  return new Response(null, { 
    headers: getCorsHeaders(origin, allowedMethods) 
  })
}

/**
 * Create a response with CORS headers
 */
export const createCorsResponse = (
  body: string | null, 
  init: ResponseInit & { origin?: string | null } = {}
) => {
  const { origin, ...responseInit } = init
  const corsHeaders = getCorsHeaders(origin)
  
  return new Response(body, {
    ...responseInit,
    headers: {
      ...corsHeaders,
      ...responseInit.headers
    }
  })
}