# Debugging Double Render Issue

## How to Test

1. Open the development server at `http://localhost:8082/`
2. Navigate to the search page (split or map view)
3. Open browser developer console
4. Type something in the search field (e.g., "restaurant")
5. Watch the console logs to see the exact flow

## Expected Console Log Flow (Single Render - v2 with Batching)

When you type "restaurant" and stop, you should see:

```
🎮 gameSearch: STARTING for query: restaurant
🔍 searchResults: [timestamp1] useMemo triggered - gameInProgress: true
🔍 searchResults: [timestamp1] Waiting for game search to complete...
🔄 useEffect triggered: [timestamp1] - gameInProgress: true
🌐 useVenueSearch: Waiting for game search to complete before updating pages

🎮 gameSearch: COMPLETED - found X game-based venues  
🔍 searchResults: [timestamp2] useMemo triggered - gameInProgress: false
🔍 searchResults: [timestamp2] CALCULATING RESULTS for: restaurant venues: Y gameResults: X
🔍 searchResults: [timestamp2] RETURNING Z results
🔄 useEffect triggered: [timestamp2] - gameInProgress: false
🌐 useVenueSearch: [timestamp2] BATCHED UPDATE - pages with Z filtered venues
🏢 SearchResults: [timestamp2] Header search callback triggered with Z venues
🗺️ filteredVenuesMemo: Processing Z venues for viewMode: split
```

Key points:
- Only ONE "BATCHED UPDATE" should appear
- No duplicate "CALCULATING RESULTS" with the same timestamp
- The batching delay (50ms) prevents rapid successive updates

## If Double Render Still Occurs

You might see duplicate logs with different timestamps:

```
🔍 searchResults: [timestamp1] CALCULATING RESULTS...
🔍 searchResults: [timestamp1] RETURNING Z results
🌐 useVenueSearch: [timestamp1] Calling search page callback
🏢 SearchResults: [timestamp1] Header search callback triggered...

[Shortly after]

🔍 searchResults: [timestamp2] CALCULATING RESULTS...  # <- DUPLICATE!
🔍 searchResults: [timestamp2] RETURNING Z results     # <- DUPLICATE!
🌐 useVenueSearch: [timestamp2] Calling search page callback  # <- DUPLICATE!
🏢 SearchResults: [timestamp2] Header search callback triggered...  # <- DUPLICATE!
```

This would indicate there's still another source causing the search results to recalculate.

## Potential Remaining Issues

If double render persists, check:
1. Are there multiple instances of `useVenueSearch` running?
2. Is the `globalSearchState` being modified from multiple places?
3. Are there other useEffects in SearchResults causing re-renders?
4. Is the debounced search triggering multiple times?

The timestamps in the logs will help identify which component/hook is causing the duplicate renders.
