import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Stripe removed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }
  
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
    console.log('Create payment intent function started');

    // Deprecated function (Stripe)

    // Initialize Supabase clients
    // - supabaseAuth: for verifying the caller's JWT (anon key)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const secureResponse = createSecureErrorResponse(
        new Error('No authorization header provided'),
        { functionName: 'create-payment-intent' },
        corsHeaders,
        401
      );
      return new Response(
        JSON.stringify({ error: secureResponse.error }),
        { status: secureResponse.status, headers: secureResponse.headers }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      const secureResponse = createSecureErrorResponse(
        new Error(`Authentication failed: ${userError?.message || 'User not found'}`),
        { functionName: 'create-payment-intent' },
        corsHeaders,
        401
      );
      return new Response(
        JSON.stringify({ error: secureResponse.error }),
        { status: secureResponse.status, headers: secureResponse.headers }
      );
    }

    const user = userData.user;
    console.log('User authenticated:', user.id ? 'user_id_present' : 'no_user');

    // Parse request body
    const { amount, currency = 'usd', bookingData, paymentMethodId } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount provided");
    }

    // Validate currency - Stripe doesn't support Georgian Lari (GEL), so we use USD
    const supportedCurrency = currency === 'gel' ? 'usd' : currency;

    console.log('Payment details:', { amount, currency: supportedCurrency, hasBookingData: !!bookingData, hasPaymentMethod: !!paymentMethodId });

    // Stripe removed

    // Find or create Stripe customer
    let customerId: string;
    
    // Check if customer already exists
    // Stripe removed

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      // Create new customer
      customerId = 'deprecated';
      console.log('New customer created:', customerId);
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent with customer
    const paymentIntentParams: any = {};

    // If a payment method is provided, ensure it's properly attached to the customer
    if (paymentMethodId) {
      console.log('Creating payment intent with saved payment method:', paymentMethodId);
      
      try {
        // Retrieve the payment method to check its status
        const paymentMethod = null;
        
        // If the payment method is not attached to our customer, attach it
        if (paymentMethod.customer !== customerId) {
          console.log('Payment method not attached to customer, attaching now...');
          // no-op
          console.log('Payment method attached to customer:', customerId);
        } else {
          console.log('Payment method already attached to customer');
        }
        
        // no-op
      } catch (error) {
        console.error('Error handling payment method:', error);
        // If there's an error with the saved payment method, continue without it
        // This allows the user to enter a new payment method
        console.log('Continuing without saved payment method due to error');
      }
    }

    const paymentIntent = { id: 'deprecated', client_secret: 'deprecated' } as any;

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'create-payment-intent' },
      corsHeaders,
      500
    );
    
    return new Response(
      JSON.stringify({ error: secureResponse.error }),
      {
        status: secureResponse.status,
        headers: secureResponse.headers
      }
    );
  }
  });
});