import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS');
  }

  try {
    console.log('Save payment method function started');

    // Get Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Initialize Supabase client with service role for database writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header (using anon key for auth)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || 'User not found'}`);
    }

    const user = userData.user;
    console.log('User authenticated:', user.id ? 'user_id_present' : 'no_user');

    // Parse request body
    const { paymentMethodId, isDefault } = await req.json();
    
    if (!paymentMethodId) {
      throw new Error("Payment method ID is required");
    }

    console.log('Saving payment method:', paymentMethodId);

    // Initialize Stripe and get payment method details
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.card) {
      throw new Error("Only card payment methods are supported");
    }

    // If this is set as default, remove default from other cards
    if (isDefault) {
      await supabaseClient
        .from('saved_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Save payment method to database
    const paymentMethodData = {
      user_id: user.id,
      stripe_payment_method_id: paymentMethodId,
      card_brand: paymentMethod.card.brand,
      card_last4: paymentMethod.card.last4,
      card_exp_month: paymentMethod.card.exp_month,
      card_exp_year: paymentMethod.card.exp_year,
      is_default: isDefault || false,
    };

    console.log('Creating payment method record for user');

    const { data: savedMethod, error: saveError } = await supabaseClient
      .from('saved_payment_methods')
      .insert(paymentMethodData)
      .select()
      .single();

    if (saveError) {
      console.error('Payment method save error:', saveError);
      throw new Error(`Failed to save payment method: ${saveError.message}`);
    }

    console.log('Payment method saved successfully:', savedMethod.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethod: savedMethod,
        message: 'Payment method saved successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'save-payment-method' },
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