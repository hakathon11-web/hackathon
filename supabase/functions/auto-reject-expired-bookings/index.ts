import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Auto-reject expired bookings function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing auto-reject request...');
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: accept a specific bookingId for targeted processing/testing
    let targetedBookingId: string | null = null;
    try {
      const raw = await req.text();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.bookingId === 'string' && parsed.bookingId.length > 0) {
          targetedBookingId = parsed.bookingId;
          console.log('Targeted bookingId provided:', targetedBookingId);
        }
      }
    } catch (_) {
      // ignore body parse errors; proceed normally
    }
    
    // Get timeout from system settings in database
    console.log('Fetching system settings for timeout...');
    let { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings_v2');
    if (settingsError) {
      console.warn('get_system_settings_v2 failed, falling back to v1:', settingsError?.message || settingsError);
      const fallback = await supabase.rpc('get_system_settings');
      settingsError = fallback.error as any;
      systemSettings = fallback.data as any;
    }

    if (settingsError) {
      console.error('Error fetching system settings:', settingsError);
      throw new Error(`Failed to fetch system settings: ${settingsError.message}`);
    }

    // Use timeout from database, fallback to 5 minutes if not available
    const timeoutMinutes = systemSettings?.booking_timeout_minutes || 5;
    console.log(`Using timeout from system settings: ${timeoutMinutes} minutes`);
    
    // Calculate cutoff in UTC: now - timeout
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    console.log('Checking for bookings created before (UTC):', cutoffTime);

    let expiredBookings: any[] = [];

    if (targetedBookingId) {
      // Load the single booking regardless of age; we will mark expired if pending
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          user_email,
          venue_id,
          status,
          created_at,
          venues(name)
        `)
        .eq('id', targetedBookingId)
        .single();
      if (bErr || !b) {
        throw new Error(`Target booking not found: ${bErr?.message || 'unknown error'}`);
      }
      // If still pending, set to expired immediately
      if (b.status === 'pending') {
        const { error: upErr } = await supabase
          .from('bookings')
          .update({ status: 'expired', status_updated_at: new Date().toISOString() })
          .eq('id', b.id);
        if (upErr) {
          console.error('Failed to force-expire targeted booking:', upErr);
          throw upErr;
        }
        b.status = 'expired';
      }
      expiredBookings = [b];
    } else {
      // Normal batch path: Find all pending bookings older than the timeout period
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          user_email,
          venue_id,
          created_at,
          venues(name)
        `)
        .eq('status', 'pending')
        .lt('created_at', cutoffTime);

      if (fetchError) {
        console.error('Error fetching expired bookings:', fetchError);
        throw new Error(`Failed to fetch expired bookings: ${fetchError.message}`);
      }
      expiredBookings = data || [];

      if (expiredBookings.length > 0) {
        const bookingIds = expiredBookings.map(b => b.id);
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            status: 'expired',
            status_updated_at: new Date().toISOString()
          })
          .in('id', bookingIds);

        if (updateError) {
          console.error('Error updating expired bookings:', updateError);
          throw new Error(`Failed to update expired bookings: ${updateError.message}`);
        }
      }
    }

    console.log(`Processing ${expiredBookings.length} expired bookings for notifications/emails`);

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired bookings found to process',
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

    // Create notifications for users about expired bookings
    try {
      const notifications = expiredBookings.map(booking => ({
        user_id: booking.user_id,
        booking_id: booking.id,
        type: 'booking_expired',
        title: 'Booking Expired',
        message: `Your booking request for ${booking.venues?.name || 'the venue'} has expired and was automatically cancelled.`,
        read: false
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      } else {
        console.log(`Created ${notifications.length} notifications for expired bookings`);
      }
    } catch (e) {
      console.error('Error creating notifications block:', e);
    }

    // Email venue response recipients for each expired booking
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not configured; skipping response recipient emails for expired bookings');
      } else {
        for (const b of expiredBookings || []) {
          try {
            const { data: recipients, error: recipientsError } = await supabase
              .from('venue_notification_recipients')
              .select('email')
              .eq('venue_id', b.venue_id)
              .eq('process', 'response');
            if (recipientsError) {
              console.error('Error fetching response recipients (expired):', recipientsError);
              continue;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const to = Array.from(new Set((recipients || [])
              .map(r => String(r.email || '').trim().toLowerCase())
              .filter(e => emailRegex.test(e))));
            if (to.length === 0) continue;

            const html = `
              <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
                <h1 style=\"color: #111827;\">Booking Expired</h1>
                <p>A booking at <strong>${b.venues?.name || 'the venue'}</strong> expired due to no response within the timeout.</p>
                <div style=\"background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 12px;\">
                  <p style=\"margin: 0 0 6px 0;\">Booking ID: ${b.id}</p>
                  <p style=\"margin: 0;\">Status: expired</p>
                </div>
              </div>
            `;
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Dajavshne <noreply@dajavshne.io>',
                to,
                subject: `Booking Expired - ${b.venues?.name || 'Venue'}`,
                html,
              }),
            });
            if (!res.ok) {
              const txt = await res.text();
              console.error('Failed to email response recipients (expired):', res.status, txt);
            } else {
              console.log('✅ Emailed response recipients for expired booking:', b.id, to.length);
            }
          } catch (e) {
            console.error('Error emailing response recipients for expired booking', b.id, e);
          }
        }
      }
    } catch (e) {
      console.error('Error during emailing response recipients for expired bookings:', e);
    }

    // Also email customers about expiration (use booking.user_email, fallback to profiles.email)
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not configured; skipping customer expiration emails');
      } else {
        const missingUserIds = Array.from(new Set((expiredBookings || [])
          .filter(b => !b.user_email || String(b.user_email).trim() === '')
          .map(b => b.user_id)
          .filter(Boolean)));

        let profileEmailByUserId = new Map<string, string>();
        if (missingUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', missingUserIds as any);
          if (profilesError) {
            console.error('Failed to load profile emails for expired bookings', profilesError);
          } else {
            for (const p of profiles || []) {
              if (p && p.id && p.email) {
                profileEmailByUserId.set(String(p.id), String(p.email));
              }
            }
          }
        }

        for (const b of expiredBookings || []) {
          const toEmail = (b.user_email && String(b.user_email).trim()) || profileEmailByUserId.get(String(b.user_id));
          if (!toEmail) {
            console.warn('Skipping customer expiration email due to missing email for booking', b.id);
            continue;
          }

          const html = `
            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
              <h1 style=\"color: #6b7280;\">Booking Expired</h1>
              <p>Your booking request for <strong>${b.venues?.name || 'the venue'}</strong> expired due to no response in time.</p>
              <div style=\"background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 12px;\">
                <p style=\"margin: 0 0 6px 0;\">Booking ID: ${b.id}</p>
                <p style=\"margin: 0;\">Status: expired</p>
              </div>
            </div>
          `;
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Dajavshne <noreply@dajavshne.io>',
              to: [toEmail],
              subject: `Booking Expired - ${b.venues?.name || 'Venue'}`,
              html,
            }),
          });
          if (!res.ok) {
            const txt = await res.text();
            console.error('Failed to email customer for expired booking:', b.id, res.status, txt);
          } else {
            console.log('✅ Emailed customer for expired booking:', b.id);
          }
        }
      }
    } catch (e) {
      console.error('Error emailing customers about expired bookings:', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${expiredBookings.length} expired bookings`,
        processedCount: expiredBookings.length,
        bookingIds: expiredBookings.map(b => b.id),
        timeoutMinutes,
        targeted: !!targetedBookingId
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
    console.error("Error in auto-reject-expired-bookings function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred processing expired bookings',
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