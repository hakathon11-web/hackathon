import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Manual timeout test function called');
  
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
    
    // Get system settings
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');

    if (settingsError) {
      console.error('Error fetching system settings:', settingsError);
      throw new Error(`Failed to fetch system settings: ${settingsError.message}`);
    }

    const timeoutMinutes = systemSettings?.booking_timeout_minutes || 5;
    console.log(`Using timeout: ${timeoutMinutes} minutes`);
    
    // Calculate cutoff in UTC: now - timeout
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    console.log('Checking for bookings created before (UTC):', cutoffTime);

    // Find expired bookings
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, created_at, status')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      console.error('Error fetching expired bookings:', fetchError);
      throw new Error(`Failed to fetch expired bookings: ${fetchError.message}`);
    }

    console.log(`Found ${expiredBookings?.length || 0} expired bookings`);

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired bookings found',
          processedCount: 0,
          timeoutMinutes
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Update expired bookings
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'expired',
        status_updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .lt('created_at', cutoffTime);

    if (updateError) {
      console.error('Error updating expired bookings:', updateError);
      throw new Error(`Failed to update expired bookings: ${updateError.message}`);
    }

    console.log(`Successfully updated ${expiredBookings.length} expired bookings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully updated ${expiredBookings.length} expired bookings`,
        processedCount: expiredBookings.length,
        timeoutMinutes,
        expiredBookings: expiredBookings.map(b => ({ id: b.id, created_at: b.created_at }))
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
    console.error("Error in manual timeout test:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
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
