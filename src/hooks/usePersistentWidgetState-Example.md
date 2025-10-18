# Persistent Widget State Integration Guide

## Overview
The `usePersistentWidgetState` hook provides automatic localStorage persistence for your booking widget's expand/collapse states, with cross-tab synchronization and comprehensive error handling.

## Installation

### 1. Install the Hook
The hook is already created at: `/src/hooks/usePersistentWidgetState.ts`

### 2. Integration with CurrentBookingDisplay

Replace the existing state management in `CurrentBookingDisplay.tsx` with the persistent hook:

```tsx
// Remove these old state declarations:
// const [isExpanded, setIsExpanded] = useState(true);
// const [activeBookingsExpanded, setActiveBookingsExpanded] = useState(true);
// const [pendingApprovalsExpanded, setPendingApprovalsExpanded] = useState(true);
// etc...

// Replace with:
import { usePersistentWidgetState } from '@/hooks/usePersistentWidgetState';

// Inside your component:
const {
  isExpanded,
  categories,
  widgetPosition,
  setIsExpanded,
  setCategoryExpanded,
  setWidgetPosition,
  isCategoryExpanded,
} = usePersistentWidgetState({
  storageKey: 'booking-widget-state',
  syncAcrossTabs: true,
  debounceMs: 500,
});

// Update toggle handlers:
const toggleCategory = (category: keyof typeof categories) => {
  setCategoryExpanded(category, !categories[category]);
};

// Use in your JSX:
<button onClick={() => toggleCategory('activeBookings')}>
  {categories.activeBookings ? <ChevronUp /> : <ChevronDown />}
</button>
```

## Features

### 1. Automatic Persistence
- States are automatically saved to localStorage
- Survives page refreshes and browser restarts
- Debounced saves for performance (default: 500ms)

### 2. Cross-Tab Synchronization
- Changes in one tab instantly reflect in all other tabs
- Uses both storage events and custom events
- Ensures consistent state across the application

### 3. TypeScript Support
- Full type safety with TypeScript interfaces
- IntelliSense support for all properties
- Type-safe category names

### 4. Error Handling
- Gracefully handles localStorage unavailability
- Validates stored data structure
- Falls back to defaults on corruption

### 5. Widget Position Persistence
- Saves drag position of the widget
- Validates position on viewport resize
- Ensures widget remains visible

## API Reference

### Hook Options

```typescript
interface UsePersistentWidgetStateOptions {
  storageKey?: string;        // localStorage key (default: 'booking-widget-state')
  defaultState?: Partial<BookingWidgetState>;  // Custom defaults
  syncAcrossTabs?: boolean;   // Enable cross-tab sync (default: true)
  debounceMs?: number;        // Save debounce delay (default: 500ms)
}
```

### Returned Values

```typescript
const {
  // Current state values
  isExpanded: boolean,
  categories: {
    activeBookings: boolean,
    pendingApprovals: boolean,
    pendingReviews: boolean,
    rejectedBookings: boolean,
    cancelledBookings: boolean,
    expiredBookings: boolean,
  },
  widgetPosition?: { x: number, y: number },

  // State setters
  setIsExpanded: (expanded: boolean) => void,
  setCategoryExpanded: (category: string, expanded: boolean) => void,
  setCategoriesExpanded: (updates: Partial<categories>) => void,
  setWidgetPosition: (position: { x: number, y: number }) => void,

  // Utility functions
  resetState: () => void,  // Reset to defaults
  isCategoryExpanded: (category: string) => boolean,  // Check category state

  // Full state access
  state: BookingWidgetState,
  setState: (newState: Partial<BookingWidgetState>) => void,
} = usePersistentWidgetState(options);
```

## Usage Examples

### Basic Usage

```tsx
function BookingWidget() {
  const { isExpanded, setIsExpanded, categories, setCategoryExpanded } =
    usePersistentWidgetState();

  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>

      {isExpanded && (
        <div>
          <button onClick={() => setCategoryExpanded('activeBookings', !categories.activeBookings)}>
            Active Bookings {categories.activeBookings ? '▲' : '▼'}
          </button>
          {/* ... */}
        </div>
      )}
    </div>
  );
}
```

### With Custom Defaults

```tsx
const { ... } = usePersistentWidgetState({
  defaultState: {
    isExpanded: false,  // Start collapsed
    categories: {
      activeBookings: true,
      pendingApprovals: false,  // Start with pending hidden
      // ... other categories
    },
  },
});
```

### Batch Updates

```tsx
// Update multiple categories at once
setCategoriesExpanded({
  activeBookings: true,
  pendingApprovals: true,
  rejectedBookings: false,
});
```

### Reset to Defaults

```tsx
<button onClick={resetState}>
  Reset Widget Settings
</button>
```

## Migration Guide

### From useState to usePersistentWidgetState

**Before:**
```tsx
const [isExpanded, setIsExpanded] = useState(true);
const [activeBookingsExpanded, setActiveBookingsExpanded] = useState(true);
// ... more states

// Toggle handler
const toggleActive = () => setActiveBookingsExpanded(!activeBookingsExpanded);
```

**After:**
```tsx
const { isExpanded, setIsExpanded, categories, setCategoryExpanded } =
  usePersistentWidgetState();

// Toggle handler
const toggleActive = () => setCategoryExpanded('activeBookings', !categories.activeBookings);
```

## Testing

### Manual Testing Checklist

1. **Persistence Test**
   - Expand/collapse categories
   - Refresh the page
   - ✓ States should be preserved

2. **Cross-Tab Test**
   - Open app in multiple tabs
   - Change state in one tab
   - ✓ Changes should appear in all tabs

3. **Position Test**
   - Drag widget to new position
   - Refresh the page
   - ✓ Position should be preserved

4. **Error Recovery Test**
   - Clear localStorage
   - Corrupt localStorage data
   - ✓ App should use defaults

5. **Performance Test**
   - Rapidly toggle states
   - ✓ Should debounce saves
   - ✓ UI should remain responsive

## Troubleshooting

### States Not Persisting

1. Check browser localStorage support:
```javascript
console.log(localStorage.getItem('booking-widget-state'));
```

2. Check for localStorage quota errors in console

3. Verify the storage key isn't conflicting

### Cross-Tab Sync Not Working

1. Ensure `syncAcrossTabs: true` is set
2. Check browser supports storage events
3. Verify same origin/domain

### Widget Position Issues

1. Position is validated on viewport resize
2. Saved positions are clamped to visible area
3. Reset position with `setWidgetPosition(undefined)`

## Browser Compatibility

- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support (14+)
- Mobile browsers: ✓ Full support

## Performance Considerations

- States are debounced (default 500ms)
- JSON parsing is optimized
- Event listeners are cleaned up
- No memory leaks

## Security Notes

- Data is stored in localStorage (client-side only)
- No sensitive information should be stored
- States are user-specific (browser-based)
- Clear on logout if needed:

```tsx
// On logout
localStorage.removeItem('booking-widget-state');
```