# Booking Status Utility Functions

This utility provides functions to distinguish between confirmed and completed bookings based on departure times.

## Overview

The booking status utility helps determine whether a booking is:
- **Confirmed**: The booking is confirmed and the departure time has not yet passed
- **Completed**: The booking is confirmed but the departure time has already passed

For bookings with multiple services from the same venue, the utility uses the latest (farthest) departure time among all services.

## Functions

### `getBookingStatusInfo(booking, currentTime?)`

Returns detailed status information for a single booking.

**Parameters:**
- `booking`: Booking object with `booking_services` array
- `currentTime`: Optional Date object (defaults to current time)

**Returns:**
```typescript
{
  isConfirmed: boolean;      // true if confirmed and departure time hasn't passed
  isCompleted: boolean;      // true if confirmed and departure time has passed
  latestDepartureTime: Date | null;  // Latest departure time across all services
  hasPassedDepartureTime: boolean;   // true if departure time has passed
}
```

**Example:**
```typescript
import { getBookingStatusInfo } from '@/utils/bookingStatus';

const statusInfo = getBookingStatusInfo(booking);
if (statusInfo.isConfirmed) {
  console.log('Booking is still active');
} else if (statusInfo.isCompleted) {
  console.log('Booking has completed');
}
```

### `getConfirmedBookings(bookings, currentTime?)`

Filters an array of bookings to return only confirmed bookings (departure time hasn't passed).

**Parameters:**
- `bookings`: Array of booking objects
- `currentTime`: Optional Date object (defaults to current time)

**Returns:** Array of confirmed bookings

**Example:**
```typescript
import { getConfirmedBookings } from '@/utils/bookingStatus';

const confirmedBookings = getConfirmedBookings(allBookings);
console.log(`You have ${confirmedBookings.length} active bookings`);
```

### `getCompletedBookings(bookings, currentTime?)`

Filters an array of bookings to return only completed bookings (departure time has passed).

**Parameters:**
- `bookings`: Array of booking objects
- `currentTime`: Optional Date object (defaults to current time)

**Returns:** Array of completed bookings

**Example:**
```typescript
import { getCompletedBookings } from '@/utils/bookingStatus';

const completedBookings = getCompletedBookings(allBookings);
console.log(`You have ${completedBookings.length} completed bookings`);
```

### `hasBookingPassedDepartureTime(booking, currentTime?)`

Checks if a specific booking has passed its departure time.

**Parameters:**
- `booking`: Booking object
- `currentTime`: Optional Date object (defaults to current time)

**Returns:** boolean

**Example:**
```typescript
import { hasBookingPassedDepartureTime } from '@/utils/bookingStatus';

if (hasBookingPassedDepartureTime(booking)) {
  console.log('This booking has completed');
}
```

### `getLatestDepartureTime(booking)`

Gets the latest departure time for a booking across all its services.

**Parameters:**
- `booking`: Booking object

**Returns:** Date object or null

**Example:**
```typescript
import { getLatestDepartureTime } from '@/utils/bookingStatus';

const latestDeparture = getLatestDepartureTime(booking);
if (latestDeparture) {
  console.log(`Latest departure: ${latestDeparture.toLocaleString()}`);
}
```

## Multiple Services Handling

When a booking has multiple services from the same venue, the utility automatically finds the latest departure time among all services:

```typescript
// Booking with multiple services
const booking = {
  booking_date: '2024-01-15',
  booking_services: [
    { departure_time: '16:00' },  // First service ends at 4 PM
    { departure_time: '18:00' },  // Second service ends at 6 PM
    { departure_time: '22:00' }   // Third service ends at 10 PM
  ]
};

// The utility will use 22:00 (10 PM) as the latest departure time
const statusInfo = getBookingStatusInfo(booking);
// statusInfo.latestDepartureTime will be 2024-01-15T22:00:00
```

## Fallback Behavior

If a booking has no `booking_services` or no departure times, the utility falls back to using the main booking time with a 1-hour duration:

```typescript
// Booking without services
const booking = {
  booking_date: '2024-01-15',
  booking_time: '14:00',
  booking_services: []
};

// Falls back to 15:00 (14:00 + 1 hour) as departure time
const statusInfo = getBookingStatusInfo(booking);
```

## Testing

You can test the utility functions using the provided test file:

```typescript
import { demonstrateBookingStatus } from '@/utils/bookingStatus.test';

// Run the demo
demonstrateBookingStatus();
```

## Integration Examples

### In React Components

```typescript
import { getBookingStatusInfo } from '@/utils/bookingStatus';

function BookingCard({ booking }) {
  const statusInfo = getBookingStatusInfo(booking);
  
  return (
    <div className={`booking-card ${statusInfo.isCompleted ? 'completed' : 'active'}`}>
      <h3>{booking.venues?.name}</h3>
      <p>Status: {statusInfo.isConfirmed ? 'Active' : 'Completed'}</p>
      {statusInfo.latestDepartureTime && (
        <p>Departure: {statusInfo.latestDepartureTime.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
```

### In Hooks

```typescript
import { getConfirmedBookings, getCompletedBookings } from '@/utils/bookingStatus';

export function useBookingStats(bookings) {
  const confirmed = getConfirmedBookings(bookings);
  const completed = getCompletedBookings(bookings);
  
  return {
    activeCount: confirmed.length,
    completedCount: completed.length,
    totalCount: bookings.length
  };
}
```

## Notes

- All functions accept an optional `currentTime` parameter for testing or specific time-based logic
- The utility only considers bookings with `status: 'confirmed'` as potentially completed
- Bookings with other statuses (pending, rejected, expired) are never considered completed
- The utility handles timezone conversion by using the booking date and time strings directly
