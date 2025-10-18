import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const origin = req.headers.get('origin')
  
  console.log('Request origin:', origin)
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': (origin === 'https://dajavshne.io' || origin === 'https://staging.dajavshne.io' || origin === 'http://localhost:8080' || origin === 'http://localhost:3000') ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
  
  console.log('CORS headers:', corsHeaders)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  return new Response(
    JSON.stringify({ 
      message: 'CORS test successful',
      origin: origin,
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

