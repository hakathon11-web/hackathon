// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";
import { getBogAccessToken } from '../_shared/bog.ts'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'

const handler = async (req: Request): Promise<Response> => {
  console.log('Booking confirmation function called, method:', req.method);
  
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  // Apply rate limiting for booking endpoints
  const rateLimitHandler = withRateLimit('booking', corsHeaders);
  
  return rateLimitHandler(req, async (req) => {

  try {
    console.log('Processing booking confirmation request...');
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const sendEmail = async (payload: { from: string; to: string[]; subject: string; html: string }) => {
      if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend API failed: ${res.status} ${text}`);
      }
      return await res.json();
    };

    // Parse request body
    const requestBody = await req.text();
    console.log('Request body received:', requestBody);
    
    const { bookingId, action, rejectionMessage, paymentMethod, skipStatusUpdate, skipUserNotification, skipVenueNotification } = JSON.parse(requestBody);
    console.log('Parsed data:', { bookingId, action, rejectionMessage, paymentMethod, skipStatusUpdate, skipUserNotification, skipVenueNotification });

    if (!bookingId || !action) {
      throw new Error('Missing bookingId or action');
    }

    // Validate action is one of the allowed statuses
    const allowedActions = ['confirmed', 'rejected', 'cancelled', 'completed', 'expired'];
    if (!allowedActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Allowed actions: ${allowedActions.join(', ')}`);
    }

    // Get booking details
    console.log('Fetching booking details...');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        venues(name, partner_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      throw new Error(`Failed to fetch booking: ${bookingError.message}`);
    }

    if (!booking) {
      throw new Error('Booking not found');
    }

    console.log('Booking found:', booking);

    // If action impacts payment, process BOG capture/cancel before status update
    try {
      const hasBogOrder = !!booking.bog_order_id;
      if (hasBogOrder && (action === 'confirmed' || action === 'rejected' || action === 'cancelled')) {
        const accessToken = await getBogAccessToken();
        const idempotencyKey = crypto.randomUUID();
        if (action === 'confirmed') {
          // Request capture of pre-authorized amount
          const approveUrl = `https://api.bog.ge/payments/v1/payment/authorization/approve/${encodeURIComponent(booking.bog_order_id)}`;
          const description = `Capture for booking ${bookingId}`;
          const amount = Number(booking.total_price || 0);
          const approveRes = await fetch(approveUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({ amount, description })
          });
          if (!approveRes.ok) {
            const text = await approveRes.text();
            throw new Error(`BOG capture request failed: ${approveRes.status} ${text}`);
          }
          // Mark capture requested, callback will mark captured
          await supabase
            .from('bookings')
            .update({ payment_status: 'capture_requested' })
            .eq('id', bookingId);
        } else if (action === 'rejected' || action === 'cancelled') {
          // Request void of the pre-authorization
          const cancelUrl = `https://api.bog.ge/payments/v1/payment/authorization/cancel/${encodeURIComponent(booking.bog_order_id)}`;
          const description = `Void preauth for booking ${bookingId}${action === 'rejected' && typeof rejectionMessage === 'string' ? `: ${rejectionMessage}` : ''}`;
          const cancelRes = await fetch(cancelUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({ description })
          });
          if (!cancelRes.ok) {
            const text = await cancelRes.text();
            throw new Error(`BOG cancel request failed: ${cancelRes.status} ${text}`);
          }
          await supabase
            .from('bookings')
            .update({ payment_status: 'void_requested' })
            .eq('id', bookingId);
        }
      }
    } catch (paymentSideError) {
      console.error('Payment orchestration failed:', paymentSideError);
      // Do not fail the entire confirmation flow; continue with status updates
    }

    // Update booking status unless explicitly skipped
    if (!skipStatusUpdate) {
      console.log('Updating booking status to:', action);
      const updatePayload: any = { 
        status: action,
        status_updated_at: new Date().toISOString()
      };
      
      // Add rejection message if action is rejected and message is provided
      if (action === 'rejected' && rejectionMessage) {
        updatePayload.rejection_message = rejectionMessage.trim();
        console.log('Adding rejection message:', rejectionMessage);
      }
      
      // Add payment method if action is confirmed and payment method is provided
      if (action === 'confirmed' && paymentMethod) {
        updatePayload.payment_method = paymentMethod;
        console.log('Adding payment method:', paymentMethod);
      }
      
      const { data: updateData, error: updateError } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', bookingId)
        .select('id, status, status_updated_at, rejection_message, payment_method');

      if (updateError) {
        console.error('Error updating booking status:', updateError);
        throw new Error(`Failed to update booking: ${updateError.message}`);
      }

      console.log('Booking status updated successfully:', updateData);

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('bookings')
        .select('id, status, status_updated_at, rejection_message, payment_method')
        .eq('id', bookingId)
        .single();

      if (verifyError) {
        console.error('Error verifying booking update:', verifyError);
      } else {
        console.log('✅ Booking status verification:', verifyData);
      }
    } else {
      console.log('Skipping status update as requested');
    }

    // Create in-app notification for the user (optional)
    if (!skipUserNotification) {
      console.log('Creating notification for user:', booking.user_id);
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          booking_id: bookingId,
          type: 'booking_confirmation',
          title: action === 'confirmed' ? 'Booking Confirmed!' : action === 'rejected' ? 'Booking Rejected' : action === 'cancelled' ? 'Booking Cancelled' : 'Booking Completed',
          message: action === 'confirmed' 
            ? `Your booking for ${booking.venues.name} has been confirmed.`
            : action === 'rejected'
            ? `Your booking for ${booking.venues.name} has been rejected.${rejectionMessage ? ` Reason: ${rejectionMessage}` : ''}`
            : action === 'cancelled'
            ? `Your booking for ${booking.venues.name} has been cancelled.`
            : `Your booking for ${booking.venues.name} has been completed.`,
          read: false
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't throw - this is not critical
      } else {
        console.log('Notification created successfully');
      }
    } else {
      console.log('Skipping user in-app notification as requested');
    }

    // Load venue-specific response recipients (notify venue side about status changes)
    let responseRecipients: string[] = [];
    try {
      const { data: recipients } = await supabase
        .from('venue_notification_recipients')
        .select('email')
        .eq('venue_id', booking.venue_id)
        .eq('process', 'response');
      if (recipients && recipients.length > 0) {
        const set = new Set<string>();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        recipients.forEach(r => {
          const e = String(r.email || '').trim().toLowerCase();
          if (emailRegex.test(e)) set.add(e);
        });
        responseRecipients = Array.from(set);
      }
    } catch (e) {
      console.warn('Failed to load venue response recipients', e);
    }

    // Send email notification to user for all response actions if Resend is available
    if (resend && booking.user_email) {
      console.log('Sending response email notification to:', booking.user_email, 'for action:', action);
      
      let emailSubject: string | null = null;
      let emailHtml: string | null = null;
      
      if (action === 'confirmed') {
        emailSubject = `Booking Confirmed - ${booking.venues.name}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Booking Confirmed!</h1>
            <p>Great news! Your booking has been confirmed.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Booking Details:</h3>
              <p><strong>Venue:</strong> ${booking.venues.name}</p>
              <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}</p>
              <p><strong>Time:</strong> ${booking.booking_services?.[0]?.arrival_datetime ? new Date(booking.booking_services[0].arrival_datetime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Tbilisi', hour12: false }) : 'N/A'}</p>
              <p><strong>Guests:</strong> ${booking.booking_services?.[0]?.guest_count || 'N/A'}</p>
              <p><strong>Total:</strong> $${Number(booking.total_price).toFixed(2)}</p>
            </div>
            
            <p>We look forward to seeing you!</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Venue Booking Team</p>
          </div>
        `;
      } else if (action === 'rejected') {
        emailSubject = `Booking Rejected - ${booking.venues.name}`;
        emailHtml = `
          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
            <h1 style=\"color: #ef4444;\">Booking Rejected</h1>
            <p>We're sorry, but your booking was rejected by the venue.</p>
            ${booking.rejection_message ? `<p><strong>Reason:</strong> ${booking.rejection_message}</p>` : ''}
            <div style=\"background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;\">
              <h3>Booking Details:</h3>
              <p><strong>Venue:</strong> ${booking.venues.name}</p>
              <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}</p>
            </div>
            <p>You can browse other available venues and try booking again.</p>
            <p style=\"color: #6b7280; font-size: 14px;\">Best regards,<br>Venue Booking Team</p>
          </div>
        `;
      } else if (action === 'cancelled') {
        emailSubject = `Booking Cancelled - ${booking.venues.name}`;
        emailHtml = `
          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
            <h1 style=\"color: #ef4444;\">Booking Cancelled</h1>
            <p>Your booking has been cancelled.</p>
            <div style=\"background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;\">
              <h3>Booking Details:</h3>
              <p><strong>Venue:</strong> ${booking.venues.name}</p>
              <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}</p>
            </div>
            <p>If this was a mistake, you can make a new booking anytime.</p>
            <p style=\"color: #6b7280; font-size: 14px;\">Best regards,<br>Venue Booking Team</p>
          </div>
        `;
      } else if (action === 'completed') {
        emailSubject = `Booking Completed - ${booking.venues.name}`;
        emailHtml = `
          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
            <h1 style=\"color: #111827;\">Thank you for visiting!</h1>
            <p>Your booking has been marked as completed. We hope you enjoyed your time.</p>
            <div style=\"background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;\">
              <h3>Booking Details:</h3>
              <p><strong>Venue:</strong> ${booking.venues.name}</p>
              <p><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}</p>
            </div>
            <p>We'd love your feedback. Reply to this email with your thoughts.</p>
            <p style=\"color: #6b7280; font-size: 14px;\">Best regards,<br>Venue Booking Team</p>
          </div>
        `;
      }

      if (emailSubject && emailHtml) {
        try {
          const emailResponse = await sendEmail({
            from: "Dajavshne <noreply@dajavshne.io>",
            to: [booking.user_email],
            subject: emailSubject,
            html: emailHtml,
          });
          console.log("Email sent successfully:", emailResponse);
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Don't throw error - email failure shouldn't break the booking confirmation
        }
      }
    }

    console.log(`Booking ${action} processed successfully`);

    // Send notification to venue response recipients for accepted, rejected, and cancelled (expired handled elsewhere)
    if (!skipVenueNotification && ['confirmed','rejected','cancelled'].includes(action) && responseRecipients.length > 0) {
      console.log('Sending response emails to recipients:', responseRecipients);
      try {
        const subject = `Booking ${action} - ${booking.venues.name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #111827;">Booking ${action}</h1>
            <p>Booking ID: ${booking.id}</p>
            <p>Venue: ${booking.venues.name}</p>
            <p>User: ${booking.user_email}</p>
            ${action === 'rejected' && booking.rejection_message ? `<p><strong>Reason:</strong> ${booking.rejection_message}</p>` : ''}
          </div>
        `;
        await sendEmail({
          from: "Dajavshne <noreply@dajavshne.io>",
          to: responseRecipients,
          subject,
          html,
        });
      } catch (e) {
        console.error('Failed to email venue response recipients', e);
      }
    } else if (skipVenueNotification) {
      console.log('Skipping venue response recipient email as requested');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Booking ${action} successfully`,
        bookingId 
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
    console.error("Error in booking-confirmation function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred processing the booking confirmation',
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
  });
};

serve(handler);