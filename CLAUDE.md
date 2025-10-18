# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Type Checking
- `npx tsc --noEmit` - Run TypeScript type checking without emitting files

### Supabase (if available)
- `supabase functions deploy <function-name>` - Deploy edge functions
- `supabase link --project-ref <project-ref>` - Link to Supabase project

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components 
- **State Management**: TanStack Query for server state, React hooks for local state
- **Backend**: Supabase (PostgreSQL + Edge Functions + Authentication + Storage)
- **Maps**: Custom Google Maps integration with Airbnb-style UI
- **Payments**: Stripe integration
- **Internationalization**: i18next with Georgian (ka) and English (en) support

### Project Structure

```
src/
├── components/           # Reusable UI components
├── pages/               # Route components
│   ├── admin/          # Admin dashboard pages
│   ├── partner/        # Venue owner/partner pages  
│   └── employee/       # Employee dashboard pages
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/      # Supabase client and types
├── utils/              # Utility functions
├── lib/                # Shared libraries
├── constants/          # App constants
└── i18n/              # Internationalization config
```

### Key Components

#### Map System (`AirbnbStyleMap.tsx`)
- Custom Google Maps implementation mimicking Airbnb's design
- Canvas-generated price markers for venues
- Interactive popups with venue details, pricing, and actions
- Mobile-specific behavior (popups disabled on mobile via `onVenueClick={undefined}`)
- Coordinate generation for venues without lat/lng using district-based positioning

#### Authentication Flow
Multi-tiered authentication system:
- **Users**: Regular customers booking venues
- **Partners**: Venue owners managing their venues  
- **Employees**: Staff members working at venues
- **Admin**: System administrators

Each has separate auth pages, protected routes, and dashboards.

#### Booking System
Complex booking flow with:
- Service selection with pricing tiers (per hour, per guest, per table)
- Time slot selection with availability checking
- Guest count and special requests
- Payment processing via Stripe
- Real-time booking management for partners/employees

#### Pricing System (`utils/guestPricing.ts`, `utils/venuePricing.ts`)
- Dynamic pricing based on service type (hourly, per-guest, per-table)
- Discount system with percentage, group, timeslot, and free-hours discounts
- Complex pricing calculations handled in edge functions

### Database Schema (Supabase)
Key tables:
- `venues` - Gaming venue information
- `services` - Services offered by venues  
- `venue_services` - Junction table linking venues to services with pricing
- `bookings` - Customer bookings
- `users` - User accounts
- `partners` - Venue owners
- `employees` - Venue staff

### Important Patterns

#### Custom Hooks
Extensive use of custom hooks for:
- Authentication state (`useAuth`, `usePartnerAuth`, `useEmployeeAuth`)
- Data fetching (`useVenues`, `useBookings`, `useProfile`)
- Real-time subscriptions (`useRealtimeBookings`, `useRealtimePartnerBookings`)
- Global state (`useGlobalSettingsSync`, `useLayoutStability`)

#### Responsive Design
- Mobile-first approach with `lg:` breakpoints for desktop
- Mobile-specific map behavior (popups disabled, full-screen layout)
- Component variants for different screen sizes

#### Internationalization
- Georgian and English language support
- Date/time formatting with locale awareness
- RTL layout considerations for Georgian text

### Environment Variables
Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key  
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Mobile Considerations
- Search page (`SearchResults.tsx`) has completely different mobile layout
- Mobile map shows only embedded search bar + full-screen map
- Desktop shows split view with venue cards + map
- Mobile venue popups are disabled to maintain clean UX

### Key Files to Understand
- `src/App.tsx` - Main app structure with lazy loading
- `src/components/AirbnbStyleMap.tsx` - Core map functionality
- `src/pages/SearchResults.tsx` - Main venue discovery page
- `src/hooks/useAuth.tsx` - Authentication provider
- `src/integrations/supabase/client.ts` - Database client setup

### Testing
No automated tests are currently configured. Manual testing is done via the development server and browser tools.