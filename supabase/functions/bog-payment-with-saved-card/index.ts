// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'
import { getBogAccessToken } from '../_shared/bog.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
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
          { functionName: 'bog-payment-with-saved-card' },
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
          { functionName: 'bog-payment-with-saved-card' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      // Parse request
      const {
        parentOrderId,
        amount,
        bookingData,
        locale = 'ka',
        idempotencyKey
      } = await req.json();

      if (!parentOrderId) {
        throw new Error('Parent order ID is required');
      }
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount provided');
      }

      // Prepare purchase units (similar to bog-create-order)
      const rounded = Math.round(Number(amount) * 100) / 100;
      const basket = Array.isArray(bookingData?.serviceBookings) && bookingData.serviceBookings.length > 0
        ? bookingData.serviceBookings.map((sb: any, i: number) => ({
            quantity: 1,
            unit_price: Number(sb?.finalPrice ?? sb?.originalPrice ?? rounded) || rounded,
            product_id: String(sb?.serviceId ?? `service_${i}`),
            description: bookingData?.venueName ?? 'Service'
          }))
        : [{
            quantity: 1,
            unit_price: rounded,
            product_id: bookingData?.venueId ?? 'booking',
            description: bookingData?.venueName ?? 'Booking'
          }];

      const purchase_units = {
        currency: 'GEL',
        total_amount: rounded,
        basket
      };

      // URLs
      const callbackUrl = Deno.env.get('BOG_CALLBACK_URL');
      if (!callbackUrl) {
        throw new Error('BOG_CALLBACK_URL not configured')
      }

      const payload = {
        callback_url: callbackUrl,
        purchase_units,
      };

      // Get BOG access token
      const accessToken = await getBogAccessToken();

      // Create order with saved card (redirects customer to payment page)
      const res = await fetch(`https://api.bog.ge/payments/v1/ecommerce/orders/${parentOrderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept-Language': locale,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`BOG payment with saved card failed: ${res.status} ${text}`);
      }

      const order = await res.json() as {
        id: string;
        _links: { redirect?: { href: string }, details?: { href: string } }
      };

      // Store booking context for the new order ID (callback will receive this new ID)
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        await supabaseAdmin
          .from('bog_order_context')
          .insert({
            bog_order_id: order.id, // The NEW order ID that callback will receive
            user_id: userData.user.id,
            venue_id: bookingData?.venueId,
            venue_name: bookingData?.venueName,
            booking_date: bookingData?.date,
            arrival_time: bookingData?.time,
            guest_count: bookingData?.guests,
            amount: rounded,
            currency: 'GEL',
            booking_data: JSON.stringify({
              ...bookingData,
              arrivalTime: bookingData?.time,
              departureTime: bookingData?.departureTime,
              serviceIds: bookingData?.serviceIds || [],
              serviceBookings: bookingData?.serviceBookings || [],
              specialRequests: bookingData?.specialRequests,
              totalPrice: rounded,
              discountedTotal: bookingData?.discountedTotal || rounded,
              // Mark this as a saved card payment
              usingSavedCard: true,
              parentOrderId: parentOrderId
            }),
            created_at: new Date().toISOString()
          });
      } catch (contextError) {
        console.error('Failed to store saved card order context:', contextError);
        // Continue anyway - callback can still work with limited data if we fix it
      }

      return new Response(
        JSON.stringify({
          orderId: order.id,
          redirectUrl: order._links?.redirect?.href,
          detailsUrl: order._links?.details?.href,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      const secure = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: 'bog-payment-with-saved-card' },
        corsHeaders,
        500
      );
      return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
    }
  });
});
