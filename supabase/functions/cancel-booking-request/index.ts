import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'

const handler = async (req: Request): Promise<Response> => {
  console.log('Cancel booking request function called');
  
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
    console.log('Processing cancel booking request...');
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestBody = await req.text();
    console.log('Request body received:', requestBody);
    
    const { bookingId } = JSON.parse(requestBody);
    console.log('Parsed data:', { bookingId });

    if (!bookingId) {
      throw new Error('Missing bookingId');
    }

    // Get booking details to verify it can be cancelled
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

    // Check if booking can be cancelled (only pending bookings can be cancelled by user)
    if (booking.status !== 'pending') {
      throw new Error(`Cannot cancel booking with status: ${booking.status}. Only pending bookings can be cancelled.`);
    }

    // Update booking status to 'cancelled' for user-initiated cancellations
    console.log('Updating booking status to cancelled...');
    const { data: updateData, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled', // Using 'cancelled' status for user cancellations
        status_updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('id, status, status_updated_at');

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    console.log('Booking status updated successfully:', updateData);

    // Create notification for the partner about the cancelled booking
    console.log('Creating notification for partner:', booking.venues?.partner_id);
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: booking.venues?.partner_id,
        booking_id: bookingId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `A booking request for ${booking.venues?.name || 'your venue'} has been cancelled by the customer.`,
        read: false
      });

    if (notificationError) {
      console.error('Error creating partner notification:', notificationError);
      // Don't throw error here as the main operation succeeded
    }

    // Create notification for the user about their cancellation
    console.log('Creating notification for user:', booking.user_id);
    const { error: userNotificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        booking_id: bookingId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Your booking request for ${booking.venues?.name || 'the venue'} has been cancelled successfully.`,
        read: false
      });

    if (userNotificationError) {
      console.error('Error creating user notification:', userNotificationError);
      // Don't throw error here as the main operation succeeded
    }

    // Invoke booking-confirmation to send emails for the cancellation without duplicate updates/notifications
    try {
      console.log('Invoking booking-confirmation for email sending (cancelled)...');
      const response = await fetch(`${supabaseUrl}/functions/v1/booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId, action: 'cancelled', skipStatusUpdate: true, skipUserNotification: true, skipVenueNotification: false }),
      });
      if (!response.ok) {
        const txt = await response.text();
        console.error('booking-confirmation email send failed:', response.status, txt);
      } else {
        console.log('booking-confirmation email send succeeded');
      }
    } catch (e) {
      console.error('Failed to invoke booking-confirmation for email sending', e);
    }

    console.log('✅ Booking cancellation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Booking cancelled successfully',
        bookingId,
        status: 'cancelled'
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in cancel booking request function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to cancel booking' 
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
  });
};

serve(handler);
