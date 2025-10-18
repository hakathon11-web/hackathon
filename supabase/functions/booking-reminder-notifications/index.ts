import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Creating 1-hour reminder notifications...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
    
    // Format for comparison
    const targetDate = oneHourFromNow.toISOString().split('T')[0];
    const targetTime = oneHourFromNow.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    console.log(`Looking for bookings at ${targetDate} ${targetTime}`);

    // Find confirmed bookings with services that start in exactly 1 hour
    const { data: upcomingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        venues!inner(name),
        booking_services!inner(
          arrival_datetime
        )
      `)
      .eq('status', 'confirmed')
      .eq('booking_date', targetDate)
      .gte('booking_services.arrival_datetime', targetDateTime)
      .lt('booking_services.arrival_datetime', new Date(targetDateTime.getTime() + 60 * 60 * 1000).toISOString());

    if (bookingsError) {
      throw bookingsError;
    }

    console.log(`Found ${upcomingBookings?.length || 0} bookings starting in 1 hour`);

    let notificationsCreated = 0;

    for (const booking of upcomingBookings || []) {
      try {
        // Check if we already sent a 1-hour reminder for this booking
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('type', '1_hour_before')
          .single();

        if (existingNotification) {
          console.log(`1-hour reminder already sent for booking ${booking.id}`);
          continue;
        }

        // Create 1-hour reminder notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: '1_hour_before',
            title: 'Booking Reminder - 1 Hour',
            message: `Your booking at ${booking.venues.name} starts in 1 hour!`,
            read: false,
            scheduled_for: now.toISOString()
          });

        if (notificationError) {
          console.error(`Error creating notification for booking ${booking.id}:`, notificationError);
          continue;
        }

        notificationsCreated++;
        console.log(`1-hour reminder created for booking ${booking.id}`);

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
      }
    }

    const result = {
      success: true,
      message: "1-hour reminder notifications processed",
      totalBookings: upcomingBookings?.length || 0,
      notificationsCreated,
      processedAt: now.toISOString()
    };

    console.log("Processing complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in booking-reminder-notifications:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);