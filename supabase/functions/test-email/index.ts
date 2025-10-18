import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test email function started');

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('Resend API key available:', !!resendApiKey);
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const resend = new Resend(resendApiKey);
    
    // Send test email to your Resend account email (only verified email for testing)
    const emailResponse = await resend.emails.send({
      from: "Dajavshne <noreply@noreply.dajavshne.io>",
      to: [Deno.env.get('TEST_EMAIL_TO') || 'admin@dajavshne.io'],
      subject: "Test Email from Supabase Edge Function",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Test Email</h1>
          <p>This is a test email to verify email functionality.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        emailResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'test-email' },
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