import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Booking timeout scheduler called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get timeout from system settings in database
    console.log('Fetching system settings for timeout...');
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');

    if (settingsError) {
      console.error('Error fetching system settings:', settingsError);
      throw new Error(`Failed to fetch system settings: ${settingsError.message}`);
    }

    // Use timeout from database, fallback to 5 minutes if not available
    const timeoutMinutes = systemSettings?.booking_timeout_minutes || 5;
    console.log(`Scheduler using timeout from system settings: ${timeoutMinutes} minutes`);
    
    // Get the URL for our auto-reject function
    const functionUrl = `${supabaseUrl}/functions/v1/auto-reject-expired-bookings`;
    
    console.log('Calling auto-reject function at:', functionUrl);
    
    // Call the auto-reject function (it will get timeout from database)
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({}), // No need to pass timeout, function gets it from DB
    });

    const result = await response.json();
    
    console.log('Auto-reject function response:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Scheduler executed successfully',
        timeoutMinutes,
        autoRejectResult: result
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in booking timeout scheduler:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred in the scheduler',
        stack: error.stack
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);