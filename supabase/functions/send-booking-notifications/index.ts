import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { withRateLimit } from '../_shared/rate-limiting.ts';

const corsHeaders = getCorsHeaders('*', 'POST, OPTIONS');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest('*', 'POST, OPTIONS');
  }

  // Apply rate limiting
  const rateLimitHandler = withRateLimit('email', corsHeaders);
  
  return rateLimitHandler(req, async (req) => {
    try {
      console.log('📧 Booking notification function called');

      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const resendApiKey = Deno.env.get('RESEND_API_KEY');

      if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
        throw new Error('Missing required environment variables');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const { bookingId } = await req.json();

      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      console.log('📋 Fetching booking details for ID:', bookingId);

      // Fetch booking details with related data
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues!inner(
            name,
            location,
            partner_id,
            profiles!venues_partner_id_fkey(
              email,
              full_name
            )
          ),
          booking_services(
            id,
            arrival_datetime,
            departure_datetime,
            guest_count,
            price_per_hour,
            duration_hours,
            subtotal,
            venue_services(
              services(name)
            )
          )
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

      console.log('✅ Booking found:', {
        id: booking.id,
        venue: booking.venues.name,
        userEmail: booking.user_email,
        partnerEmail: booking.venues.profiles?.email
      });

      // Prepare booking details for email templates
      const bookingDetails = {
        id: booking.id,
        venueName: booking.venues.name,
        venueLocation: booking.venues.location,
        bookingDate: new Date(booking.booking_date).toLocaleDateString('en-GB', { 
          timeZone: 'Asia/Tbilisi',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        totalPrice: booking.total_price,
        userEmail: booking.user_email,
        specialRequests: booking.special_requests,
        partnerEmail: booking.venues.profiles?.email,
        partnerName: booking.venues.profiles?.full_name,
        services: booking.booking_services?.map(service => ({
          name: service.venue_services?.services?.name || 'Gaming Session',
          arrivalTime: service.arrival_datetime ? new Date(service.arrival_datetime).toLocaleTimeString('en-GB', { 
            timeZone: 'Asia/Tbilisi',
            hour12: false 
          }) : 'N/A',
          departureTime: service.departure_datetime ? new Date(service.departure_datetime).toLocaleTimeString('en-GB', { 
            timeZone: 'Asia/Tbilisi',
            hour12: false 
          }) : 'N/A',
          guestCount: service.guest_count,
          duration: service.duration_hours,
          price: service.subtotal
        })) || []
      };

      // Load venue-specific booking recipients
      const { data: venueRecipients, error: recipientsError } = await supabase
        .from('venue_notification_recipients')
        .select('email')
        .eq('venue_id', booking.venue_id)
        .eq('process', 'booking');

      if (recipientsError) {
        console.error('Error fetching venue booking recipients:', recipientsError);
      }

      // Use only venue-configured recipients (no default partner email), de-duplicate, validate
      const recipientSet = new Set<string>();
      const addEmailIfValid = (email?: string | null) => {
        if (!email) return;
        const trimmed = String(email).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(trimmed)) recipientSet.add(trimmed.toLowerCase());
      };

      venueRecipients?.forEach(r => addEmailIfValid(r.email));

      const partnerAndConfiguredRecipients = Array.from(recipientSet);

      // Load system settings to determine whether partner booking-request emails are globally enabled
      let partnerEmailsEnabled = false;
      try {
        const { data: settingsRows, error: settingsError } = await supabase
          .rpc('get_system_settings_v2');
        if (settingsError) {
          console.warn('get_system_settings_v2 failed; defaulting partner emails to disabled', settingsError);
        } else if (Array.isArray(settingsRows) && settingsRows[0]) {
          partnerEmailsEnabled = !!settingsRows[0].partner_booking_request_emails_enabled;
        }
      } catch (e) {
        console.warn('Failed to load system settings for partner email toggle; defaulting disabled', e);
      }

      const emailPromises = [] as Promise<any>[];

      // Send email to user (customer)
      if (bookingDetails.userEmail) {
        console.log('📧 Sending confirmation email to user:', bookingDetails.userEmail);
        
        const userEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎮 Booking Confirmed!</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your gaming session has been requested</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Booking Details</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0;">📍 Venue Information</h3>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Venue:</strong> ${bookingDetails.venueName}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Location:</strong> ${bookingDetails.venueLocation}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
                </div>

                ${bookingDetails.services.length > 0 ? `
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0;">🎯 Services Booked</h3>
                  ${bookingDetails.services.map(service => `
                    <div style="border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${service.name}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${service.arrivalTime} - ${service.departureTime}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Guests:</strong> ${service.guestCount}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Duration:</strong> ${service.duration} hours</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Price:</strong> ${service.price} GEL</p>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #1e40af; margin-top: 0;">💰 Payment Summary</h3>
                  <p style="margin: 5px 0; color: #1e40af; font-size: 18px;"><strong>Total Amount: ${bookingDetails.totalPrice} GEL</strong></p>
                </div>

                ${bookingDetails.specialRequests ? `
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #92400e; margin-top: 0;">📝 Comment</h3>
                  <p style="margin: 0; color: #92400e;">${bookingDetails.specialRequests}</p>
                </div>
                ` : ''}

                <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #065f46; margin-top: 0;">⏳ What's Next?</h3>
                  <p style="margin: 5px 0; color: #065f46;">Your booking request has been submitted and is pending approval from the venue.</p>
                  <p style="margin: 5px 0; color: #065f46;">You will receive another email once the venue confirms your booking.</p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Questions about your booking?<br>
                    Contact the venue directly or reply to this email
                  </p>
                </div>
              </div>
            </div>
            
            <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Thank you for choosing Dajavshne Gaming Hub!<br>
                Get ready for an amazing gaming experience! 🚀
              </p>
            </div>
          </div>
        `;

        emailPromises.push(
          sendEmail({
            from: "Dajavshne <noreply@dajavshne.io>",
            to: [bookingDetails.userEmail],
            subject: `🎮 Booking Request Confirmed - ${bookingDetails.venueName}`,
            html: userEmailHtml,
          }).then(response => {
            console.log('✅ User email sent successfully:', response);
            return { type: 'user', success: true, response };
          }).catch(error => {
            console.error('❌ Failed to send user email:', error);
            return { type: 'user', success: false, error };
          })
        );
      }

      // Send email to partner/configured recipients (venue owner and others) only if enabled in admin settings
      if (partnerEmailsEnabled && partnerAndConfiguredRecipients.length > 0) {
        console.log('📧 Sending notification email to venue recipients:', partnerAndConfiguredRecipients);
        
        const partnerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Booking Request!</h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">A customer has requested a booking at your venue</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Booking Request Details</h2>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                  <h3 style="color: #92400e; margin-top: 0;">⚠️ Action Required</h3>
                  <p style="margin: 5px 0; color: #92400e;">This booking is pending your approval. Please review and confirm or reject the request.</p>
                </div>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0;">📍 Venue Information</h3>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Venue:</strong> ${bookingDetails.venueName}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Location:</strong> ${bookingDetails.venueLocation}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
                </div>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0;">👤 Customer Information</h3>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${bookingDetails.userEmail}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Booking ID:</strong> ${bookingDetails.id}</p>
                </div>

                ${bookingDetails.services.length > 0 ? `
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0;">🎯 Services Requested</h3>
                  ${bookingDetails.services.map(service => `
                    <div style="border-left: 4px solid #f59e0b; padding-left: 15px; margin-bottom: 15px;">
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${service.name}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${service.arrivalTime} - ${service.departureTime}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Guests:</strong> ${service.guestCount}</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Duration:</strong> ${service.duration} hours</p>
                      <p style="margin: 5px 0; color: #4b5563;"><strong>Price:</strong> ${service.price} GEL</p>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #1e40af; margin-top: 0;">💰 Payment Summary</h3>
                  <p style="margin: 5px 0; color: #1e40af; font-size: 18px;"><strong>Total Amount: ${bookingDetails.totalPrice} GEL</strong></p>
                </div>

                ${bookingDetails.specialRequests ? `
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #92400e; margin-top: 0;">📝 Comment</h3>
                  <p style="margin: 0; color: #92400e;">${bookingDetails.specialRequests}</p>
                </div>
                ` : ''}

                <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #065f46; margin-top: 0;">🎯 Next Steps</h3>
                  <p style="margin: 5px 0; color: #065f46;">1. Log into your partner dashboard</p>
                  <p style="margin: 5px 0; color: #065f46;">2. Review the booking details</p>
                  <p style="margin: 5px 0; color: #065f46;">3. Confirm or reject the booking request</p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SITE_URL') || 'https://dajavshne.io'}/partner/dashboard" 
                     style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Go to Partner Dashboard
                  </a>
                </div>
              </div>
            </div>
            
            <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Dajavshne Gaming Hub Partner Portal<br>
                Manage your bookings efficiently! 🚀
              </p>
            </div>
          </div>
        `;

        emailPromises.push(
          sendEmail({
            from: "Dajavshne <noreply@dajavshne.io>",
            to: partnerAndConfiguredRecipients,
            subject: `🔔 New Booking Request - ${bookingDetails.venueName} - ${bookingDetails.totalPrice} GEL`,
            html: partnerEmailHtml,
          }).then(response => {
            console.log('✅ Venue recipients email sent successfully:', response);
            return { type: 'venue_recipients', success: true, response };
          }).catch(error => {
            console.error('❌ Failed to send venue recipients email:', error);
            return { type: 'venue_recipients', success: false, error };
          })
        );
      }

      // Wait for all emails to be sent
      const emailResults = await Promise.all(emailPromises);
      
      const successCount = emailResults.filter(result => result.success).length;
      const failureCount = emailResults.filter(result => !result.success).length;

      console.log(`📊 Email sending completed: ${successCount} successful, ${failureCount} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Booking notification emails sent',
          results: {
            total: emailResults.length,
            successful: successCount,
            failed: failureCount,
            details: emailResults
          }
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
      console.error("❌ Error in send-booking-notifications function:", error);
      
      return new Response(
        JSON.stringify({ 
          error: error.message || 'An error occurred sending booking notifications',
          stack: error.stack
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  });
});
