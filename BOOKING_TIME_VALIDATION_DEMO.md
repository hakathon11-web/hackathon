# Booking Time Validation Implementation

## Overview
This implementation prevents users from booking venues beyond their closing time. For example, if a venue closes at 22:00 and a user tries to book at 21:00, they can only book for 1 hour maximum.

## Key Features

### 1. Smart Duration Limiting
- **Before**: Users could book any duration (1-12 hours) regardless of venue closing time
- **After**: Duration options are dynamically limited based on available time until closing

### 2. Real-time Validation
- **Arrival Time Selection**: Validates against venue opening hours
- **Departure Time Selection**: Prevents selection beyond venue closing time
- **Service Booking**: Same validation applies to individual service bookings

### 3. User-Friendly Error Messages
- Clear feedback when booking times exceed venue hours
- Specific error messages for different scenarios

## Implementation Details

### New Utility Functions (`src/utils/bookingTimeValidation.ts`)

#### `getMaxBookingDuration(arrivalTime, closingTime, maxDurationHours)`
```typescript
// Example: Venue closes at 22:00, user arrives at 21:00
getMaxBookingDuration('21:00', '22:00') // Returns 60 minutes (1 hour)
```

#### `validateDepartureTime(arrivalTime, departureTime, closingTime)`
```typescript
// Example: User tries to book 21:00-22:30 when venue closes at 22:00
validateDepartureTime('21:00', '22:30', '22:00')
// Returns: { isValid: false, errorMessage: "Booking cannot extend beyond venue closing time (22:00)" }
```

#### `generateDurationOptions(arrivalTime, closingTime, maxDurationHours)`
```typescript
// Example: Venue closes at 22:00, user arrives at 21:00
generateDurationOptions('21:00', '22:00')
// Returns: [{ label: "30 min", value: "00:30", totalMinutes: 30 }]
// Only 30 minutes available, so only 30-minute option is shown
```

### Updated Components

#### BookingForm (`src/components/BookingForm.tsx`)
- Added validation in `updateMainTime()` function
- Added validation in `updateServiceTime()` function  
- Added validation in `handleSubmit()` function
- Prevents form submission if booking extends beyond closing time

#### ServiceBookingDialog (`src/components/ServiceBookingDialog.tsx`)
- Updated `generateDurationOptions()` to limit options based on closing time
- Added validation in `handleConfirm()` function
- Dynamic duration options based on available time

## Example Scenarios

### Scenario 1: Venue closes at 22:00, user books at 21:00
- **Before**: User could select 1-12 hours (potentially booking until 09:00 next day)
- **After**: User can only select 30 minutes or 1 hour maximum
- **Result**: Booking ends at 22:00 (venue closing time)

### Scenario 2: Venue closes at 22:00, user books at 21:30
- **Before**: User could select 1-12 hours
- **After**: User can only select 30 minutes maximum
- **Result**: Booking ends at 22:00 (venue closing time)

### Scenario 3: Venue closes at 22:00, user tries to book 21:00-22:30
- **Before**: Booking would be accepted
- **After**: Error message: "Booking cannot extend beyond venue closing time (22:00)"
- **Result**: User must adjust departure time to 22:00 or earlier

## Benefits

1. **Prevents Invalid Bookings**: No more bookings that extend beyond venue hours
2. **Better User Experience**: Clear feedback and limited options prevent confusion
3. **Venue Management**: Venues don't need to manually reject invalid bookings
4. **Consistent Behavior**: Same validation applies to both basic venue bookings and service bookings
5. **Flexible**: Works with both new working hours format and legacy opening/closing time format

## Technical Notes

- Validation works with both `WorkingHours` (new format) and `openingTime`/`closingTime` (legacy format)
- Handles edge cases like venues closed on specific days
- Maintains backward compatibility with existing booking system
- Uses 30-minute increments for duration options
- Supports different maximum duration limits per venue type
