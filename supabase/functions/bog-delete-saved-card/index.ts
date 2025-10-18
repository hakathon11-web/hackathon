// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'
import { getBogAccessToken } from '../_shared/bog.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'DELETE, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'DELETE, OPTIONS')
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
          { functionName: 'bog-delete-saved-card' },
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
          { functionName: 'bog-delete-saved-card' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      // Parse request
      const { orderId, savedCardId, idempotencyKey } = await req.json();

      if (!orderId && !savedCardId) {
        throw new Error('Either orderId or savedCardId is required');
      }

      const user = userData.user;

      // Get BOG access token
      const accessToken = await getBogAccessToken();

      // Get saved card record to find the bog_order_id if savedCardId provided
      let bogOrderId = orderId;
      if (savedCardId) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data: savedCard, error: cardError } = await supabaseAdmin
          .from('bog_saved_cards')
          .select('bog_order_id')
          .eq('id', savedCardId)
          .eq('user_id', user.id)
          .single();

        if (cardError || !savedCard) {
          throw new Error('Saved card not found or access denied');
        }

        bogOrderId = savedCard.bog_order_id;
      }

      // Call BOG delete saved card API
      const res = await fetch(`https://api.bog.ge/payments/v1/charges/card/${bogOrderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`BOG delete saved card failed: ${res.status} ${text}`);
      }

      // Mark the saved card as inactive in our database
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: updateError } = await supabaseAdmin
        .from('bog_saved_cards')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('bog_order_id', bogOrderId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to mark saved card as inactive:', updateError);
        // Continue anyway - BOG deletion succeeded
      }

      // BOG returns 202 ACCEPTED with no body for this endpoint
      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: bogOrderId, 
          savedCardId: savedCardId || null 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      const secure = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: 'bog-delete-saved-card' },
        corsHeaders,
        500
      );
      return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
    }
  });
});
