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

  const isFrictionlessPayments = Deno.env.get('VITE_FRICTIONLESS_PAYMENTS') === 'true' || 
                                 Deno.env.get('FRICTIONLESS_PAYMENTS') === 'true' ||
                                 Deno.env.get('NODE_ENV') === 'development';

  const rateLimitHandler = withRateLimit('payment-guest', corsHeaders);

  return rateLimitHandler(req, async (req) => {
    try {
      const {
        amount,
        bookingData,
        guestEmail,
        locale = 'ka',
        idempotencyKey,
        mock
      } = await req.json();

      if (!amount || Number(amount) <= 0) {
        throw new Error('Invalid amount provided')
      }
      const email = String(guestEmail || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        const secure = createSecureErrorResponse(
          new Error('Valid guestEmail is required'),
          { functionName: 'bog-create-order-guest' },
          corsHeaders,
          400
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      // Frictionless mode -> create mock order and store context
      if (isFrictionlessPayments || mock === true) {
        const mockOrderId = `mock_order_${crypto.randomUUID()}`;
        const admin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        try {
          await admin.from('bog_order_context').insert({
            bog_order_id: mockOrderId,
            user_id: null,
            guest_email: email,
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
          })
        } catch (e) {
          console.error('Failed to store mock guest order context', e)
        }
        const originSafe = origin ?? Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dajavshne.io';
        return new Response(JSON.stringify({
          orderId: mockOrderId,
          redirectUrl: `${originSafe}/payment/success?mock_payment=true&order_id=${mockOrderId}`,
          detailsUrl: `${originSafe}/payment/details/${mockOrderId}`,
          mockPayment: true
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Real BOG order flow
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

      const purchase_units = { currency: 'GEL', total_amount: rounded, basket };
      const callbackUrl = Deno.env.get('BOG_CALLBACK_URL');
      if (!callbackUrl) throw new Error('BOG_CALLBACK_URL not configured');
      const originSafe = origin ?? Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dajavshne.io';
      const successUrl = Deno.env.get('BOG_SUCCESS_URL') ?? `${originSafe}/payment/success`;
      const failUrl = Deno.env.get('BOG_FAIL_URL') ?? `${originSafe}/payment/failed`;

      const payload = {
        callback_url: callbackUrl,
        external_order_id: crypto.randomUUID(),
        purchase_units,
        redirect_urls: { success: successUrl, fail: failUrl },
        capture: 'manual',
      };

      const accessToken = await getBogAccessToken();
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

      const order = await res.json() as { id: string; _links: { redirect?: { href: string }, details?: { href: string } } };

      // Store order context with guest email
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      try {
        await admin.from('bog_order_context').insert({
          bog_order_id: order.id,
          user_id: null,
          guest_email: email,
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
        })
      } catch (e) {
        console.error('Failed to store guest order context:', e)
      }

      return new Response(JSON.stringify({
        orderId: order.id,
        redirectUrl: order._links?.redirect?.href,
        detailsUrl: order._links?.details?.href,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error) {
      const secure = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: 'bog-create-order-guest' },
        corsHeaders,
        500
      );
      return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
    }
  });
});



