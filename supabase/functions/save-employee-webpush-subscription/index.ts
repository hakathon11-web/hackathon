import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { withRateLimit } from "../_shared/rate-limiting.ts";

const corsHeaders = getCorsHeaders('*', 'POST, OPTIONS');

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest('*', 'POST, OPTIONS');
  }

  const rateLimitHandler = withRateLimit('save-employee-webpush-subscription', corsHeaders);
  return rateLimitHandler(req, async (req) => {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    try {
      const { employeeId, subscription } = await req.json();
      if (!employeeId || !subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false }});

      // Basic validation that employee exists and is active
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, is_active')
        .eq('id', employeeId)
        .single();

      if (empError || !employee || employee.is_active !== true) {
        return new Response(JSON.stringify({ error: 'Employee not found or inactive' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      const { error } = await supabase
        .from('employee_web_push_subscriptions')
        .upsert({
          employee_id: employeeId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: req.headers.get('user-agent') || null,
        }, { onConflict: 'employee_id,endpoint' });

      if (error) {
        console.error('Failed to upsert employee subscription', error);
        return new Response(JSON.stringify({ error: 'Failed to save subscription' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (e) {
      console.error('Unexpected error saving employee web push subscription', e);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  });
});


