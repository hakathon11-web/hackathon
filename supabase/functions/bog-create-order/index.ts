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

  // Check if frictionless payments are enabled
  const isFrictionlessPayments = Deno.env.get('VITE_FRICTIONLESS_PAYMENTS') === 'true' || 
                                 Deno.env.get('FRICTIONLESS_PAYMENTS') === 'true' ||
                                 Deno.env.get('NODE_ENV') === 'development';

  const rateLimitHandler = withRateLimit('payment', corsHeaders, async (req) => {
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
    try {
      // Authenticate caller (end-user)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        const secure = createSecureErrorResponse(
          new Error('No authorization header provided'),
          { functionName: 'bog-create-order' },
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
          { functionName: 'bog-create-order' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      const user = userData.user;

      // Parse request
      const {
        amount,
        bookingData,
        locale = 'ka',
        theme = 'light',
        idempotencyKey,
        mock
      } = await req.json();

      if (!amount || amount <= 0) {
        throw new Error('Invalid amount provided')
      }

      // Handle frictionless payments in development mode or when client requests mock
      if (isFrictionlessPayments || mock === true) {
        console.log('🔧 Frictionless payment mode enabled - skipping BOG API call');
        
        // Generate a mock order ID
        const mockOrderId = `mock_order_${crypto.randomUUID()}`;
        
        // Store booking context for callback processing (same as real flow)
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        try {
          await supabaseAdmin
            .from('bog_order_context')
            .insert({
              bog_order_id: mockOrderId,
              user_id: user.id,
              venue_id: bookingData?.venueId,
              venue_name: bookingData?.venueName,
              booking_date: bookingData?.date,
              arrival_time: bookingData?.time,
              guest_count: bookingData?.guests,
              amount: Math.round(Number(amount) * 100) / 100,
              currency: 'GEL',
              booking_data: JSON.stringify({
                ...bookingData,
                arrivalTime: bookingData?.time,
                departureTime: bookingData?.departureTime,
                serviceIds: bookingData?.serviceIds || [],
                serviceBookings: bookingData?.serviceBookings || [],
                specialRequests: bookingData?.specialRequests,
                totalPrice: Math.round(Number(amount) * 100) / 100,
                discountedTotal: bookingData?.discountedTotal || Math.round(Number(amount) * 100) / 100
              }),
              created_at: new Date().toISOString()
            });
        } catch (contextError) {
          console.error('Failed to store mock order context:', contextError);
        }

        // Return mock response that simulates successful payment
        const originSafe = origin ?? Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dajavshne.io';
        const mockRedirectUrl = `${originSafe}/payment/success?mock_payment=true&order_id=${mockOrderId}`;
        
        return new Response(
          JSON.stringify({
            orderId: mockOrderId,
            redirectUrl: mockRedirectUrl,
            detailsUrl: `${originSafe}/payment/details/${mockOrderId}`,
            mockPayment: true,
            message: 'Mock payment created successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prepare purchase units
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
      const originSafe = origin ?? Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dajavshne.io';
      const successUrl = Deno.env.get('BOG_SUCCESS_URL') ?? `${originSafe}/payment/success`;
      const failUrl = Deno.env.get('BOG_FAIL_URL') ?? `${originSafe}/payment/failed`;

      const payload = {
        callback_url: callbackUrl,
        external_order_id: crypto.randomUUID(),
        purchase_units,
        redirect_urls: { success: successUrl, fail: failUrl },
        // Enable pre-authorization; we'll capture on booking confirmation
        // According to BOG docs, setting capture to manual will block funds only
        capture: 'manual',
        // Optional fields
        // application_type: 'web',
        // payment_method: ['card'],
      };

      // Get BOG access token
      const accessToken = await getBogAccessToken();

      // Create order at BOG
      const res = await fetch('https://api.bog.ge/payments/v1/ecommerce/orders', {
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
        throw new Error(`BOG order failed: ${res.status} ${text}`);
      }

      const order = await res.json() as {
        id: string;
        _links: { redirect?: { href: string }, details?: { href: string } }
      };

      // Store booking context for callback processing
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        await supabaseAdmin
          .from('bog_order_context')
          .insert({
            bog_order_id: order.id,
            user_id: user.id,
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
              discountedTotal: bookingData?.discountedTotal || rounded
            }),
            created_at: new Date().toISOString()
          });
      } catch (contextError) {
        console.error('Failed to store order context:', contextError);
        // Continue anyway - callback can still work with limited data
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
        { functionName: 'bog-create-order' },
        corsHeaders,
        500
      );
      return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
    }
  });
});


