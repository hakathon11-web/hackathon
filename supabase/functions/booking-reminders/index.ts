import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BOOKING-REMINDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    logStep("Resend initialized");

    // Initialize Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Load system settings for configurable reminder
    const { data: settingsRows, error: settingsError } = await supabaseService
      .rpc('get_system_settings_v2');
    if (settingsError) {
      throw new Error(`Failed to load system settings: ${settingsError.message || JSON.stringify(settingsError)}`);
    }
    const settings = Array.isArray(settingsRows) && settingsRows[0] ? settingsRows[0] : {} as any;
    const reminderHours = Number(settings.pre_arrival_reminder_hours ?? 24);
    const minAdvanceHours = Number(settings.min_advance_booking_hours_for_reminder ?? 6);

    // Compute arrival window for reminders in the next hour
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
    const arrivalStart = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const arrivalEnd = new Date(windowEnd.getTime() + reminderHours * 60 * 60 * 1000);

    logStep("Checking for bookings in pre-arrival window", { reminderHours, minAdvanceHours, arrivalStart: arrivalStart.toISOString(), arrivalEnd: arrivalEnd.toISOString() });

    // Find confirmed bookings where first service arrival is within the window
    const { data: bookings, error: bookingsError } = await supabaseService
      .from('bookings')
      .select(`
        *,
        venues (
          name,
          location
        ),
        booking_services!inner (
          arrival_datetime
        )
      `)
      .eq('status', 'confirmed')
      .gte('booking_services.arrival_datetime', arrivalStart.toISOString())
      .lt('booking_services.arrival_datetime', arrivalEnd.toISOString());

    if (bookingsError) {
      throw new Error(`Failed to query bookings: ${bookingsError.message || JSON.stringify(bookingsError)}`);
    }

    logStep("Found bookings", { count: bookings?.length || 0 });

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No bookings found in pre-arrival window",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Send reminder emails
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const booking of bookings) {
      try {
        const userEmail = booking.user_email;
        const userName = 'Valued Customer';
        const venueName = booking.venues?.name || 'Gaming Venue';
        const venueLocation = booking.venues?.location || 'TBD';
        const serviceName = 'Gaming Session';
        
        if (!userEmail) {
          logStep("Skipping booking - no email", { bookingId: booking.id });
          continue;
        }

        // Enforce minimum advance booking time (Y hours)
        const firstArrivalIso = booking.booking_services?.[0]?.arrival_datetime as string | undefined;
        const firstArrival = firstArrivalIso ? new Date(firstArrivalIso) : new Date(booking.booking_date);
        const createdAt = new Date(booking.created_at);
        const advanceHours = (firstArrival.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (advanceHours < minAdvanceHours) {
          logStep("Skipping booking - not enough advance time for reminder", { bookingId: booking.id, advanceHours, minAdvanceHours });
          continue;
        }

        // Avoid duplicate email reminders
        const { data: existing } = await supabaseService
          .from('notifications')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('type', 'pre_arrival_reminder')
          .single();
        if (existing) {
          logStep("Reminder already sent - skipping", { bookingId: booking.id });
          continue;
        }

        const bookingDate = new Date(firstArrival);
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Tbilisi'
        });

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎮 Gaming Session Reminder</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your booking is tomorrow!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>
              <p style="color: #666; line-height: 1.6;">
                This is a friendly reminder that you have a gaming session booked for <strong>tomorrow</strong>!
              </p>
            </div>

            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">📅 Booking Details</h3>
              
              <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Venue:</strong>
                <div style="color: #333; font-size: 16px;">${venueName}</div>
                <div style="color: #666; font-size: 14px;">📍 ${venueLocation}</div>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Date & Time:</strong>
                <div style="color: #333; font-size: 16px;">${formattedDate}</div>
                <div style="color: #333; font-size: 16px;">⏰ ${booking.booking_services?.[0]?.arrival_datetime ? new Date(booking.booking_services[0].arrival_datetime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Tbilisi', hour12: false }) : 'N/A'}</div>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Service:</strong>
                <div style="color: #333; font-size: 16px;">${serviceName}</div>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Guests:</strong>
                <div style="color: #333; font-size: 16px;">${booking.booking_services?.[0]?.guest_count || 0} guest${(booking.booking_services?.[0]?.guest_count || 0) > 1 ? 's' : ''}</div>
              </div>

              <div style="margin-bottom: 0;">
                <strong style="color: #555;">Total Price:</strong>
                <div style="color: #667eea; font-size: 18px; font-weight: bold;">$${booking.total_price}</div>
              </div>
            </div>

            ${booking.special_requests ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="color: #856404; margin-top: 0;">📝 Comment</h4>
              <p style="color: #856404; margin: 0;">${booking.special_requests}</p>
            </div>
            ` : ''}

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="color: #155724; margin-top: 0;">💡 Preparation Tips</h4>
              <ul style="color: #155724; margin: 0; padding-left: 20px;">
                <li>Arrive 10 minutes early for check-in</li>
                <li>Bring a valid ID for verification</li>
                <li>Contact the venue if you need to make any changes</li>
              </ul>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
              <p style="color: #666; margin: 0;">Questions about your booking?</p>
              <p style="color: #667eea; font-weight: bold; margin: 5px 0 0 0;">Contact the venue directly or reply to this email</p>
            </div>

            <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
              <p style="color: #999; font-size: 14px; margin: 0;">
                Thank you for choosing Dajavshne Gaming Hub!<br>
                Get ready for an amazing gaming experience! 🚀
              </p>
            </div>
          </div>
        `;

        const emailResponse = await resend.emails.send({
          from: "Dajavshne <noreply@noreply.dajavshne.io>",
          to: [userEmail],
          subject: `🎮 Reminder: Your gaming session at ${venueName} is coming up!`,
          html: emailHtml,
        });

        logStep("Email sent successfully", { 
          bookingId: booking.id, 
          email: userEmail,
          emailId: emailResponse.data?.id 
        });
        emailsSent++;

        // Mark reminder in notifications to prevent duplicates
        await supabaseService
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: 'pre_arrival_reminder',
            title: 'Upcoming Booking Reminder',
            message: `Your booking at ${venueName} is coming up soon!`,
            read: false,
            scheduled_for: now.toISOString()
          });

      } catch (emailError: any) {
        logStep("Failed to send email", { 
          bookingId: booking.id, 
          error: emailError.message 
        });
        emailsFailed++;
      }
    }

    const result = {
      message: "Booking reminders processed",
      totalBookings: bookings.length,
      emailsSent,
      emailsFailed,
      processedAt: new Date().toISOString()
    };

    logStep("Processing complete", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = (error && error.message) ? error.message : (error instanceof Error ? error.message : String(error));
    const errorDetails = (() => {
      try { return JSON.stringify(error); } catch { return String(error); }
    })();
    logStep("ERROR in booking-reminders", { message: errorMessage, details: errorDetails });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});