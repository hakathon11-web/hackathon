# Seat Reorder & Rename - Visual Demo

## What It Looks Like

### Normal View (Always Visible Controls)
```
┌────────────────────────────────────────┐
│ Resources                               │
├────────────────────────────────────────┤
│ 🟦 Pool                                │
│ ────────────────────────────────────   │
│ Pool 1 ✏️  ⬆️                          │
│                ⬇️                       │
│ Pool 2 ✏️  ⬆️                          │
│                ⬇️                       │
│ Pool 3 ✏️  ⬆️                          │
│                ⬇️                       │
└────────────────────────────────────────┘
```

**Note:** The pencil icon (✏️) and arrow buttons are **always visible** - no hover required!

### Editing Name
```
┌────────────────────────────────────────┐
│ Resources                               │
├────────────────────────────────────────┤
│ 🟦 Pool                                │
│ ────────────────────────────────────   │
│ [VIP Table        ] ✅ ❌  ⬆️          │
│                            ⬇️           │
│ Pool 2 ✏️  ⬆️                          │
│                ⬇️                       │
│ Pool 3 ✏️  ⬆️                          │
│                ⬇️                       │
└────────────────────────────────────────┘
```

### After Save
```
┌────────────────────────────────────────┐
│ Resources                               │
├────────────────────────────────────────┤
│ 🟦 Pool                                │
│ ────────────────────────────────────   │
│ VIP Table                               │
│ Pool 2                                  │
│ Pool 3                                  │
└────────────────────────────────────────┘
```

## Click Behavior

### Seat Cell Click Zones
```
┌──────────────────────────────────┐
│ [Seat Name Text]  ✏️  ⬆️         │
│     ▲              ▲   ▲  ⬇️     │
│     │              │   │   ▲      │
│     │              │   │   │      │
│     └─Quick Add    │   │   └─Reorder Down
│                    │   └─Reorder Up
│                    └─Edit Name
└──────────────────────────────────┘
```

**Click Actions:**
- **Seat name text** → Opens quick event add form
- **Pencil icon (✏️)** → Starts rename editing
- **Up arrow (⬆️)** → Moves seat up
- **Down arrow (⬇️)** → Moves seat down
- **Empty space** → Opens quick event add form

This allows efficient workflows:
- Quick event creation: Click the seat name
- Rename seat: Click the pencil icon
- Reorder seats: Click the arrows

### Rename Flow
1. **Click pencil icon (✏️)** → Input field appears with Save (✅) and Cancel (❌) buttons
2. **Type** new name
3. **Press Enter** or **Click ✅** → Saves and shows toast: "Seat renamed successfully"
4. **Press Escape** or **Click ❌** → Cancels changes

**Important:** 
- Clicking the seat name text → Opens **quick event add** form
- Only clicking the **pencil icon** → Starts editing the name
- This design allows both quick event creation AND explicit renaming

### Reorder Flow
1. **Click ⬆️** → Moves seat up one position (swaps with seat above)
2. **Click ⬇️** → Moves seat down one position (swaps with seat below)
3. Changes save automatically with optimistic updates
4. Toast appears: "Seat position updated - Moved [Name] up/down"

## Visual States

### Arrow Button States

**Normal (Enabled)**
```
⬆️  - Gray color, hover turns blue
⬇️  - Gray color, hover turns blue
```

**Hover (Enabled)**
```
⬆️  - Blue background, blue icon
⬇️  - Blue background, blue icon
```

**Disabled**
```
⬆️  - Light gray, reduced opacity, no hover effect
⬇️  - Light gray, reduced opacity, no hover effect
```

