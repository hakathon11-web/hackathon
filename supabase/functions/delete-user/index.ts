import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if we have the required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }
    
    // Create a Supabase client with the Auth context of the function (for authentication)
    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey
    )

    // Create a service role client for database operations
    const supabaseService = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    )

    // Get the user ID from the request body
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    // Verify that the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      throw new Error('No user found in token')
    }

    // Check if the user is an admin using the service client
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }
    
    if (!profile) {
      throw new Error('Profile not found')
    }
    
    if (profile.role !== 'admin') {
      throw new Error(`User is not an admin. Role: ${profile.role}`)
    }

    // Prevent admin from deleting themselves
    if (user.id === userId) {
      throw new Error('Cannot delete your own account')
    }

    // Check if the target user exists and is not an admin
    const { data: targetProfile, error: targetError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetError) {
      throw new Error(`Failed to fetch target profile: ${targetError.message}`)
    }
    
    if (!targetProfile) {
      throw new Error('Target user not found')
    }

    if (targetProfile.role === 'admin') {
      throw new Error('Cannot delete admin users')
    }

    // Delete from auth.users (this will cascade to profiles due to the foreign key constraint)
    const { error: deleteAuthError } = await supabaseService.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        message: 'User deleted successfully',
        userId: userId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'delete-user' },
      corsHeaders,
      400
    );
    
    return new Response(
      JSON.stringify({ error: secureResponse.error }),
      {
        status: secureResponse.status,
        headers: secureResponse.headers
      }
    );
  }
})
