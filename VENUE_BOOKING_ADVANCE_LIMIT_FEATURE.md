# Venue Booking Advance Limit Feature

## Overview
This feature allows venue owners to set a limit on how far in advance customers can book their venue. For example, if a venue owner sets the limit to 14 days (2 weeks), customers will not be able to make bookings more than 14 days in advance.

## What's Changed

### 1. Database Migration
**File:** `supabase/migrations/20251007000000_add_venue_booking_advance_limit.sql`

Added a new column `max_booking_days_in_advance` to the `venues` table:
- Type: `integer`
- Default: `30` (30 days, approximately 1 month)
- Allows venue owners to specify the maximum number of days in advance for bookings
- All existing venues are updated to have the 30-day default

### 2. TypeScript Types
**Files:** 
- `src/integrations/supabase/types.ts`
- `src/hooks/useVenues.ts`

Updated the Venue type definitions to include the `max_booking_days_in_advance` field.

### 3. Venue Forms (Add/Edit)
**Files:**
- `src/pages/partner/AddVenue.tsx`
- `src/pages/partner/EditVenue.tsx`

Added a new input field in Step 1 (Basic Information) where venue owners can set their booking advance limit:
- Appears after the Location field
- Includes a description explaining the feature
- Optional field (leave empty for no limit)
- Accepts positive integers only
- Displays the unit "days" next to the input

### 4. Booking Validation
**Files:**
- `src/components/BookingForm.tsx`
- `src/pages/VenuePage.tsx`

Updated the booking form to enforce the advance limit:
- Calendar dates beyond the limit are automatically disabled
- Validation occurs client-side for immediate user feedback
- If a venue has no limit set (NULL), all future dates remain available (existing behavior)

### 5. Translations
**Files:**
- `src/i18n/locales/en.json`
- `src/i18n/locales/ka.json`

Added translation keys in both English and Georgian:
- `bookingAdvanceLimit` - Field label
- `bookingAdvanceLimitDescription` - Help text explaining the feature
- `bookingAdvanceLimitPlaceholder` - Input placeholder example
- `bookingAdvanceLimitDays` - Unit label ("days")
- `bookingAdvanceLimitReached` - Error title (for future use)
- `bookingAdvanceLimitMessage` - Error message (for future use)

## How It Works

### For Venue Owners
1. Navigate to Add/Edit Venue page
2. In Step 1 (Basic Information), find the "Booking Advance Limit" field
3. The default value is **30 days** (approximately 1 month)
4. Adjust the number as needed (e.g., 7 for 1 week, 14 for 2 weeks, 60 for 2 months)
5. You can set it to a higher number for more advance booking flexibility
6. Save the venue

### For Customers
1. When viewing a venue's booking form, the calendar will automatically disable dates that exceed the venue's advance limit
2. Only dates within the allowed range (and not in the past or on closed days) will be selectable
3. The validation is seamless - restricted dates simply won't be clickable

## Deployment Instructions

Since you're using **remote Supabase**, you need to apply the migration to your remote database:

### Option 1: Using Supabase CLI (Recommended)
```bash
# Make sure you're logged in and linked to your remote project
supabase db push
```

### Option 2: Manual Migration via Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251007000000_add_venue_booking_advance_limit.sql`
4. Paste and execute the SQL

### Option 3: Using Supabase CLI with specific migration
```bash
# Apply this specific migration
supabase migration up --db-url "your-database-url"
```

## Testing

After deployment, test the feature:

1. **As a Venue Owner:**
   - Create a new venue - it should default to 30 days
   - Edit an existing venue - it should show 30 days by default
   - Change the booking advance limit to 7 days
   - Save the changes

2. **As a Customer:**
   - Visit a venue page (should have 30-day default limit)
   - Open the booking calendar
   - Verify that dates more than 30 days in the future are disabled
   - Verify that dates within the next 30 days are selectable

3. **Test with Different Limits:**
   - Change a venue's limit to 7 days - verify only next 7 days are available
   - Change a venue's limit to 60 days - verify next 2 months are available
   - Change a venue's limit to 365 days - verify year-long advance booking works

## Technical Details

### Database Schema
```sql
ALTER TABLE "public"."venues" 
ADD COLUMN "max_booking_days_in_advance" integer DEFAULT 30;

-- Update existing venues to have the default
UPDATE "public"."venues" 
SET "max_booking_days_in_advance" = 30 
WHERE "max_booking_days_in_advance" IS NULL;
```

### Validation Logic
The booking form's calendar component uses this logic:
```javascript
if (maxBookingDaysInAdvance && maxBookingDaysInAdvance > 0) {
  const maxDate = new Date(todayStart);
  maxDate.setDate(maxDate.getDate() + maxBookingDaysInAdvance);
  if (date >= maxDate) return true; // Disable this date
}
```

## Future Enhancements (Optional)

1. **Visual Indicator:** Add a message in the booking form showing the booking window (e.g., "Bookings available up to 14 days in advance")
2. **Admin Override:** Allow system administrators to override venue limits for special cases
3. **Default Limit:** Add a system-wide default limit that new venues inherit
4. **Analytics:** Track how booking advance limits affect booking patterns

## Support

If you encounter any issues:
1. Verify the migration was applied successfully
2. Check browser console for any JavaScript errors
3. Ensure venue data is being fetched correctly (check `max_booking_days_in_advance` field)
4. Clear browser cache and test in incognito mode

## Notes

- All venues (new and existing) default to **30 days** advance booking limit
- The migration automatically updates existing venues to have the 30-day default
- Venue owners can adjust this limit at any time from the Edit Venue page
- The limit is enforced client-side for better UX; consider adding server-side validation in the booking API as an additional safeguard
- Negative numbers are prevented by the `min="1"` attribute on the input field
- The 30-day default strikes a good balance between flexibility and preventing too-far-in-advance bookings


