# Quick Integration Guide for CurrentBookingDisplay

## Step 1: Import the Hook

In your `CurrentBookingDisplay.tsx` file, add:

```tsx
import { usePersistentWidgetState } from '@/hooks/usePersistentWidgetState';
```

## Step 2: Replace State Management

Replace these lines:
```tsx
// OLD CODE - REMOVE THESE:
const [isExpanded, setIsExpanded] = useState(true);
const [activeBookingsExpanded, setActiveBookingsExpanded] = useState(true);
const [pendingApprovalsExpanded, setPendingApprovalsExpanded] = useState(() => {
  try {
    const stored = localStorage.getItem('widget.pendingApprovalsExpanded');
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
});
const [pendingReviewsExpanded, setPendingReviewsExpanded] = useState(false);
const [rejectedBookingsExpanded, setRejectedBookingsExpanded] = useState(false);
const [cancelledBookingsExpanded, setCancelledBookingsExpanded] = useState(false);
const [expiredBookingsExpanded, setExpiredBookingsExpanded] = useState(false);
```

With:
```tsx
// NEW CODE - ADD THIS:
const {
  isExpanded,
  categories,
  widgetPosition,
  setIsExpanded,
  setCategoryExpanded,
  setWidgetPosition,
} = usePersistentWidgetState({
  storageKey: 'booking-widget-state',
  syncAcrossTabs: true,
  debounceMs: 500,
});
```

## Step 3: Update Toggle Handlers

Replace category toggle logic:

```tsx
// OLD CODE:
<button onClick={() => setActiveBookingsExpanded(!activeBookingsExpanded)}>
  {activeBookingsExpanded ? <ChevronUp /> : <ChevronDown />}
</button>

// NEW CODE:
<button onClick={() => setCategoryExpanded('activeBookings', !categories.activeBookings)}>
  {categories.activeBookings ? <ChevronUp /> : <ChevronDown />}
</button>
```

## Step 4: Update All Category References

Replace all category state references:

```tsx
// OLD: pendingApprovalsExpanded
// NEW: categories.pendingApprovals

// OLD: setPendingApprovalsExpanded(!pendingApprovalsExpanded)
// NEW: setCategoryExpanded('pendingApprovals', !categories.pendingApprovals)
```

## Step 5: Remove Old localStorage Logic

Remove this effect since it's now handled by the hook:
```tsx
// REMOVE THIS:
useEffect(() => {
  try {
    localStorage.setItem('widget.pendingApprovalsExpanded', String(pendingApprovalsExpanded));
  } catch {}
}, [pendingApprovalsExpanded]);
```

## Step 6: Add Position Persistence (Optional)

If your widget is draggable, update the drag end handler:

```tsx
const handleDragEnd = (event: any, info: any) => {
  setIsDragging(false);
  const newPosition = { x: info.point.x, y: info.point.y };
  setWidgetPosition(newPosition); // This now persists!
};
```

## Complete Mapping Guide

| Old State Variable | New State Path |
|-------------------|----------------|
| `isExpanded` | `isExpanded` |
| `activeBookingsExpanded` | `categories.activeBookings` |
| `pendingApprovalsExpanded` | `categories.pendingApprovals` |
| `pendingReviewsExpanded` | `categories.pendingReviews` |
| `rejectedBookingsExpanded` | `categories.rejectedBookings` |
| `cancelledBookingsExpanded` | `categories.cancelledBookings` |
| `expiredBookingsExpanded` | `categories.expiredBookings` |

| Old Setter | New Setter |
|------------|------------|
| `setIsExpanded` | `setIsExpanded` |
| `setActiveBookingsExpanded` | `setCategoryExpanded('activeBookings', value)` |
| `setPendingApprovalsExpanded` | `setCategoryExpanded('pendingApprovals', value)` |
| `setPendingReviewsExpanded` | `setCategoryExpanded('pendingReviews', value)` |
| `setRejectedBookingsExpanded` | `setCategoryExpanded('rejectedBookings', value)` |
| `setCancelledBookingsExpanded` | `setCategoryExpanded('cancelledBookings', value)` |
| `setExpiredBookingsExpanded` | `setCategoryExpanded('expiredBookings', value)` |

## Testing the Integration

1. **Open Browser DevTools Console** - You'll see logs like:
   ```
   [PersistentWidget] Initializing with default state
   [PersistentWidget] Saved state to localStorage: {...}
   [PersistentWidget] Loaded state from localStorage: {...}
   ```

2. **Check localStorage in DevTools**:
   - Go to Application/Storage > Local Storage
   - Look for key: `booking-widget-state`
   - You should see your saved state

3. **Test Persistence**:
   - Toggle some categories
   - Refresh the page (Cmd+R or F5)
   - States should be preserved

4. **Test Cross-Tab Sync**:
   - Open your app in two tabs
   - Toggle a category in one tab
   - It should instantly update in the other tab

## Troubleshooting

If states are not persisting after page refresh:

1. **Check Console for Errors** - Look for any localStorage errors
2. **Verify localStorage is Enabled** - Some browsers block it in private mode
3. **Check the Storage Key** - Make sure you're using the same key everywhere
4. **Clear localStorage** - Try `localStorage.clear()` in console and refresh

## Benefits

✅ **Automatic Persistence** - No manual localStorage code needed
✅ **Type Safety** - Full TypeScript support
✅ **Cross-Tab Sync** - Changes sync across all open tabs
✅ **Performance** - Debounced saves prevent excessive writes
✅ **Error Handling** - Gracefully handles localStorage issues
✅ **Position Memory** - Widget position is also persisted