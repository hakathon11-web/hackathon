# Google Analytics Setup Guide

## Environment Configuration

To set up Google Analytics, you need to add the following environment variable:

### 1. Create Environment File

Create a `.env` file in the project root with:

```bash
# Google Analytics Configuration
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Google Analytics 4 Measurement ID.

### 2. Get Your Google Analytics Tracking ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property for your website
3. In the Property Settings, find your "Measurement ID" (format: G-XXXXXXXXXX)
4. Copy this ID to your `.env` file

### 3. Configure Google Analytics Property

In your GA4 property, make sure to:

- Enable Enhanced Measurement for better tracking
- Set up conversion goals for key actions (bookings, sign-ups, etc.)
- Configure audience definitions for your target users
- Set up custom dimensions if needed

### 4. Privacy and Compliance

The integration includes:

- ✅ **Cookie Consent Integration**: Analytics only loads after user consent
- ✅ **Do Not Track Respect**: Honors browser DNT settings
- ✅ **IP Anonymization**: Automatically anonymizes IP addresses
- ✅ **Privacy-First Configuration**: Disables Google Signals and ad personalization
- ✅ **GDPR/CCPA Compliant**: Follows privacy best practices

### 5. Testing

**Important**: Google Analytics only works on public domains (like dajavshne.io), not on localhost.

**For Development Testing:**
1. Set `VITE_GA_TRACKING_ID` in your `.env` file
2. Run the application in development mode
3. Check browser console for analytics initialization messages (will show "Skipping initialization on localhost")
4. The analytics test component will show "🏠 Localhost" status

**For Production Testing:**
1. Deploy your application to dajavshne.io
2. Set the environment variable in your production environment
3. Use Google Analytics Real-Time reports to verify tracking
4. Check browser console for successful GA4 initialization

### 6. Production Deployment

Make sure to:

1. Set the environment variable in your production environment
2. Verify the tracking ID is correct
3. Test analytics in production using GA4 Real-Time reports
4. Monitor for any console errors related to analytics

## Features Included

- **Automatic Page View Tracking**: Tracks route changes
- **Custom Event Tracking**: Predefined events for key user actions
- **User Property Tracking**: Tracks user information (with privacy controls)
- **Conversion Tracking**: Ready for e-commerce conversion tracking
- **Error Tracking**: Automatic error event tracking
- **Consent Management**: Integrates with existing cookie consent system

## Event Tracking

The integration includes predefined events for:

- User authentication (sign up, sign in)
- Booking flow (started, completed, cancelled)
- Venue interactions (viewed, favorited)
- Search functionality
- Navigation clicks
- Error tracking

## Privacy Features

- Only loads after user consent
- Respects Do Not Track browser settings
- Anonymizes IP addresses
- Disables Google Signals and ad personalization
- Provides easy consent management integration
