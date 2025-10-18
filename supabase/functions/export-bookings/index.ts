import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'
import { createSecureErrorResponse } from '../_shared/secure-error-handling.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { partner_id } = await req.json();

    if (!partner_id) {
      throw new Error('Partner ID is required');
    }

    console.log('Exporting bookings for partner:', partner_id);

    // Fetch all bookings for the partner with detailed information
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        total_price,
        status,
        user_email,
        special_requests,
        created_at,
        status_updated_at,
        venues!inner(name, location, partner_id),
        booking_services(
          arrival_datetime,
          departure_datetime,
          duration_hours,
          price_per_hour,
          subtotal,
          guest_count,
          venue_services(name)
        )
      `)
      .eq('venues.partner_id', partner_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`Found ${bookings?.length || 0} bookings to export`);

    // Generate CSV headers
    const headers = [
      'Booking ID',
      'Venue Name',
      'Venue Location',
      'Customer Email',
      'Booking Date',
      'Service Arrival Time',
      'Service Guest Count',
      'Total Price (GEL)',
      'Status',
      'Service Name',
      'Service Duration (Hours)',
      'Service Price per Hour (GEL)',
      'Service Subtotal (GEL)',
      'Special Requests',
      'Created At',
      'Status Updated At'
    ];

    // Convert bookings to CSV rows
    const csvRows = [headers.join(',')];

    if (bookings && bookings.length > 0) {
      bookings.forEach(booking => {
        // Handle bookings with multiple services
        if (booking.booking_services && booking.booking_services.length > 0) {
          booking.booking_services.forEach(service => {
            const row = [
              `"${booking.id}"`,
              `"${booking.venues.name}"`,
              `"${booking.venues.location}"`,
              `"${booking.user_email || 'N/A'}"`,
              `"${booking.booking_date}"`,
              `"${service.arrival_datetime ? new Date(service.arrival_datetime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Tbilisi', hour12: false }) : 'N/A'}"`,
              service.guest_count || 0,
              booking.total_price,
              `"${booking.status}"`,
              `"${service.venue_services?.name || 'N/A'}"`,
              service.duration_hours || 0,
              service.price_per_hour || 0,
              service.subtotal || 0,
              `"${booking.special_requests || 'N/A'}"`,
              `"${new Date(booking.created_at).toLocaleDateString()}"`,
              `"${booking.status_updated_at ? new Date(booking.status_updated_at).toLocaleDateString() : 'N/A'}"`
            ];
            csvRows.push(row.join(','));
          });
        } else {
          // Handle bookings without service details
          const row = [
            `"${booking.id}"`,
            `"${booking.venues.name}"`,
            `"${booking.venues.location}"`,
            `"${booking.user_email || 'N/A'}"`,
            `"${booking.booking_date}"`,
            '"N/A"', // Service arrival time
            0, // Service guest count
            booking.total_price,
            `"${booking.status}"`,
            '"N/A"', // Service name
            0, // Duration
            0, // Price per hour
            0, // Subtotal
            `"${booking.special_requests || 'N/A'}"`,
            `"${new Date(booking.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' })}"`,
            `"${booking.status_updated_at ? new Date(booking.status_updated_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Tbilisi' }) : 'N/A'}"`
          ];
          csvRows.push(row.join(','));
        }
      });
    }

    const csvData = csvRows.join('\n');

    console.log('CSV export completed successfully');

    return new Response(
      JSON.stringify({ 
        csvData,
        totalRecords: bookings?.length || 0,
        exportDate: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    const secureResponse = createSecureErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      { functionName: 'export-bookings' },
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