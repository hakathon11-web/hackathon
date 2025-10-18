// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  // We'll validate dev/mock mode after parsing the request so we can honor a client-side mock flag

  const rateLimitHandler = withRateLimit('payment', corsHeaders, async (req) => {
    // Extract user ID from auth header for rate limiting
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return undefined;
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    try {
      const { data: userData } = await supabaseClient.auth.getUser(token);
      return userData.user?.id;
    } catch {
      return undefined;
    }
  });

  return rateLimitHandler(req, async (req) => {
    try {
      // Authenticate caller (end-user)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        const secure = createSecureErrorResponse(
          new Error('No authorization header provided'),
          { functionName: 'mock-payment-confirm' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !userData.user) {
        const secure = createSecureErrorResponse(
          new Error(`Authentication failed: ${userError?.message || 'User not found'}`),
          { functionName: 'mock-payment-confirm' },
          corsHeaders,
          401
        );
        return new Response(JSON.stringify({ error: secure.error }), { status: secure.status, headers: secure.headers });
      }

      const user = userData.user;

      // Parse request
      const { orderId, mock } = await req.json();

      // Validate frictionless conditions: allow when server is in dev OR client explicitly requested mock
      const isFrictionlessPayments = Deno.env.get('VITE_FRICTIONLESS_PAYMENTS') === 'true' || 
                                     Deno.env.get('FRICTIONLESS_PAYMENTS') === 'true' ||
                                     Deno.env.get('NODE_ENV') === 'development' ||
                                     mock === true;

      if (!isFrictionlessPayments) {
        return new Response(
          JSON.stringify({ error: 'Mock payment confirmation is only available in development mode' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      console.log('🔧 Mock payment confirmation for order:', orderId);
      console.log('🔧 Mock payment confirm called at:', new Date().toISOString());
      console.log('🔧 User ID:', user.id);

      // Initialize Supabase client with service role for database writes
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Get the order context from the database
      const { data: orderContext, error: contextError } = await supabaseClient
        .from('bog_order_context')
        .select('*')
        .eq('bog_order_id', orderId)
        .eq('user_id', user.id)
        .single();

      if (contextError || !orderContext) {
        throw new Error(`Order context not found: ${contextError?.message || 'Order not found'}`);
      }

      // Parse booking data
      const bookingData = JSON.parse(orderContext.booking_data);

      console.log('📋 Order context found:', {
        venueId: orderContext.venue_id,
        amount: orderContext.amount,
        bookingData: orderContext.booking_data
      });

      // Check if booking already exists for this order ID to prevent duplicates
      console.log('🔍 Checking for existing booking with order ID:', orderId)
      const { data: existingBooking, error: checkError } = await supabaseClient
        .from('bookings')
        .select('id, status, created_at')
        .eq('bog_order_id', orderId)
        .maybeSingle()

      console.log('🔍 Existing booking check result:', { existingBooking, checkError })

      if (existingBooking) {
        console.log('✅ Booking already exists for order ID:', orderId, 'booking ID:', existingBooking.id)
        return new Response(
          JSON.stringify({
            success: true,
            bookingId: existingBooking.id,
            message: 'Booking already exists for this order',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Create main booking in database
      const bookingInsert = {
        user_id: user.id,
        venue_id: orderContext.venue_id,
        service_id: null, // We'll store services separately now
        booking_date: orderContext.booking_date,
        total_price: orderContext.amount,
        status: 'pending',
        special_requests: bookingData.specialRequests || null,
        user_email: user.email,
        bog_order_id: orderId,
        payment_status: 'authorized', // Mock payment is always authorized
        payment_method: 'card', // Mock payments are treated as card payments
      };

      console.log('💾 Creating booking:', bookingInsert);

      let booking;
      try {
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .insert(bookingInsert)
          .select()
          .single();

        if (bookingError) {
          console.error('Booking creation error:', bookingError);
          throw new Error(`Failed to create booking: ${bookingError.message}`);
        }

        booking = bookingData;
        console.log('✅ Booking created successfully:', booking.id);
      } catch (bookingCreationError) {
        console.error('Booking creation failed:', bookingCreationError);
        throw bookingCreationError;
      }

      // Create individual service bookings if multiple services
      if (bookingData.serviceBookings && bookingData.serviceBookings.length > 0) {
        console.log('💾 Creating service bookings:', bookingData.serviceBookings?.length || 0, 'services');
        
        // Get service details for pricing calculation
        const serviceIds = bookingData.serviceBookings.map((sb: any) => sb.serviceId);
        console.log('🔍 Service IDs to fetch:', serviceIds);
        
        let services;
        try {
          const { data: servicesData, error: servicesError } = await supabaseClient
            .from('venue_services')
            .select(`
              id,
              venue_id,
              price,
              guest_pricing_rules,
              overall_discount_percent,
              group_discounts,
              timeslot_discounts,
              free_hour_discounts,
              services (
                id,
                name,
                pricing_model
              )
            `)
            .in('id', serviceIds);

          if (servicesError) {
            console.error('Error fetching services:', servicesError);
            throw new Error(`Failed to fetch service details: ${servicesError.message}`);
          }

          services = servicesData;
          console.log('📋 All fetched services:', services);
        } catch (serviceRetrievalError) {
          console.error('Service retrieval failed:', serviceRetrievalError);
          throw serviceRetrievalError;
        }

        const serviceBookingsToInsert = bookingData.serviceBookings.map((serviceBooking: any) => {
          console.log('🔍 Processing serviceBooking:', serviceBooking);
          
          const service = services.find(s => s.id === serviceBooking.serviceId);
          if (!service) {
            throw new Error(`Service not found: ${serviceBooking.serviceId}`);
          }

          // Calculate duration using time components
          const arrivalTimeStr = serviceBooking.arrivalTime;
          const departureTimeStr = serviceBooking.departureTime;
          
          const [arrivalHour, arrivalMinute] = arrivalTimeStr.split(':').map(Number);
          const [departureHour, departureMinute] = departureTimeStr.split(':').map(Number);
          
          const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
          const departureMinutes = departureHour * 60 + departureMinute;
          
          let durationMinutes: number;
          if (departureMinutes >= arrivalMinutes) {
            durationMinutes = departureMinutes - arrivalMinutes;
          } else {
            durationMinutes = (24 * 60) - arrivalMinutes + departureMinutes;
          }
          
          const durationHoursDecimal = durationMinutes / 60;
          
          // Calculate pricing based on service type
          let pricePerHour: number;
          let subtotal: number;
          const numberOfTables = serviceBooking.tableConfigurations?.length || 1;
          
          let guestCount: number;
          const servicePricingModel = service.services?.pricing_model || 'guest_wise';
          
          const isTableWiseService = servicePricingModel === 'per_table' || 
                                   servicePricingModel === 'table_wise' || 
                                   servicePricingModel === 'fixed';
          
          if (isTableWiseService) {
            guestCount = serviceBooking.tableConfigurations?.reduce((sum: number, table: any) => sum + (table.guest_count || 0), 0) || 0;
            pricePerHour = service.price;
            subtotal = service.price * numberOfTables * durationHoursDecimal;
          } else {
            if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
              guestCount = serviceBooking.tableConfigurations.reduce((sum: number, table: any) => sum + (table.guest_count || 0), 0);
            } else {
              const totalServices = bookingData.serviceBookings?.length || 1;
              guestCount = Math.max(1, Math.floor((bookingData.guests || 1) / totalServices));
            }
            
            if (guestCount === 0) {
              guestCount = 1;
            }

            let totalPricePerHour = 0;
            
            if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
              serviceBooking.tableConfigurations.forEach((table: any) => {
                const tableGuestCount = table.guest_count || 1;
                let tablePricePerHour = 0;
                
                if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
                  const applicableRule = service.guest_pricing_rules.find((rule: any) => tableGuestCount <= rule.maxGuests);
                  if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
                    tablePricePerHour = applicableRule.price;
                  } else {
                    tablePricePerHour = 0;
                  }
                } else {
                  const basePrice = service.price || 10;
                  tablePricePerHour = basePrice;
                }
                
                totalPricePerHour += tablePricePerHour;
              });
            } else {
              if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
                const applicableRule = service.guest_pricing_rules.find((rule: any) => guestCount <= rule.maxGuests);
                if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
                  totalPricePerHour = applicableRule.price;
                } else {
                  totalPricePerHour = 0;
                }
              } else {
                const basePrice = service.price || 10;
                totalPricePerHour = basePrice * guestCount;
              }
            }
            
            pricePerHour = totalPricePerHour;
            subtotal = totalPricePerHour * durationHoursDecimal;
          }

          // Calculate datetime fields for proper overnight booking support
          const [year, month, day] = orderContext.booking_date.split('-').map(Number);
          
          const arrivalDateTime = new Date(Date.UTC(year, month - 1, day, arrivalHour - 4, arrivalMinute, 0, 0));
          
          let departureDateTime: Date;
          if (departureMinutes >= arrivalMinutes) {
            departureDateTime = new Date(Date.UTC(year, month - 1, day, departureHour - 4, departureMinute, 0, 0));
          } else {
            departureDateTime = new Date(Date.UTC(year, month - 1, day + 1, departureHour - 4, departureMinute, 0, 0));
          }

          return {
            booking_id: booking.id,
            service_id: serviceBooking.serviceId,
            arrival_datetime: arrivalDateTime.toISOString(),
            departure_datetime: departureDateTime.toISOString(),
            guest_count: guestCount,
            price_per_hour: pricePerHour,
            duration_hours: durationHoursDecimal,
            subtotal: subtotal,
            table_configurations: serviceBooking.tableConfigurations || [],
          };
        });
        
        console.log('💾 All service bookings to insert:', serviceBookingsToInsert);

        try {
          const { error: serviceBookingsError } = await supabaseClient
            .from('booking_services')
            .insert(serviceBookingsToInsert);

          if (serviceBookingsError) {
            console.error('Service bookings creation error:', serviceBookingsError);
            throw new Error(`Failed to create service bookings: ${serviceBookingsError.message}`);
          }

          console.log('✅ Service bookings created successfully');
        } catch (serviceBookingError) {
          console.error('Service booking insertion failed:', serviceBookingError);
          throw serviceBookingError;
        }
      }

      // Create notification for the user
      const notificationData = {
        user_id: user.id,
        booking_id: booking.id,
        type: 'booking_confirmation',
        title: 'Booking Request Submitted',
        message: `Your booking request for ${orderContext.venue_name} on ${orderContext.booking_date} has been submitted and is awaiting partner approval.`,
        read: false,
      };

      try {
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.error('Failed to create notification:', notificationError);
        } else {
          console.log('✅ Notification created successfully');
        }
      } catch (notificationCreationError) {
        console.error('Notification creation failed:', notificationCreationError);
      }

      // Clean up the order context
      try {
        await supabaseClient
          .from('bog_order_context')
          .delete()
          .eq('bog_order_id', orderId);
        console.log('✅ Order context cleaned up');
      } catch (cleanupError) {
        console.error('Failed to cleanup order context:', cleanupError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          bookingId: booking.id,
          message: 'Mock payment confirmed and booking created successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (error) {
      console.error('🔴 MOCK-PAYMENT-CONFIRM ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const secureResponse = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: 'mock-payment-confirm' },
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
});
