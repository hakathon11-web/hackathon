// Supabase Edge Function: log-audit-metadata
// Adds request IP, user agent, and user email to the latest audit_logs entry
// for a given entity/action. Requires auth (uses caller's JWT) and uses
// service role for DB writes to bypass RLS safely.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with caller JWT to fetch user data
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    // Admin client for DB updates (bypass RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { entity_type, entity_id, action } = await req.json();
    if (!entity_type || !entity_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    const { data: userData } = await supabaseAuth.auth.getUser();
    const userId = userData?.user?.id ?? null;

    let userEmail: string | null = userData?.user?.email ?? null;
    if (userId && !userEmail) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      userEmail = profile?.email ?? null;
    }

    // Find latest audit log entry for this entity/action
    const { data: latest, error: findErr } = await supabaseAdmin
      .from('audit_logs')
      .select('id, metadata')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const metaPatch = {
      ip,
      user_agent,
      user_email: userEmail,
      user_id: userId,
    } as const;

    if (latest?.id) {
      const merged = { ...(latest.metadata || {}), ...metaPatch };
      const { error: updErr } = await supabaseAdmin
        .from('audit_logs')
        .update({ metadata: merged })
        .eq('id', latest.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action,
        entity_type,
        entity_id,
        entity_name: null,
        diff: null,
        metadata: metaPatch,
      });
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});