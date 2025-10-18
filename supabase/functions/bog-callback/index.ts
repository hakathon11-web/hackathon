// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

// BOG callback receiver - creates bookings after successful payment

serve(async (req) => {
  console.log('🔔 BOG callback called - method:', req.method)

  // Simple CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, callback-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Read the request body
    const text = await req.text()
    console.log('🔔 BOG callback body:', text)
    
    let payload
    try {
      payload = JSON.parse(text)
      console.log('🔔 BOG callback parsed payload:', JSON.stringify(payload, null, 2))
      
      // Parse BOG payload structure correctly
      const event = payload?.event
      const orderBody = payload?.body
      const orderId = orderBody?.order_id
      const paymentStatus = orderBody?.order_status?.key // BOG uses order_status.key
      const amount = parseFloat(orderBody?.purchase_units?.transfer_amount || '0') // BOG uses purchase_units.transfer_amount
      const currency = orderBody?.purchase_units?.currency_code || 'GEL' // BOG uses purchase_units.currency_code
      
      console.log('🔔 Extracted values:', { event, orderId, paymentStatus, amount, currency })
      
      // Process the payment if we have an order ID
      if (orderId) {
        await processPaymentCallback(orderId, paymentStatus, amount, currency, orderBody)
      }
      
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError)
    }

    // Always return success to BOG
    return new Response(JSON.stringify({ 
      ok: true, 
      received: true,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ BOG callback error:', error)
    
    // Still return 200 to BOG so they don't retry
    return new Response(JSON.stringify({ 
      ok: true,
      error: 'Processing failed but acknowledged'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
});

async function processPaymentCallback(orderId: string, status: string, amount: number, currency: string, orderBody: any) {
  try {
    console.log('🔔 processPaymentCallback called with:', { orderId, status, amount, currency })
    console.log('🔔 Full orderBody:', JSON.stringify(orderBody, null, 2))
    
    // Skip processing for mock payments - they should only be handled by mock-payment-confirm
    if (orderId && orderId.startsWith('mock_order_')) {
      console.log('🔧 Skipping bog-callback processing for mock payment:', orderId)
      console.log('🔧 This should prevent duplicate booking creation for mock payments')
      return
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔔 Processing payment callback - attempting to find order context')
    
    // Normalize status to handle pre-authorization and capture events
    const normalized = String(status || '').toLowerCase()
    const isAuthorized = ['authorized','preauthorized','pre_authorized','holded','blocked','authorized_success'].some(s => normalized.includes(s) || normalized === s)
    const isCaptured = ['completed','captured','success','succeeded','paid'].some(s => normalized === s)
    const isVoided = ['cancelled','canceled','voided','rejected','failed'].some(s => normalized === s)

    // Find any existing booking by bog_order_id first
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, status, payment_status')
      .eq('bog_order_id', orderId)
      .maybeSingle()

    if (isCaptured && existingBooking) {
      console.log('✅ Capture callback for existing booking:', existingBooking.id)
      await supabase
        .from('bookings')
        .update({ payment_status: 'captured' })
        .eq('id', existingBooking.id)
      return
    }

    if (isVoided && existingBooking) {
      console.log('ℹ️ Void/cancel callback for existing booking:', existingBooking.id)
      await supabase
        .from('bookings')
        .update({ payment_status: 'voided' })
        .eq('id', existingBooking.id)
      return
    }

    // For new orders with authorization success, create the booking in pending state
    if (isAuthorized || isCaptured) {
      console.log('✅ Processing authorization/capture for order:', orderId)
      
      // Get stored booking context
      console.log('🔔 Looking for order context with bog_order_id:', orderId)
      const { data: orderContext, error: contextError } = await supabase
        .from('bog_order_context')
        .select('*')
        .eq('bog_order_id', orderId)
        .single()

      console.log('🔔 Order context query result:', { orderContext, contextError })

      if (contextError || !orderContext) {
        console.error('❌ Failed to get order context:', contextError)
        return
      }

      const bookingData = orderContext.booking_data ? JSON.parse(orderContext.booking_data) : {}
      console.log('🔔 Parsed booking data:', bookingData)
      
      // Determine email for booking record (support guests)
      let userEmail: string | null = null
      if (orderContext.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', orderContext.user_id)
          .single()
        if (userError) {
          console.warn('⚠️ Failed to load profile email, will fallback to guest_email if present:', userError)
        }
        userEmail = userData?.email || orderContext.guest_email || null
      } else {
        userEmail = orderContext.guest_email || null
      }
      console.log('🔔 Resolved booking email:', userEmail)

      // Create main booking record matching confirm-payment structure
      const bookingInsert = {
        user_id: orderContext.user_id || null,
        venue_id: orderContext.venue_id,
        service_id: null, // We'll store services separately
        booking_date: orderContext.booking_date || new Date().toISOString().split('T')[0],
        total_price: orderContext.amount || amount || 0,
        status: 'pending', // partners approve later
        special_requests: bookingData.specialRequests || null,
        user_email: userEmail,
        payment_status: isCaptured ? 'captured' : 'authorized',
        payment_method: 'bog',
        bog_order_id: orderId,
        currency: orderContext.currency || currency || 'GEL'
      }

      console.log('🔔 Creating booking with data:', bookingInsert)

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingInsert)
        .select()
        .single()

      if (bookingError) {
        console.error('❌ Failed to create booking:', bookingError)
        return
      }

      console.log('✅ Booking created successfully:', booking.id)

      // Store saved card information if BOG returned card details and payment was successful
      try {
        console.log('🔔 Checking if card should be saved for future use...')
        
        // Check if this order had save card enabled
        const savedCardType = orderBody?.payment_detail?.saved_card_type; // 'recurrent' or 'subscription' from BOG
        const cardMask = orderBody?.payment_detail?.payer_identifier; // e.g., "548888xxxxxx9893"
        const cardType = orderBody?.payment_detail?.card_type; // 'visa', 'mc', etc.
        const cardExpiry = orderBody?.payment_detail?.card_expiry_date; // e.g., "03/24"
        const parentOrderId = orderBody?.payment_detail?.parent_order_id; // Set when using saved card
        
        console.log('🔔 Payment details:', { savedCardType, cardMask, cardType, cardExpiry, parentOrderId })
        
        // Only save new card info if this isn't a saved card payment and we have card details
        if (savedCardType && cardMask && !parentOrderId) {
          console.log('🔔 Saving NEW card information:', { savedCardType, cardMask, cardType, cardExpiry })
          
          // Parse expiry date
          let expMonth: number | null = null;
          let expYear: number | null = null;
          if (cardExpiry && cardExpiry.includes('/')) {
            const [month, year] = cardExpiry.split('/');
            expMonth = parseInt(month, 10);
            expYear = parseInt(`20${year}`, 10); // Convert "24" to 2024
          }
          
          // Insert saved card record
          const { error: saveCardError } = await supabase
            .from('bog_saved_cards')
            .insert({
              user_id: orderContext.user_id,
              bog_order_id: orderId,
              card_mask: cardMask,
              card_brand: cardType === 'mc' ? 'mastercard' : cardType,
              card_exp_month: expMonth,
              card_exp_year: expYear,
              saved_type: savedCardType,
              is_active: true
            });
            
          if (saveCardError) {
            console.error('❌ Failed to save card information:', saveCardError);
          } else {
            console.log('✅ Card information saved successfully');
          }
        } else if (parentOrderId) {
          console.log('🔔 This is a saved card payment (parent_order_id:', parentOrderId, ') - no need to save card again');
        } else {
          console.log('🔔 No card save information found in payment details');
        }
      } catch (cardSaveError) {
        console.error('❌ Error saving card information:', cardSaveError);
      }

      // Create booking_services records if we have service bookings
      if (bookingData.serviceBookings && Array.isArray(bookingData.serviceBookings) && bookingData.serviceBookings.length > 0) {
        try {
          console.log('🔔 Creating booking services for', bookingData.serviceBookings.length, 'services')
          
          const serviceBookingsToInsert = bookingData.serviceBookings.map((serviceBooking: any, index: number) => {
            console.log(`🔔 Processing service booking ${index + 1}:`, serviceBooking)
            
            // Parse times
            const arrivalTime = serviceBooking.arrivalTime || orderContext.arrival_time || '12:00'
            const departureTime = serviceBooking.departureTime || '14:00'
            
            // Calculate datetime fields for proper overnight booking support
            const [year, month, day] = orderContext.booking_date.split('-').map(Number)
            
            const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number)
            const [departureHour, departureMinute] = departureTime.split(':').map(Number)
            
            // Create arrival datetime in Tbilisi timezone (UTC+4)
            const arrivalDateTime = new Date(Date.UTC(year, month - 1, day, arrivalHour - 4, arrivalMinute, 0, 0))
            
            // Create departure datetime
            let departureDateTime: Date
            const arrivalMinutes = arrivalHour * 60 + arrivalMinute
            const departureMinutes = departureHour * 60 + departureMinute
            
            if (departureMinutes >= arrivalMinutes) {
              // Same day booking
              departureDateTime = new Date(Date.UTC(year, month - 1, day, departureHour - 4, departureMinute, 0, 0))
            } else {
              // Overnight booking - departure is next day
              departureDateTime = new Date(Date.UTC(year, month - 1, day + 1, departureHour - 4, departureMinute, 0, 0))
            }

            const durationMinutes = departureMinutes >= arrivalMinutes 
              ? departureMinutes - arrivalMinutes
              : (24 * 60) - arrivalMinutes + departureMinutes
            const durationHours = durationMinutes / 60

            const serviceRecord = {
              booking_id: booking.id,
              service_id: serviceBooking.serviceId,
              arrival_datetime: arrivalDateTime.toISOString(),
              departure_datetime: departureDateTime.toISOString(),
              guest_count: serviceBooking.numberOfGuests || orderContext.guest_count || 1,
              price_per_hour: serviceBooking.originalPrice || serviceBooking.finalPrice || 0,
              duration_hours: durationHours,
              subtotal: (serviceBooking.originalPrice || serviceBooking.finalPrice || 0) * durationHours,
              discounted_subtotal: serviceBooking.finalPrice ? serviceBooking.finalPrice * durationHours : null,
              table_configurations: serviceBooking.tableConfigurations || []
            }
            
            console.log('🔔 Service booking to insert:', serviceRecord)
            return serviceRecord
          })

          console.log('🔔 All service bookings to insert:', serviceBookingsToInsert)

          const { error: serviceBookingsError } = await supabase
            .from('booking_services')
            .insert(serviceBookingsToInsert)

          if (serviceBookingsError) {
            console.error('❌ Failed to create booking services:', serviceBookingsError)
          } else {
            console.log('✅ Booking services created successfully')
          }
        } catch (serviceError) {
          console.error('❌ Error creating booking services:', serviceError)
        }
      } else {
        console.log('🔔 No service bookings to create')
      }

      // Create notification for the user (only when we have a real user_id)
      if (orderContext.user_id) {
        try {
          console.log('🔔 Creating user notification...')
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: orderContext.user_id,
              booking_id: booking.id,
              type: 'booking_confirmation',
              title: 'Booking Request Submitted',
              message: `Your booking request for ${orderContext.venue_name} on ${orderContext.booking_date} has been submitted and is awaiting partner approval.`,
              read: false,
            })
          
          if (notificationError) {
            console.error('❌ Failed to create notification:', notificationError)
          } else {
            console.log('✅ Notification created successfully')
          }
        } catch (notificationError) {
          console.error('❌ Failed to create notification:', notificationError)
        }
      } else {
        console.log('ℹ️ Skipping in-app notification for guest booking (no user_id)')
      }
      
      // Send confirmation email/notification
      try {
        console.log('🔔 Sending booking notifications...')
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-booking-notifications', {
          body: { bookingId: booking.id }
        })
        
        if (emailError) {
          console.error('❌ Failed to send booking notification:', emailError)
        } else {
          console.log('✅ Email notification sent successfully:', emailResult)
        }
      } catch (notifError) {
        console.error('❌ Failed to send booking notification:', notifError)
      }

      console.log('✅ Payment callback processing completed successfully for booking:', booking.id)
    } else {
      console.log('❌ Payment failed or cancelled for order:', orderId, 'Status:', status)
      
      // Log failed payment attempt
      try {
        await supabase
          .from('payment_logs')
          .insert({
            bog_order_id: orderId,
            status: status,
            amount: amount,
            currency: currency,
            error_details: JSON.stringify(orderBody),
            created_at: new Date().toISOString()
          })
        console.log('✅ Payment failure logged')
      } catch (logError) {
        console.error('❌ Failed to log payment failure:', logError)
      }
    }

  } catch (error) {
    console.error('❌ Error processing payment callback:', error)
  }
}