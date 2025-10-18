# Shared Utilities for Supabase Edge Functions

This directory contains shared utilities for Supabase Edge Functions, including secure CORS configuration and comprehensive rate limiting.

## 🛡️ Security Features

### 1. CORS Security Configuration
Secure domain-restricted CORS headers to prevent unauthorized cross-origin requests.

### 2. Rate Limiting Protection
Comprehensive rate limiting to protect against DoS attacks, API abuse, and brute force attacks.

### Problem

Previously, all edge functions used overly permissive CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ❌ SECURITY RISK
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

This allowed any domain to make requests to the API endpoints, creating risks for:
- Cross-Site Request Forgery (CSRF) attacks
- Unauthorized API access from malicious websites
- Data exfiltration through malicious domains

### Solution

The new secure CORS configuration in `cors.ts` restricts origins to specific domains:

```typescript
// Production domains
const productionOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
]

// Development domains
const developmentOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173'
]
```

### Usage

To use secure CORS in your edge function:

```typescript
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }
  
  // Your function logic here...
  
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  )
})
```

### Functions Updated

The following functions have been updated to use secure CORS and rate limiting:
- ✅ `send-contact-email` - Secure CORS + Email rate limiting (5/hour)
- ✅ `create-payment-intent` - Secure CORS + Payment rate limiting (3/5min)
- ✅ `confirm-payment` - Secure CORS + Payment rate limiting (3/5min)
- ✅ `booking-confirmation` - Secure CORS + Booking rate limiting (10/5min)
- ✅ `cancel-booking-request` - Secure CORS + Booking rate limiting (10/5min)
- ✅ `delete-own-account` - Secure CORS + Auth rate limiting (5/15min)
- ✅ `get-google-maps-api-key` - Secure CORS + Public rate limiting (10/min)
- ✅ `get-mapbox-token` - Secure CORS + Public rate limiting (10/min)

## 🚦 Rate Limiting Configuration

### Rate Limit Types
- **Public**: 10 requests/minute (maps, general endpoints)
- **Auth**: 5 attempts/15 minutes (login, register, password reset)
- **Payment**: 3 attempts/5 minutes (payment processing)
- **Booking**: 10 requests/5 minutes (booking operations)
- **Admin**: 20 requests/minute (admin operations)
- **Email**: 5 emails/hour (contact forms, notifications)

### Usage Example
```typescript
import { withRateLimit } from '../_shared/rate-limiting.ts'

// Apply rate limiting
const rateLimitHandler = withRateLimit('payment', corsHeaders);
return rateLimitHandler(req, async (req) => {
  // Your function logic here
});
```

### Deployment Notes

**Important**: Before deploying to production, update the production domains in `cors.ts`:

```typescript
if (env === 'production') {
  return [
    'https://your-actual-domain.com',      // ⚠️ Replace with actual domain
    'https://www.your-actual-domain.com'   // ⚠️ Replace with actual domain
  ]
}
```

### Security Benefits

- ✅ **CSRF Protection**: Only allowed domains can make requests
- ✅ **Unauthorized Access Prevention**: Malicious sites cannot access APIs
- ✅ **Data Protection**: Sensitive data cannot be accessed from unauthorized origins
- ✅ **Compliance**: Meets security best practices for API endpoints

### Testing

To test CORS functionality:

1. **Allowed Origins**: Requests from localhost:8080 should work in development
2. **Blocked Origins**: Requests from random domains should be blocked
3. **Preflight Requests**: OPTIONS requests should return proper CORS headers

```bash
# Test allowed origin (should work)
curl -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-project.supabase.co/functions/v1/send-contact-email

# Test blocked origin (should return null origin)
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-project.supabase.co/functions/v1/send-contact-email
```