# Overnight Event Date Bug Fix

## Problem
When adding events after midnight (00:00-03:00) in the employee dashboard calendar, the events were being created for the wrong date.

## Root Cause
For venues with overnight schedules (e.g., 13:00 - 03:00):
- The calendar grid correctly displays time slots after midnight (00:00-03:00) as part of the overnight schedule
- These after-midnight slots represent the **next calendar day** (e.g., if viewing Oct 14, the 00:00-03:00 slots are actually Oct 15)
- However, when clicking on these slots to create an event, the code was using the **currently viewed date** (Oct 14) instead of the **next day** (Oct 15)
- This caused events to be stored with the wrong date

## Example Scenario

**Before the fix:**
1. Employee views October 14 in the calendar
2. Calendar shows overnight schedule: 13:00-23:00 (Oct 14) and 00:00-03:00 (Oct 15)
3. Employee clicks on 01:00 time slot to add an event
4. Event is created with date: **October 14** at 01:00 ❌ (WRONG!)
5. This event would show on the wrong business day

**After the fix:**
1. Employee views October 14 in the calendar  
2. Calendar shows overnight schedule: 13:00-23:00 (Oct 14) and 00:00-03:00 (Oct 15)
3. Employee clicks on 01:00 time slot to add an event
4. Event is created with date: **October 15** at 01:00 ✅ (CORRECT!)
5. Event shows on the correct calendar date

## Technical Solution

Modified the `handleCellClick` function in `GridCalendar.tsx` to detect when a clicked time slot is in the after-midnight range of an overnight schedule and automatically adjust the event date to the next calendar day.

```javascript
// For overnight schedules, adjust the date if clicking on after-midnight slots
let eventDate = selectedDate;
if (timeSlot) {
  const [clickedHour] = timeSlot.split(':').map(Number);
  const spansMidnight = scheduleEndHour < scheduleStartHour;
  
  // If it's an overnight schedule and the clicked hour is in the early morning range (00:00 - scheduleEndHour)
  // then the event should be for the next calendar day
  if (spansMidnight && clickedHour >= 0 && clickedHour < scheduleEndHour) {
    eventDate = addDays(selectedDate, 1);
  }
}
```

## Files Modified
- `src/pages/employee/calendar/components/GridCalendar.tsx` - Fixed date calculation in `handleCellClick` function

## Testing Recommendations
1. View a date in the employee calendar (e.g., October 14)
2. Click on an after-midnight time slot (e.g., 00:30, 01:00, 02:00)
3. Create an event
4. Verify the event is created with the **next day's date** (e.g., October 15)
5. Verify the event displays correctly in the calendar grid
6. Test with different overnight schedule configurations (e.g., 18:00-04:00, 20:00-05:00)

## Impact
- **High Priority**: This bug affected core functionality of the employee dashboard
- **User Experience**: Events were being misplaced on the wrong dates, causing confusion
- **Data Integrity**: Events were stored with incorrect dates in the database
- **Fixed**: All new events created via time slot clicks will now have the correct date

## Date: October 14, 2025