### Rules for Disabled Arrows
- **Top arrow (⬆️)** disabled when seat is first in its service group
- **Bottom arrow (⬇️)** disabled when seat is last in its service group
- Arrows only work within the same service group (can't move Pool seat into Sauna group)

## Real Example

### Initial State (Default Order)
```
┌─────────────────────────────────────────────────┐
│ 🟦 Pool                                         │
│ ────────────────────────────────────────────    │
│ Pool 1                                          │
│ Pool 2                                          │
│ Pool 3                                          │
│                                                 │
│ 🟩 Sauna                                        │
│ ────────────────────────────────────────────    │
│ Sauna 1                                         │
│ Sauna 2                                         │
└─────────────────────────────────────────────────┘
```

### After Customization
```
┌─────────────────────────────────────────────────┐
│ 🟦 Pool                                         │
│ ────────────────────────────────────────────    │
│ VIP Pool                      (was Pool 3)      │
│ Family Pool                   (was Pool 1)      │
│ Regular Pool                  (was Pool 2)      │
│                                                 │
│ 🟩 Sauna                                        │
│ ────────────────────────────────────────────    │
│ Steam Room                    (was Sauna 2)     │
│ Finnish Sauna                 (was Sauna 1)     │
└─────────────────────────────────────────────────┘
```

## Technical Details

### Data Storage
```json
{
  "seatNames": {
    "venue-abc-seat-1": "Family Pool",
    "venue-abc-seat-2": "Regular Pool",
    "venue-abc-seat-3": "VIP Pool",
    "venue-xyz-seat-1": "Finnish Sauna",
    "venue-xyz-seat-2": "Steam Room"
  },
  "seatPositions": {
    "venue-abc-seat-3": 0,  // VIP Pool is now first
    "venue-abc-seat-1": 1,  // Family Pool is second
    "venue-abc-seat-2": 2,  // Regular Pool is third
    "venue-xyz-seat-2": 0,  // Steam Room is now first
    "venue-xyz-seat-1": 1   // Finnish Sauna is second
  }
}
```

### Sorting Algorithm
1. Group seats by service
2. Within each service, sort by custom position (if exists)
3. If no custom position, use original seat number from database
4. Never allow cross-service reordering

## Color Scheme

### Light Mode
- **Pencil Icon**: Blue (#3b82f6)
- **Arrow Icons**: Gray (#6b7280) → Blue on hover (#3b82f6)
- **Arrow Background**: Transparent → Light blue on hover (rgba(59, 130, 246, 0.1))
- **Save Button**: Green checkmark (#10b981)
- **Cancel Button**: Red X (#ef4444)

### Dark Mode
- **Pencil Icon**: Light Blue (#60a5fa)
- **Arrow Icons**: Light Gray (#9ca3af) → Light Blue on hover (#60a5fa)
- **Arrow Background**: Transparent → Dark blue on hover (rgba(59, 130, 246, 0.2))
- **Save Button**: Light Green checkmark
- **Cancel Button**: Light Red X

## Accessibility

- All buttons have proper `title` attributes for tooltips
- Keyboard navigation supported for name editing (Enter/Escape)
- Disabled states clearly indicated
- Color contrast meets WCAG AA standards
- Screen reader friendly (semantic HTML)

## Performance

- **Optimistic Updates**: UI updates **instantly** - no waiting for server response
  - Seat moves immediately when you click the arrow
  - Database update happens in the background
  - If the database update fails, changes automatically revert
- **Automatic Rollback**: Failed updates restore previous state seamlessly
- **Cache Invalidation**: Automatic refresh of calendar data after successful changes
- **Debouncing**: Not needed - changes only happen on explicit button clicks
- **Real-time**: Changes persist across page reloads and sessions
- **Console Logging**: Debug logs show optimistic update flow:
  - `🎯 Optimistically moved [Name] [direction]` - Immediate UI update
  - `✅ Database updated successfully for [Name]` - Background save complete
  - `❌ Failed to update seat position in database` - Error with rollback

## Optimistic Update Flow

```
User clicks ⬆️ arrow
    ↓
🎯 Instant UI Update (0ms)
    │
    ├─→ Seat moves up immediately
    │   Calendar re-renders with new order
    │   User sees change instantly
    │
    └─→ Background Database Save
        │
        ├─→ Success ✅
        │   Toast: "Seat position updated"
        │   No visual change (already updated)
        │
        └─→ Failure ❌
            Toast: "Failed to move seat - Changes have been reverted"
            UI automatically reverts to previous state
            User sees seat move back to original position
```

