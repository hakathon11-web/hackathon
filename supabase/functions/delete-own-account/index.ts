import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  // Apply rate limiting for auth endpoints
  const rateLimitHandler = withRateLimit('auth', corsHeaders, async (req) => {
    // Extract user ID from auth header for rate limiting
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return undefined;
    
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    try {
      const { data: userData } = await supabaseClient.auth.getUser(token);
      return userData.user?.id;
    } catch {
      return undefined;
    }
  });
  
  return rateLimitHandler(req, async (req) => {

  console.log('🔍 Delete account function called')
  console.log('📝 Request method:', req.method)
  console.log('📝 Request headers:', Object.fromEntries(req.headers.entries()))

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

    // Get the confirmation text from the request body
    const body = await req.json()
    console.log('📝 Request body:', body)
    const { confirmationText } = body

    if (!confirmationText) {
      throw new Error('Confirmation text is required')
    }

    // Check if confirmation text matches "Confirm"
    if (confirmationText !== 'Confirm') {
      throw new Error('Invalid confirmation text. Please type "Confirm"')
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    // Verify that the requesting user is authenticated
    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Token received:', token ? 'Yes' : 'No')
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError) {
      console.error('❌ Authentication error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      console.error('❌ No user found in token')
      throw new Error('No user found in token')
    }
    
    console.log('✅ User authenticated:', user.id ? 'user_id_present' : 'no_user')

    // Check if the user exists in profiles
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

    // Prevent admin users from deleting themselves through this function
    if (profile.role === 'admin') {
      throw new Error('Admin users cannot delete their account through this function. Please contact support.')
    }

    // Log the deletion request for audit purposes (GDPR compliance)
    try {
      const { error: auditError } = await supabaseService
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'account_deletion_requested',
          details: {
            timestamp: new Date().toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
          }
        })

      if (auditError) {
        console.warn('Failed to log audit entry:', auditError.message)
        // Don't fail the entire operation if audit logging fails
      }
    } catch (auditError) {
      console.warn('Failed to log audit entry:', auditError.message)
      // Don't fail the entire operation if audit logging fails
    }

    // Delete from auth.users (this will cascade to profiles due to the foreign key constraint)
    const { error: deleteAuthError } = await supabaseService.auth.admin.deleteUser(user.id)

    if (deleteAuthError) {
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`)
    }

    // Log successful deletion
    try {
      const { error: successAuditError } = await supabaseService
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'account_deleted_successfully',
          details: {
            timestamp: new Date().toISOString(),
            deletion_method: 'user_requested',
            compliance: 'gdpr_article_17'
          }
        })

      if (successAuditError) {
        console.warn('Failed to log successful deletion audit entry:', successAuditError.message)
        // Don't fail the entire operation if audit logging fails
      }
    } catch (successAuditError) {
      console.warn('Failed to log successful deletion audit entry:', successAuditError.message)
      // Don't fail the entire operation if audit logging fails
    }

    return new Response(
      JSON.stringify({ 
        message: 'Account deleted successfully',
        userId: user.id,
        deletionTimestamp: new Date().toISOString(),
        compliance: 'GDPR Article 17 - Right to Erasure'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
  });
})
