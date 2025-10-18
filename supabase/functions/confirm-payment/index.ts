import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'

// --- Discount calculation types and helpers (server-side mirror of client logic) ---
type DiscountConfig = {
  overallDiscountPercent?: number;
  groupDiscounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
  timeslotDiscounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  freeHourDiscounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
};

type DiscountCalculationResult = {
  finalPricePerHour: number;
  paidHours: number;
};

function calculateDiscountPerHour(
  basePricePerHour: number,
  durationHours: number,
  guestCount: number,
  discountConfig: DiscountConfig,
  bookingStartTime?: string,
  bookingEndTime?: string,
  serviceId?: string,
  isTableWiseService: boolean = false
): DiscountCalculationResult {
  let finalPerHour = basePricePerHour;
  let paidHours = durationHours;

  // 1) Overall percentage discount
  if (discountConfig.overallDiscountPercent && discountConfig.overallDiscountPercent > 0) {
    finalPerHour = finalPerHour * (1 - discountConfig.overallDiscountPercent / 100);
  }

  // 2) Free hour discounts (convert free hours into effective per-hour reduction)
  if (discountConfig.freeHourDiscounts && discountConfig.freeHourDiscounts.length > 0) {
    for (const rule of discountConfig.freeHourDiscounts) {
      const isEligible = !rule.serviceIds || rule.serviceIds.length === 0 || (serviceId && rule.serviceIds.includes(serviceId));
      if (!isEligible) continue;
      if (durationHours >= (rule.thresholdHours + rule.freeHours)) {
        const blockSize = rule.thresholdHours + rule.freeHours;
        const completeBlocks = Math.floor(durationHours / blockSize);
        const remainingHours = durationHours % blockSize;
        const paidFromBlocks = completeBlocks * rule.thresholdHours;
        const charged = paidFromBlocks + remainingHours;
        if (charged < durationHours) {
          paidHours = charged;
          // Distribute free-hour benefit into per-hour price so that per-hour * duration = discounted total
          finalPerHour = finalPerHour * (charged / durationHours);
          break;
        }
      }
    }
  }

  // 3) Group discount (guest-wise only)
  if (!isTableWiseService && discountConfig.groupDiscounts && discountConfig.groupDiscounts.length > 0) {
    let groupPercent = 0;
    for (const rule of discountConfig.groupDiscounts) {
      const applies = !rule.serviceIds || rule.serviceIds.length === 0 || (serviceId && rule.serviceIds.includes(serviceId));
      if (applies && guestCount >= rule.minGuests) {
        groupPercent = Math.max(groupPercent, rule.discountPercent);
      }
    }
    if (groupPercent > 0) {
      finalPerHour = finalPerHour * (1 - groupPercent / 100);
    }
  }

  // 4) Timeslot discount (apply proportionally to overlap hours)
  if (
    discountConfig.timeslotDiscounts &&
    discountConfig.timeslotDiscounts.length > 0 &&
    bookingStartTime &&
    bookingEndTime &&
    durationHours > 0
  ) {
    for (const rule of discountConfig.timeslotDiscounts) {
      const applies = !rule.serviceIds || rule.serviceIds.length === 0 || (serviceId && rule.serviceIds.includes(serviceId));
      if (!applies) continue;

      const overlapStart = bookingStartTime >= rule.start ? bookingStartTime : rule.start;
      const overlapEnd = bookingEndTime <= rule.end ? bookingEndTime : rule.end;
      if (overlapStart < overlapEnd) {
        const [sH, sM] = overlapStart.split(':').map(Number);
        const [eH, eM] = overlapEnd.split(':').map(Number);
        const overlap = (eH + eM / 60) - (sH + sM / 60);
        if (overlap > 0) {
          const proportionalDiscount = (overlap / durationHours) * (rule.discountPercent / 100);
          finalPerHour = finalPerHour * (1 - proportionalDiscount);
          break; // apply first matching
        }
      }
    }
  }

  return { finalPricePerHour: Math.round(finalPerHour * 100) / 100, paidHours };
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  // Apply rate limiting for payment endpoints (skip for OPTIONS requests)
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
    console.log('Confirm payment function started');

    // Get Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Initialize Supabase client with service role for database writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header (using anon key for auth)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || 'User not found'}`);
    }

    const user = userData.user;
    console.log('User authenticated:', user.id ? 'user_id_present' : 'no_user');

    // Parse request body
    const { paymentIntentId, bookingData } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    if (!bookingData) {
      throw new Error("Booking data is required");
    }

    // Validate required booking data fields
    if (!bookingData.venueId) {
      throw new Error("Venue ID is required");
    }

    if (!bookingData.date) {
      throw new Error("Booking date is required");
    }

    if (!bookingData.total || bookingData.total <= 0) {
      throw new Error("Valid total amount is required");
    }

    console.log('Validated booking data:', {
      venueId: bookingData.venueId,
      date: bookingData.date,
      total: bookingData.total,
      guests: bookingData.guests,
      guestsType: typeof bookingData.guests,
      hasServiceBookings: !!bookingData.serviceBookings,
      serviceBookingsCount: bookingData.serviceBookings?.length || 0,
      serviceBookings: bookingData.serviceBookings?.map((sb: any) => ({
        serviceId: sb.serviceId,
        arrivalTime: sb.arrivalTime,
        departureTime: sb.departureTime,
        hasTableConfigurations: !!sb.tableConfigurations,
        tableConfigurationsCount: sb.tableConfigurations?.length || 0
      }))
    });

    console.log('Confirming payment for:', paymentIntentId);

    // Initialize Stripe and verify payment
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log('Payment intent retrieved:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      throw new Error(`Failed to retrieve payment intent: ${stripeError.message}`);
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
    }

    console.log('Payment verified successfully');



    // Create main booking in database
    const bookingInsert = {
      user_id: user.id,
      venue_id: bookingData.venueId,
      service_id: null, // We'll store services separately now
      booking_date: bookingData.date,
      total_price: bookingData.total,
      status: 'pending',
      special_requests: bookingData.specialRequests || null,
      user_email: user.email,
    };
    // After creating pending booking(s), notify partner via Web Push
    try {
      // Find the venue partner
      const { data: venueData } = await supabase
        .from('venues')
        .select('id, name, partner_id')
        .eq('id', bookingData.venueId)
        .single();

      // Partner web push notifications removed per requirement. Keeping email and employee pushes.

      // Notify venue employees via employee_web_push_subscriptions
      try {
        const { data: empSubs } = await supabase
          .from('employee_web_push_subscriptions')
          .select('endpoint, p256dh, auth, employees:employee_id ( venue_id )')
          .eq('employees.venue_id', bookingData.venueId);

        if (empSubs && empSubs.length > 0) {
          const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
          const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
          const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dajavshne.io';

          if (vapidPublicKey && vapidPrivateKey) {
            const webpush = await import('https://esm.sh/web-push@3.6.6');
            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

            const payloadEmp = JSON.stringify({
              title: '🚨 New Booking Request',
              body: `New booking request for ${venueData?.name || 'your venue'}. Open to review.`,
              data: { url: '/employee/dashboard' },
              tag: 'employee-booking-request'
            });

            await Promise.allSettled(
              empSubs.map((s: any) =>
                webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  payloadEmp
                )
              )
            );
          }
        }
      } catch (empPushErr) {
        console.warn('Employee web push failed or skipped', empPushErr);
      }
    } catch (pushError) {
      console.error('Failed to send partner web push notification', pushError);
    }

    console.log('Creating booking:', bookingInsert);

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
      console.log('Booking created successfully:', booking.id);
    } catch (bookingCreationError) {
      console.error('Booking creation failed:', bookingCreationError);
      throw bookingCreationError;
    }

    // Get partner email for notification
    let venue;
    let partnerProfile = null;
    
    try {
      const { data: venueData, error: venueError } = await supabaseClient
        .from('venues')
        .select(`
          name,
          partner_id
        `)
        .eq('id', bookingData.venueId)
        .single();

      if (venueError) {
        console.error('Error fetching venue:', venueError);
        throw new Error(`Failed to fetch venue: ${venueError.message}`);
      }

      venue = venueData;
      console.log('Venue data retrieved:', venue);

      // Get partner profile separately
      if (venue?.partner_id) {
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', venue.partner_id)
          .single();
        
        if (profileError) {
          console.error('Error fetching partner profile:', profileError);
          // Don't throw error, just log it
        } else {
          partnerProfile = profile;
          console.log('Partner profile retrieved:', partnerProfile);
        }
      }

      console.log('Venue and partner data retrieved successfully');
    } catch (venueRetrievalError) {
      console.error('Venue retrieval failed:', venueRetrievalError);
      throw venueRetrievalError;
    }

    // Create individual service bookings if multiple services
    if (bookingData.serviceBookings && bookingData.serviceBookings.length > 0) {
      console.log('Creating service bookings:', bookingData.serviceBookings?.length || 0, 'services');
      
      // Get service details for pricing calculation - include all necessary fields (incl. discount columns)
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
        console.log('📋 All booking service data:', bookingData.serviceBookings?.length || 0, 'services');
      } catch (serviceRetrievalError) {
        console.error('Service retrieval failed:', serviceRetrievalError);
        throw serviceRetrievalError;
      }
      
      // Fetch venue-level discount configuration once
      let venueDiscounts: any = null;
      try {
        const { data: venueDiscountData } = await supabaseClient
          .from('venues')
          .select('overall_discount_percent, overall_discount_service_ids, free_hour_discounts, group_discounts, timeslot_discounts')
          .eq('id', bookingData.venueId)
          .single();
        venueDiscounts = venueDiscountData;
      } catch (_) {
        venueDiscounts = null;
      }

      const serviceBookingsToInsert = bookingData.serviceBookings.map((serviceBooking: any) => {
        console.log('🔍 Processing serviceBooking:', serviceBooking);
        
        const service = services.find(s => s.id === serviceBooking.serviceId);
        if (!service) {
          throw new Error(`Service not found: ${serviceBooking.serviceId}`);
        }

        console.log('🔍 Found service:', service);

        // Calculate duration using time components to avoid timezone issues
        const arrivalTimeStr = serviceBooking.arrivalTime;
        const departureTimeStr = serviceBooking.departureTime;
        
        // Parse time components
        const [arrivalHour, arrivalMinute] = arrivalTimeStr.split(':').map(Number);
        const [departureHour, departureMinute] = departureTimeStr.split(':').map(Number);
        
        // Convert to minutes since midnight
        const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
        const departureMinutes = departureHour * 60 + departureMinute;
        
        // Calculate duration in minutes
        let durationMinutes: number;
        if (departureMinutes >= arrivalMinutes) {
          // Same day booking
          durationMinutes = departureMinutes - arrivalMinutes;
        } else {
          // Overnight booking (departure is next day)
          durationMinutes = (24 * 60) - arrivalMinutes + departureMinutes;
        }
        
        const durationHoursDecimal = durationMinutes / 60;
        
        // Calculate actual departure time (should be the same as what we received)
        const actualDepartureTime = departureTimeStr;
        
        console.log('🕐 Duration calculation:', {
          arrivalTime: serviceBooking.arrivalTime,
          departureTime: serviceBooking.departureTime,
          actualDepartureTime,
          durationHoursDecimal
        });

        // Calculate pricing based on service type (base, before discounts)
        let pricePerHour: number;
        let subtotal: number;
        const numberOfTables = serviceBooking.tableConfigurations?.length || 1;
        
        // Calculate guest count based on service type
        let guestCount: number;
        const servicePricingModel = service.services?.pricing_model || 'guest_wise'; // Default to guest_wise if not found
        
        console.log('🔍 Table configurations:', serviceBooking.tableConfigurations);
        console.log('🔍 bookingData.guests:', bookingData.guests || 0, 'guests');
        console.log('🔍 Service pricing model:', servicePricingModel);
        console.log('🔍 Service data:', service);
        
        // More robust pricing model detection
        const isTableWiseService = servicePricingModel === 'per_table' || 
                                 servicePricingModel === 'table_wise' || 
                                 servicePricingModel === 'fixed';
        
        if (isTableWiseService) {
          // For table-wise pricing, guest count doesn't affect pricing, but store it for display
          guestCount = serviceBooking.tableConfigurations?.reduce((sum: number, table: any) => sum + (table.guest_count || 0), 0) || 0;
          console.log('🔍 Table-wise guest count:', guestCount);
        } else {
          // For guest-wise pricing, we need accurate guest count
          if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
            // Use guest count from table configurations
            guestCount = serviceBooking.tableConfigurations.reduce((sum: number, table: any) => sum + (table.guest_count || 0), 0);
            console.log('🔍 Guest count from table configurations:', guestCount);
          } else {
            // Fallback: if no table configurations, use a reasonable default based on bookingData.guests
            // For single service bookings, use the full guest count; for multi-service, distribute evenly
            const totalServices = bookingData.serviceBookings?.length || 1;
            guestCount = Math.max(1, Math.floor((bookingData.guests || 1) / totalServices));
            console.log('🔍 Guest count from fallback calculation:', guestCount);
          }
          
          // Ensure guest count is at least 1 for guest-wise pricing
          if (guestCount === 0) {
            console.warn(`Guest count is 0 for guest-wise service ${service.services?.name || 'Unknown'}, using default of 1`);
            guestCount = 1;
          }
        }

        console.log(`💰 Pricing calculation for service ${service.services?.name || 'Unknown'}:`, {
          pricingModel: servicePricingModel,
          isTableWiseService,
          guestCount,
          numberOfTables,
          durationHoursDecimal,
          servicePrice: service.price,
          hasGuestPricingRules: !!(service.guest_pricing_rules && service.guest_pricing_rules.length > 0)
        });

        if (isTableWiseService) {
          // Per table pricing: price = service_price * tables * hours (ignore guest count)
          pricePerHour = service.price;
          subtotal = service.price * numberOfTables * durationHoursDecimal;
          console.log(`💰 Table-wise pricing: ${service.price} * ${numberOfTables} * ${durationHoursDecimal} = ${subtotal}`);
        } else {
          // Guest-wise pricing: calculate price for each table based on its guest count, then sum
          let totalPricePerHour = 0;
          
          if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
            // Calculate price for each table individually
            serviceBooking.tableConfigurations.forEach((table: any, index: number) => {
              const tableGuestCount = table.guest_count || 1;
              let tablePricePerHour = 0;
              
              if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
                // Find applicable rule for this table's guest count
                const applicableRule = service.guest_pricing_rules.find((rule: any) => tableGuestCount <= rule.maxGuests);
                console.log(`🔍 Table ${table.table_number} (${tableGuestCount} guests) - Applicable rule:`, applicableRule);
                
                if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
                  tablePricePerHour = applicableRule.price;
                  console.log(`💰 Table ${table.table_number}: ${tableGuestCount} guests = ${tablePricePerHour} GEL`);
                } else {
                  console.log(`❌ No rule found for table ${table.table_number} with ${tableGuestCount} guests`);
                  tablePricePerHour = 0; // No valid pricing rule found for this guest count
                }
              } else {
                // Fallback if no guest pricing rules defined
                const basePrice = service.price || 10;
                tablePricePerHour = basePrice;
                console.log(`💰 Table ${table.table_number}: Using base price ${tablePricePerHour} GEL`);
              }
              
              totalPricePerHour += tablePricePerHour;
            });
          } else {
            // No table configurations, use single table with total guest count
            console.log(`⚠️ No table configurations found, using single table with ${guestCount} guests`);
            if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
              const applicableRule = service.guest_pricing_rules.find((rule: any) => guestCount <= rule.maxGuests);
              if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
                totalPricePerHour = applicableRule.price;
                console.log(`💰 Single table: ${guestCount} guests = ${totalPricePerHour} GEL`);
              } else {
                console.log(`❌ No rule found for ${guestCount} guests`);
                totalPricePerHour = 0;
              }
            } else {
              const basePrice = service.price || 10;
              totalPricePerHour = basePrice * guestCount;
              console.log(`💰 Single table: Using base price ${basePrice} * ${guestCount} = ${totalPricePerHour} GEL`);
            }
          }
          
          pricePerHour = totalPricePerHour;
          subtotal = totalPricePerHour * durationHoursDecimal;
          console.log(`💰 Guest-wise total per hour: ${totalPricePerHour} GEL`);
          console.log(`💰 Guest-wise final: ${totalPricePerHour} * ${durationHoursDecimal} = ${subtotal} GEL`);
        }

        // Keep originals before discounts
        const originalPricePerHour = pricePerHour;
        const originalSubtotal = Math.round((((isTableWiseService ? (originalPricePerHour * numberOfTables) : originalPricePerHour) * durationHoursDecimal)) * 100) / 100;

        // ----- Apply discounts (service-level and venue-level) -----
        try {
          const svcOverall = service.overall_discount_percent || 0;
          const svcGroup = Array.isArray(service.group_discounts) ? service.group_discounts : [];
          const svcTimeslot = Array.isArray(service.timeslot_discounts) ? service.timeslot_discounts : [];
          const svcFree = Array.isArray(service.free_hour_discounts) ? service.free_hour_discounts : [];

          const discountConfig: DiscountConfig = {
            overallDiscountPercent: Number(svcOverall) || 0,
            groupDiscounts: [...svcGroup],
            timeslotDiscounts: [...svcTimeslot],
            freeHourDiscounts: [...svcFree],
          };

          // Merge venue-level discounts if applicable to this service
          if (venueDiscounts) {
            const serviceIdStr = String(serviceBooking.serviceId);
            const appliesOverall = !venueDiscounts.overall_discount_service_ids ||
              venueDiscounts.overall_discount_service_ids.length === 0 ||
              venueDiscounts.overall_discount_service_ids.includes(serviceIdStr);

            if (appliesOverall && venueDiscounts.overall_discount_percent && Number(venueDiscounts.overall_discount_percent) > 0) {
              const venuePercent = Number(venueDiscounts.overall_discount_percent);
              if (venuePercent > (discountConfig.overallDiscountPercent || 0)) {
                discountConfig.overallDiscountPercent = venuePercent;
              }
            }

            if (Array.isArray(venueDiscounts.group_discounts)) {
              const applicable = venueDiscounts.group_discounts.filter((d: any) => !d.serviceIds || d.serviceIds.length === 0 || d.serviceIds.includes(serviceIdStr));
              discountConfig.groupDiscounts = [...(discountConfig.groupDiscounts || []), ...applicable];
            }

            if (Array.isArray(venueDiscounts.timeslot_discounts)) {
              const applicable = venueDiscounts.timeslot_discounts.filter((d: any) => !d.serviceIds || d.serviceIds.length === 0 || d.serviceIds.includes(serviceIdStr));
              discountConfig.timeslotDiscounts = [...(discountConfig.timeslotDiscounts || []), ...applicable];
            }

            if (Array.isArray(venueDiscounts.free_hour_discounts)) {
              const applicable = venueDiscounts.free_hour_discounts.filter((d: any) => !d.serviceIds || d.serviceIds.length === 0 || d.serviceIds.includes(serviceIdStr));
              discountConfig.freeHourDiscounts = [...(discountConfig.freeHourDiscounts || []), ...applicable];
            }
          }

          const { finalPricePerHour, paidHours } = calculateDiscountPerHour(
            pricePerHour,
            durationHoursDecimal,
            guestCount,
            discountConfig,
            arrivalTimeStr,
            departureTimeStr,
            String(serviceBooking.serviceId),
            isTableWiseService
          );

          // Only store discounted total in a separate column; keep originals in existing fields
          const discountedSubtotal = Math.round((((isTableWiseService ? (finalPricePerHour * numberOfTables) : finalPricePerHour) * durationHoursDecimal)) * 100) / 100;

          // Calculate datetime fields for proper overnight booking support in Tbilisi timezone
          const [year, month, day] = bookingData.date.split('-').map(Number);
          
          // Create arrival datetime in Tbilisi timezone (UTC+4)
          const arrivalDateTime = new Date(Date.UTC(year, month - 1, day, arrivalHour - 4, arrivalMinute, 0, 0));
          
          // Create departure datetime in Tbilisi timezone
          let departureDateTime: Date;
          if (departureMinutes >= arrivalMinutes) {
            // Same day booking
            departureDateTime = new Date(Date.UTC(year, month - 1, day, departureHour - 4, departureMinute, 0, 0));
          } else {
            // Overnight booking - departure is next day
            departureDateTime = new Date(Date.UTC(year, month - 1, day + 1, departureHour - 4, departureMinute, 0, 0));
          }

          const finalResult = {
            // booking_id set later after booking insert
            service_id: serviceBooking.serviceId,
            arrival_datetime: arrivalDateTime.toISOString(),
            departure_datetime: departureDateTime.toISOString(),
            guest_count: guestCount,
            price_per_hour: originalPricePerHour,
            duration_hours: durationHoursDecimal,
            subtotal: originalSubtotal,
            discounted_subtotal: discountedSubtotal,
            table_configurations: serviceBooking.tableConfigurations || [],
          } as any;

          console.log('💾 Final service booking to insert (with discounts):', finalResult);
          return finalResult;
        } catch (discountError) {
          console.warn('Discount application failed or skipped:', discountError);
          // Fallback to original values without discount columns
          const [year, month, day] = bookingData.date.split('-').map(Number);
          const arrivalDateTime = new Date(Date.UTC(year, month - 1, day, arrivalHour - 4, arrivalMinute, 0, 0));
          let departureDateTime: Date;
          if (departureMinutes >= arrivalMinutes) {
            departureDateTime = new Date(Date.UTC(year, month - 1, day, departureHour - 4, departureMinute, 0, 0));
          } else {
            departureDateTime = new Date(Date.UTC(year, month - 1, day + 1, departureHour - 4, departureMinute, 0, 0));
          }
          const fallback = {
            service_id: serviceBooking.serviceId,
            arrival_datetime: arrivalDateTime.toISOString(),
            departure_datetime: departureDateTime.toISOString(),
            guest_count: guestCount,
            price_per_hour: pricePerHour,
            duration_hours: durationHoursDecimal,
            subtotal: subtotal,
            table_configurations: serviceBooking.tableConfigurations || [],
          } as any;
          console.log('💾 Final service booking to insert (fallback):', fallback);
          return fallback;
        }
      });
      
      console.log('💾 All service bookings to insert:', serviceBookingsToInsert);

      try {
        // Now that we have booking ID, backfill it on rows
        const rowsWithBookingId = serviceBookingsToInsert.map((row: any) => ({ ...row, booking_id: booking.id }));

        const { error: serviceBookingsError } = await supabaseClient
          .from('booking_services')
          .insert(rowsWithBookingId);

        if (serviceBookingsError) {
          console.error('Service bookings creation error:', serviceBookingsError);
          throw new Error(`Failed to create service bookings: ${serviceBookingsError.message}`);
        }

        console.log('Service bookings created successfully');

        // No bookings-level aggregate fields; requirement is only per-service discounted total
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
      message: `Your booking request for ${bookingData.venueName} on ${bookingData.date} has been submitted and is awaiting partner approval.`,
      read: false,
    };

    try {
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't throw error, booking was successful
      } else {
        console.log('Notification created successfully');
      }
    } catch (notificationCreationError) {
      console.error('Notification creation failed:', notificationCreationError);
      // Don't throw error, booking was successful
    }

    // Partner owner email intentionally disabled; rely on configured venue recipients instead
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('Skipping direct partner owner email; will notify configured venue recipients only');

    // Notify admin-configured booking recipients directly (owner email skipped above)
    try {
      const { data: recipientRows, error: recipientsError } = await supabaseClient
        .from('venue_notification_recipients')
        .select('email')
        .eq('venue_id', bookingData.venueId)
        .eq('process', 'booking');
      if (recipientsError) {
        console.error('Error loading venue booking recipients:', recipientsError);
      } else {
        const set = new Set<string>();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        (recipientRows || []).forEach(r => {
          const e = String(r.email || '').trim().toLowerCase();
          if (emailRegex.test(e)) set.add(e);
        });
        // Ensure we don't re-send to partner email; partner already notified above
        if (partnerProfile?.email) set.delete(String(partnerProfile.email).trim().toLowerCase());
        const configRecipients = Array.from(set);
        if (resendApiKey && configRecipients.length > 0) {
          const resend = new Resend(resendApiKey);
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">🔔 New Booking Request!</h1>
              <p>You have received a new booking request for <strong>${venue.name}</strong>.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Booking Details:</h3>
                <p><strong>Customer:</strong> ${user.email}</p>
                <p><strong>Date:</strong> ${new Date(bookingData.date).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}</p>
                <p><strong>Total:</strong> ${Number(bookingData.total).toFixed(2)} GEL</p>
              </div>
            </div>
          `;
          try {
            const resp = await resend.emails.send({
              from: 'Dajavshne <noreply@dajavshne.io>',
              to: configRecipients,
              subject: `🔔 New Booking Request - ${venue.name}`,
              html,
            });
            console.log('✅ Admin-configured booking recipients emailed:', { count: configRecipients.length, resp });
          } catch (e) {
            console.error('❌ Failed to email admin-configured booking recipients', e);
          }
        } else {
          console.log('No configured venue recipients or missing RESEND key', { count: configRecipients.length });
        }
      }
    } catch (e) {
      console.error('Error during configured recipients notification:', e);
    }

    // Optional: We already sent emails above. Skipping cross-function call to reduce failure points.

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        message: 'Payment confirmed and booking created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // Log detailed error for debugging (avoid referencing out-of-scope vars)
    try {
      console.error('🔴 CONFIRM-PAYMENT ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } catch {}

    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'confirm-payment' },
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
