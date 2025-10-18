# Map Interaction Reset Fix

## Problem

When users interacted with the map (zoom, pan), the map would reset to the default view instead of maintaining their position. This created a frustrating user experience where users couldn't explore the map freely.

## Root Cause

The issue was a **circular dependency** in the venue filtering logic:

1. User pans/zooms the map
2. Map bounds change (e.g., north: 41.8, south: 41.6, etc.)
3. `handleBoundsChange` updates `mapBounds` state
4. `filteredVenuesMemo` recalculates, filtering venues by new bounds
5. Filtered venue array (with new reference) is passed back to map
6. Map component receives "new" props (different venue array)
7. Map re-renders and potentially resets view

### The Circular Dependency

```
Map Interaction → Bounds Change → Filter Venues → New Array → Map Re-render → Reset View
                                                                      ↑                ↓
                                                                      └────────────────┘
```

## Solution

**Separate the venue list for display from the venue list for the map:**

### Before (Problematic)
```typescript
// Single list used for both map AND display - creates circular dependency
const filteredVenuesMemo = useMemo(() => {
  // Filter by map bounds
  if (mapBounds) {
    return filteredVenues.filter(venue => isInBounds(venue, mapBounds));
  }
  return filteredVenues;
}, [filteredVenues, mapBounds]);

// Both map and list use the same filtered array
<GoogleMapsWrapper venues={filteredVenuesMemo} />
<VenueList venues={filteredVenuesMemo} />
```

### After (Fixed)
```typescript
// Separate list for DISPLAY ONLY - filtered by map bounds
const filteredVenuesForList = useMemo(() => {
  // Only filter LIST when map bounds are available
  if (mapBounds) {
    return filteredVenues.filter(venue => isInBounds(venue, mapBounds));
  }
  return filteredVenues;
}, [filteredVenues, mapBounds]);

// Map gets ALL filtered venues (not filtered by bounds)
// List gets venues filtered by bounds
<GoogleMapsWrapper venues={filteredVenues} />  // <-- Full list
<VenueList venues={filteredVenuesForList} />   // <-- Bounds-filtered list
```

## Key Changes

1. **Renamed** `filteredVenuesMemo` → `filteredVenuesForList` (clarity)
2. **Map receives** `filteredVenues` (full list matching search/filters)
3. **List receives** `filteredVenuesForList` (filtered by map bounds when in split/map view)
4. **Broke the circular dependency** - map bounds no longer affect the venue array passed to the map

## Benefits

✅ Map maintains user's position when zooming/panning
✅ Map only re-renders when search/filter criteria actually change  
✅ List updates to show only venues visible in current map bounds
✅ No circular re-render loops
✅ Better performance - fewer unnecessary renders

## User Experience

**Before:**
- User zooms in on specific area → Map resets to default view ❌
- User pans to explore → Map jumps back ❌
- Frustrating and unusable

**After:**  
- User zooms in → Map stays zoomed in ✅
- User pans → Map maintains position ✅
- List updates to show venues in visible area ✅
- Smooth, expected behavior

## Technical Details

The React.memo optimization on `GoogleMapsWrapper` and `AirbnbStyleMap` compares venue arrays by IDs. When bounds filtering created a different set of IDs (different venues in view), React.memo correctly determined props had changed and re-rendered the map. By keeping the venue list stable (full list to map, bounds-filtered list only to display), we prevent these unnecessary re-renders.

## Files Modified

- `src/pages/SearchResults.tsx` - Split venue filtering logic
