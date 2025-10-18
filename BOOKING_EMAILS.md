# Booking Email Notifications

This document describes the email notification system for booking requests in the Dajavshne Gaming Hub platform.

## Overview

When a user creates a booking request (after successful payment), the system automatically sends two emails:

1. **User Confirmation Email** - Sent to the customer who made the booking
2. **Partner Notification Email** - Sent to the venue owner/partner

## Implementation

### Files Created/Modified

1. **`supabase/functions/send-booking-notifications/index.ts`** - New Edge Function
   - Handles sending both user and partner emails
   - Fetches booking details with related venue and partner information
   - Uses Resend API for email delivery
   - Includes comprehensive error handling

2. **`supabase/functions/confirm-payment/index.ts`** - Modified
   - Added call to send booking notification emails after successful booking creation
   - Email sending is non-blocking (failures don't break booking creation)

### Email Templates

#### User Confirmation Email
- **Subject**: `🎮 Booking Request Confirmed - [Venue Name]`
- **Content**: 
  - Confirmation message with booking details
  - Venue information (name, location, date)
  - Service details (if applicable)
  - Payment summary
  - Special requests (if any)
  - Next steps (pending approval)
  - Contact information

#### Partner Notification Email
- **Subject**: `🔔 New Booking Request - [Venue Name] - [Amount] GEL`
- **Content**:
  - Alert about new booking request requiring action
  - Venue and customer information
  - Service details and pricing
  - Special requests (if any)
  - Call-to-action button to partner dashboard
  - Instructions for approval/rejection

### Database Queries

The function fetches comprehensive booking data including:

```sql
SELECT 
  bookings.*,
  venues.name, venues.location, venues.partner_id,
  profiles.email, profiles.full_name,
  booking_services.*,
  services.name as service_name
FROM bookings
JOIN venues ON bookings.venue_id = venues.id
JOIN profiles ON venues.partner_id = profiles.id
LEFT JOIN booking_services ON bookings.id = booking_services.booking_id
LEFT JOIN venue_services ON booking_services.service_id = venue_services.id
LEFT JOIN services ON venue_services.service_id = services.id
WHERE bookings.id = ?
```

### Email Service Configuration

- **Provider**: Resend API
- **From Address**: `Dajavshne Gaming Hub <bookings@resend.dev>`
- **Rate Limiting**: Applied to prevent spam
- **Error Handling**: Graceful degradation (booking creation succeeds even if emails fail)

## Testing

### Manual Testing

1. Create a test booking through the normal flow
2. Check the Supabase Edge Function logs for email sending status
3. Verify emails are received by both user and partner

### Test Script

Use the provided `test-booking-emails.js` script:

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run test (after updating with real booking ID)
node test-booking-emails.js
```

## Environment Variables Required

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `RESEND_API_KEY` - Resend API key for email sending
- `SITE_URL` - Base URL for partner dashboard links (optional)

## Error Handling

- Email sending failures are logged but don't prevent booking creation
- Comprehensive error messages in function logs
- Graceful degradation ensures system reliability
- Rate limiting prevents abuse

## Future Enhancements

Potential improvements:
- Email templates customization per venue
- SMS notifications as backup
- Email delivery status tracking
- Retry mechanism for failed emails
- Email preferences for users/partners
- Multi-language email templates

## Monitoring

Monitor email delivery through:
- Supabase Edge Function logs
- Resend dashboard for delivery statistics
- User feedback on email receipt
- Partner dashboard booking notification rates
