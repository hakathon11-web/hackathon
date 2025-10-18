import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { rateLimitHandler } from "../_shared/rate-limiting.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve((req) => rateLimitHandler(req, async (req) => {
  const origin = req.headers.get('origin');
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
  }

  try {
    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return new Response(JSON.stringify({ error: 'Invalid subscription' }), { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

    // Authenticate via Supabase auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(jwt);
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
    }

    const { error } = await supabase
      .from('web_push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get('user-agent') || null,
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('Failed to upsert subscription', error);
      return new Response(JSON.stringify({ error: 'Failed to save subscription' }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
  } catch (e) {
    console.error('Unexpected error saving web push subscription', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }});
  }
}));


