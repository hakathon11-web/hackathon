import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per IP

// CORS configuration - restrict to specific domains only
const getAllowedOrigins = () => {
  const env = Deno.env.get('DENO_ENV') || 'development'
  if (env === 'production') {
    // Add your production domain here
    return ['https://dajavshne.io', 'https://www.dajavshne.io', 'https://staging.dajavshne.io', 'http://localhost:8080', 'http://localhost:3000']
  }
  // Development/local origins
  return ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080']
}

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins()
  const isAllowed = origin && allowedOrigins.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

// Rate limiting function
const checkRateLimit = (clientIP: string): boolean => {
  const now = Date.now()
  const userLimit = rateLimitStore.get(clientIP)
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  userLimit.count++
  rateLimitStore.set(clientIP, userLimit)
  return true
}

// Validate request origin and referrer for additional security
const validateRequest = (req: Request): boolean => {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const userAgent = req.headers.get('user-agent')
  
  // Allow requests from allowed origins
  const allowedOrigins = getAllowedOrigins()
  if (origin && allowedOrigins.includes(origin)) {
    return true
  }
  
  // Allow requests with valid referer from allowed domains
  if (referer) {
    const refererUrl = new URL(referer)
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`
    if (allowedOrigins.includes(refererOrigin)) {
      return true
    }
  }
  
  // Block requests without proper browser headers (likely bots/scripts)
  if (!userAgent || userAgent.length < 10) {
    return false
  }
  
  return false
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
  
  // Get client IP for rate limiting
  const clientIP = req.headers.get('cf-connecting-ip') || 
                   req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown'
  
  // Check rate limit
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        } 
      }
    )
  }
  
  // Validate the request origin and referrer
  if (!validateRequest(req)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden. Invalid request origin.' }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Get the Mapbox token from environment variables
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    
    if (!mapboxToken) {
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ mapboxToken }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error fetching Mapbox token:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})