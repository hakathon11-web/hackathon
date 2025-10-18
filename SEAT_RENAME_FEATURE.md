# Seat Rename Feature

## Overview
Employees can now **rename** and **reorder** seats/tables directly from the calendar view in the employee dashboard. These features provide a user-friendly, modern interface with instant feedback and automatic error handling.

## Features

### User Interface
- ✏️ **Always Visible Edit Button**: Pencil icon is always visible next to each seat name
- 📝 **Explicit Editing**: Click the pencil icon to start editing (clicking the name itself does nothing)
- ⬆️⬇️ **Position Controls**: Up and down arrow buttons to reorder seats
- ⌨️ **Keyboard Shortcuts**: 
  - `Enter` to save name changes
  - `Escape` to cancel editing
- 🌓 **Dark Mode**: Fully compatible with both light and dark themes
- ✅ **Visual Feedback**: Green checkmark to save, red X to cancel, blue hover effects

### Functionality
- **Instant Updates**: UI responds immediately with optimistic updates
- **Background Sync**: Database updates happen asynchronously in the background
- **Smart Rollback**: Automatic revert if database update fails
- **Persistence**: Custom seat names and positions are stored permanently
- **Validation**: Seat names are trimmed and validated before saving
- **Smart Positioning**: Seats can only be reordered within their own service group
- **Error Handling**: User-friendly error messages with automatic recovery

## Technical Implementation

### Database Storage
Custom seat names and positions are stored in the `venue_calendar_settings` table as part of the JSONB `settings` column:

```json
{
  "seatNames": {
    "venue-{venueServiceId}-seat-1": "VIP Table",
    "venue-{venueServiceId}-seat-2": "Window Seat",
    ...
  },
  "seatPositions": {
    "venue-{venueServiceId}-seat-1": 0,
    "venue-{venueServiceId}-seat-2": 1,
    ...
  }
}
```

### Components Created

1. **`src/hooks/useSeatNames.ts`**
   - Custom React Query hook for fetching and updating seat names and positions
   - **Optimistic updates** for instant UI feedback
   - **Automatic rollback** on errors
   - Handles cache invalidation
   - Provides loading and error states
   - `moveSeat()` function to reorder seats up or down

2. **`src/components/SeatNameEditor.tsx`** - Reusable inline editor component
   - Always-visible pencil icon for explicit editing control
   - Edit mode only activates when pencil button is clicked
   - Keyboard shortcuts (Enter to save, Escape to cancel)
   - Visual feedback during editing

3. **Seat Position Controls**
   - Up and down arrow buttons integrated into each seat row
   - Automatically disabled when seat is at the top/bottom of its service group
   - Smooth hover effects and visual feedback

### Modified Files

1. **`src/hooks/useVenueCalendarData.ts`**
   - Fetches custom seat names from `venue_calendar_settings`
   - Applies custom names to resources when available

2. **`src/pages/employee/calendar/components/GridCalendar.tsx`**
   - Integrates the `SeatNameEditor` component
   - Added up/down arrow controls for seat reordering
   - Updated sorting logic to respect custom seat positions
   - Passes venue ID and seat update handlers

3. **`src/pages/employee/calendar/context/SchedulerContext.tsx`**
   - Exposes `venueId` through context for child components

4. **`src/pages/employee/calendar/calendar.css`**
   - Added styles for seat name editor integration
   - Added styles for seat reorder controls (up/down arrows)
   - Hover effects and disabled state styling
   - Dark mode support

## Usage

### For Employees

**Renaming Seats:**
1. Navigate to the Employee Dashboard (`/employee/dashboard`)
2. Go to the "Calendar" tab
3. Locate the seat you want to rename in the left column
4. Click the **pencil icon (✏️)** next to the seat name
5. Edit the name in the input field
6. Press `Enter` or click the green checkmark (✅) to save
7. Press `Esc` or click the red X (❌) to cancel

**Important:** 
- Clicking the seat name text triggers **quick event add** (opens event form)
- Only clicking the **pencil icon** starts editing
- This allows quick event creation while keeping rename explicit

**Reordering Seats:**
1. Navigate to the Employee Dashboard (`/employee/dashboard`)
2. Go to the "Calendar" tab
3. Hover over any seat in the left column
4. Click the up arrow (⬆️) to move the seat up
5. Click the down arrow (⬇️) to move the seat down
6. Seats can only be reordered within their own service group
7. Changes save automatically

### For Developers

**Using seat names and positions:**

```tsx
import { useSeatNames } from '@/hooks/useSeatNames';

function MyComponent({ venueId }: { venueId: string }) {
  const { seatNames, seatPositions, updateSeatName, moveSeat, isUpdating } = useSeatNames(venueId);
  
  // Get custom name for a resource
  const customName = seatNames['venue-123-seat-1'];
  
  // Get custom position for a resource
  const customPosition = seatPositions['venue-123-seat-1'];
  
  // Update a seat name
  updateSeatName({ 
    resourceId: 'venue-123-seat-1', 
    newName: 'VIP Table' 
  });
  
  // Move a seat up or down (requires sorted resources array)
  moveSeat('venue-123-seat-1', 'up', sortedResources);
  moveSeat('venue-123-seat-1', 'down', sortedResources);
}
```

## Benefits

1. **Flexibility**: Venues can use their own naming conventions and organization
2. **User Experience**: Employees can quickly identify and organize seats with meaningful names
3. **Efficiency**: No need to contact support to change seat names or order
4. **Localization**: Supports venue-specific terminology in any language
5. **Organization**: Custom ordering helps match physical layout or importance

## Future Enhancements

- Bulk rename functionality
- Name templates/presets
- Import/export seat configurations
- Seat name history/undo functionality
- Drag-and-drop reordering (in addition to arrows)
- Visual seat layout editor

