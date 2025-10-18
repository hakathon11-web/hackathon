// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'
import { getBogAccessToken } from '../_shared/bog.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'PUT, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'PUT, OPTIONS')
  }

  const rateLimitHandler = withRateLimit('payment', corsHeaders, async (req) => {
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
    try {
      // Authenticate caller
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        const secure = createSecureErrorResponse(
          new Error('No authorization header provided'),
          { functionName: 'bog-save-card-subscription' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !userData.user) {
        const secure = createSecureErrorResponse(
          new Error(`Authentication failed: ${userError?.message || 'User not found'}`),
          { functionName: 'bog-save-card-subscription' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      // Parse request
      const { orderId, idempotencyKey } = await req.json();

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      // Get BOG access token
      const accessToken = await getBogAccessToken();

      // Call BOG save card for subscription API
      const res = await fetch(`https://api.bog.ge/payments/v1/orders/${orderId}/subscriptions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`BOG save card subscription failed: ${res.status} ${text}`);
      }

      // BOG returns 202 ACCEPTED with no body for this endpoint
      return new Response(
        JSON.stringify({ success: true, orderId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      const secure = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: 'bog-save-card-subscription' },
        corsHeaders,
        500
      );
      return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
    }
  });
});
