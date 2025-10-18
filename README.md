# Dajavshne - Gaming Venue Booking Platform

A modern web application for booking gaming venues, built with React, TypeScript, and Supabase.

## Features

### 🗺️ Airbnb-Style Google Maps Integration

The platform features a sophisticated Google Maps implementation that closely resembles Airbnb's map experience:

#### Map Features
- **Custom Price Markers**: Each venue is represented by a custom-designed marker showing the price in Georgian Lari (GEL)
- **Hover Tooltips**: Beautiful Airbnb-style cards appear on hover with venue details
- **Interactive Popups**: Click markers to see detailed venue information
- **Smooth Animations**: Hover effects and transitions for a polished user experience
- **Responsive Design**: Works seamlessly across desktop and mobile devices

#### Marker Styling
- Rounded rectangle markers with price display
- Dynamic hover states (markers change color on hover)
- Professional typography matching Airbnb's design
- Clean white borders and shadows for visibility

#### Popup Features
- **Venue Images**: High-quality venue photos with fallback placeholders
- **Rating Display**: Star ratings with review counts
- **Location Info**: District and category information
- **Pricing**: Clear price display per hour
- **Action Buttons**: Heart (favorite) and close buttons
- **View Details**: Direct link to venue page

#### Technical Implementation
- **Google Maps API**: Full integration with Google Maps JavaScript API
- **Custom Icons**: Canvas-generated marker icons for consistent styling
- **Info Windows**: Custom styled popups with venue cards
- **Event Handling**: Comprehensive click and hover interactions
- **Performance Optimized**: Efficient marker management and cleanup

### 🎮 Core Features

- **Venue Discovery**: Browse gaming venues with detailed information
- **Real-time Booking**: Instant booking system with real-time availability
- **User Authentication**: Secure login and registration
- **Payment Integration**: Stripe payment processing
- **Review System**: User reviews and ratings
- **Admin Panel**: Comprehensive admin interface for venue management
- **Partner Dashboard**: Dedicated interface for venue owners

### 🛡️ Security Features

- **Comprehensive Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Row Level Security**: Database-level access control via Supabase RLS
- **Secure Authentication**: JWT-based auth with proper session management
- **Input Validation**: Comprehensive form validation and sanitization
- **Rate Limiting**: API endpoint protection against abuse
- **HTTPS Enforcement**: Secure transport with HSTS headers

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Maps API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dajavshne-main.git
cd dajavshne-main
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

5. Start the development server:
```bash
npm run dev
```

### Google Maps Setup

1. Get a Google Maps API key from the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Maps JavaScript API
   - Places API
3. Add your API key to the `.env` file
4. See `GOOGLE_MAPS_SETUP.md` for detailed setup instructions

## Map Components

### AirbnbStyleMap
The main map component that provides the Airbnb-like experience:
- Custom marker icons with price display
- Hover tooltips with venue information
- Interactive popups
- Smooth animations and transitions

### GoogleMapsWrapper
Handles Google Maps API loading and initialization:
- API key management
- Script loading
- Error handling
- Loading states

### VenueMapPopup
Displays detailed venue information in popups:
- Venue images with carousel support
- Rating and review information
- Location and category details
- Action buttons (favorite, close, view details)

## Usage

```tsx
import AirbnbStyleMap from './components/AirbnbStyleMap';

function VenueMap() {
  const venues = [/* your venues data */];
  
  return (
    <AirbnbStyleMap
      venues={venues}
      onVenueClick={(venue) => console.log('Venue clicked:', venue)}
      onBoundsChange={(bounds) => console.log('Map bounds changed:', bounds)}
    />
  );
}
```

## Deployment

### Development
```bash
npm run dev
```

### Production Options

#### Option 1: Express Server (Recommended)
```bash
npm run build
npm run start:prod
```

#### Option 2: Nginx Reverse Proxy
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/dajavshne
sudo ln -s /etc/nginx/sites-available/dajavshne /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### Option 3: Vercel Serverless
```bash
npm i -g vercel
vercel --prod
```

### Security Configuration
All deployment options include comprehensive security headers. See [SECURITY_HEADERS.md](./SECURITY_HEADERS.md) for detailed configuration.

### Scheduling pre-arrival reminders (Supabase)

1) Deploy Edge Functions:

- `booking-reminders` (sends configurable pre-arrival emails)
- `booking-reminders-scheduler` (triggers `booking-reminders`)

2) In Supabase Dashboard → Edge Functions → Schedules, create a schedule for `booking-reminders-scheduler`:

- Cron: `0 * * * *` (hourly) or `*/15 * * * *` (every 15 minutes)
- Environment: Production

3) Set env vars on Supabase project:

- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

4) Admin → Settings in the app:

- Set "Pre-arrival Reminder (Hours)"
- Set "Min Advance Hours For Reminder"

Notes:

- The reminder function queries bookings whose first service `arrival_datetime` falls within the next hour at `reminder_hours` ahead of now.
- A `notifications` row with type `pre_arrival_reminder` is inserted to prevent duplicates.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@dajavshne.io or create an issue in the repository.

## Legal content management

We support managing legal pages (About, Contact, Refund Policy, Privacy, Detailed Service Description) as localized HTML files with a simple Word-to-HTML converter.

Location of files:

- `src/legal/en/{about|contact|refund-policy|privacy|service-description}.html`
- `src/legal/ka/{about|contact|refund-policy|privacy|service-description}.html`

Alternatively, drop Word files here and run the converter:

- Input: `src/legal/word_documents`
- Expected filename pattern: `<lang>_<slug>.docx` where:
  - `<lang>` is `en` or `ka`
  - `<slug>` is one of `about`, `contact`, `refund-policy`, `privacy`, `service-description`

Convert:

```bash
npm run convert:legal
```

The converted HTML will overwrite the files under `src/legal/<lang>/<slug>.html`.
