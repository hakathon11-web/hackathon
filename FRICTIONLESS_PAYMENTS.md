# Frictionless Payments for Development

This document explains how to enable and use the frictionless payment system for development purposes.

## Overview

The frictionless payment system allows you to test the booking flow without requiring actual payment credentials or processing real payments. It simulates the entire payment process while still creating bookings in the database.

## How It Works

1. **Mock Payment Creation**: Instead of calling the BOG API, the system generates a mock order ID
2. **Database Storage**: Booking data is stored in the same way as real payments
3. **Mock Confirmation**: A separate endpoint confirms the mock payment and creates the booking
4. **Simplified UI**: The payment interface shows a development mode indicator

## Enabling Frictionless Payments

### Method 1: Environment Variables

Create a `.env` file in your project root with:

```bash
# Enable development mode
VITE_DEV_MODE=true
VITE_FRICTIONLESS_PAYMENTS=true
```

### Method 2: Development Mode Detection

The system automatically enables frictionless payments when:
- `NODE_ENV=development`
- `VITE_DEV_MODE=true`
- `VITE_FRICTIONLESS_PAYMENTS=true`

## Features

### Frontend Changes
- **Simplified UI**: Shows a blue development mode indicator instead of payment forms
- **Mock Payment Button**: Displays "🔧 Mock Pay" instead of regular payment button
- **No Credentials Required**: Skips all payment method selection and card input

### Backend Changes
- **Mock Order Creation**: `bog-create-order` function returns mock data instead of calling BOG API
- **Mock Payment Confirmation**: `mock-payment-confirm` function creates bookings without real payment
- **Database Integration**: All booking data is stored normally in the database

## Files Modified

### New Files
- `src/config/development.ts` - Development configuration utilities
- `supabase/functions/mock-payment-confirm/index.ts` - Mock payment confirmation endpoint

### Modified Files
- `supabase/functions/bog-create-order/index.ts` - Added frictionless payment logic
- `src/components/BookingPaymentDialog.tsx` - Added development mode UI
- `src/pages/ConfirmAndPay.tsx` - Added development mode UI
- `src/pages/PaymentSuccess.tsx` - Added mock payment handling

## Usage

1. **Enable the feature** by setting the environment variables
2. **Start the development server** with `npm run dev`
3. **Create a booking** - you'll see the development mode UI
4. **Click "Mock Pay"** - the system will simulate payment and create a booking
5. **Check the database** - the booking will be created with `payment_status: 'authorized'`

## Database Impact

Mock payments create bookings with:
- `bog_order_id`: Mock order ID (e.g., `mock_order_12345`)
- `payment_status`: `'authorized'` (simulating successful payment)
- `status`: `'pending'` (normal booking flow)

## Disabling Frictionless Payments

To disable frictionless payments and use real payment processing:

1. Remove or set to `false`:
   ```bash
   VITE_FRICTIONLESS_PAYMENTS=false
   ```

2. Or set to production mode:
   ```bash
   NODE_ENV=production
   ```

## Security Notes

- Frictionless payments are **only available in development mode**
- The system checks multiple conditions before enabling mock payments
- Production deployments will always use real payment processing
- Mock payments are clearly marked in the UI and database

## Troubleshooting

### Frictionless payments not working
1. Check that `VITE_FRICTIONLESS_PAYMENTS=true` is set
2. Verify you're in development mode (`NODE_ENV=development`)
3. Check browser console for development mode logs

### Mock payment confirmation failing
1. Ensure the `mock-payment-confirm` function is deployed
2. Check that the order context exists in the database
3. Verify user authentication is working

### UI not showing development mode
1. Clear browser cache and reload
2. Check that the development configuration is loaded
3. Verify environment variables are properly set

## Development Workflow

1. **Enable frictionless payments** for faster development
2. **Test booking flow** without payment setup
3. **Verify database entries** are created correctly
4. **Test with real payments** before production deployment
5. **Disable frictionless payments** for production

This system allows for rapid development and testing of the booking system without the complexity of setting up payment providers.
