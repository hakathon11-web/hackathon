import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVenues, Venue } from './useVenues';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { analyticsEvents } from '@/lib/analytics';
import { useDebouncedSearch } from './useDebouncedSearch';
import { isVenueOpenNow } from '@/utils/workingHours';

/**
 * Global search state for sharing between header, main page, and search page
 * 
 * This enables unified search functionality across the application:
 * - Header search bar triggers filtering on both main page and search page
 * - Live filtering provides real-time results as user types
 * - Search button locks results and stops live filtering
 * - Clear search resets all pages to show all venues
 */
const globalSearchState = {
  searchQuery: '',
  isLiveFiltering: true,
  onMainPageFilterChange: null as ((venues: Venue[]) => void) | null,
  onSearchPageFilterChange: null as ((venues: Venue[]) => void) | null
};

export const useVenueSearch = (options?: { isMainPageSearch?: boolean; isSearchPageSearch?: boolean }) => {
  // Use debounced search to separate input state from search execution
  const { 
    inputValue: searchQuery, 
    debouncedValue: debouncedSearchQuery, 
    isDebouncing,
    setInputValue: setSearchQuery, 
    setValue: setSearchQueryImmediate,
    executeImmediateSearch 
  } = useDebouncedSearch(globalSearchState?.searchQuery || '', 300);

  const [isSearching, setIsSearching] = useState(false);
  const [isLiveFiltering, setIsLiveFiltering] = useState(globalSearchState?.isLiveFiltering || true);
  const [gameBasedResults, setGameBasedResults] = useState<Venue[]>([]);
  const { data: venues, isLoading } = useVenues(); // Get all venues
  const isMainPageSearch = options?.isMainPageSearch || false;
  const isSearchPageSearch = options?.isSearchPageSearch || false;

  // Fetch minimal mapping of venue -> service names for client-side matching
  const { data: servicesIndex } = useQuery({
    queryKey: ['venue-services-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_services')
        .select('venue_id, name, services:service_id(name)');
      if (error) throw error;
      return data as Array<{ venue_id: string; name: string | null; services: { name: string | null } | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Track if game search is in progress to prevent intermediate renders
  const [gameSearchInProgress, setGameSearchInProgress] = useState(false);
  
  // Ref to track if we should batch updates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for venues by game names in services - now uses debounced value
  useEffect(() => {
    const searchByGames = async () => {
      if (!debouncedSearchQuery.trim() || debouncedSearchQuery.length < 2) {
        setGameBasedResults([]);
        setGameSearchInProgress(false);
        return;
      }

      setGameSearchInProgress(true);
 
      try {
        const like = `%${debouncedSearchQuery}%`;

        // 1) Direct matches on venue_services.name
        const { data: vsByName, error: vsByNameErr } = await supabase
          .from('venue_services')
          .select('venue_id')
          .ilike('name', like);
        if (vsByNameErr) throw vsByNameErr;

        // 2) Matches on services.name -> get service ids first
        const { data: svcMatches, error: svcErr } = await supabase
          .from('services')
          .select('id')
          .ilike('name', like);
        if (svcErr) throw svcErr;

        let vsByServiceIds: { venue_id: string }[] = [];
        if (svcMatches && svcMatches.length > 0) {
          const svcIds = svcMatches.map(s => s.id);
          const { data: vsBySvc, error: vsBySvcErr } = await supabase
            .from('venue_services')
            .select('venue_id')
            .in('service_id', svcIds);
          if (vsBySvcErr) throw vsBySvcErr;
          vsByServiceIds = vsBySvc || [];
        }

        const venueIdSet = new Set<string>();
        (vsByName || []).forEach(r => venueIdSet.add(r.venue_id));
        (vsByServiceIds || []).forEach(r => venueIdSet.add(r.venue_id));

        // Map to existing venues from useVenues (keeps consistent typing/fields)
        const venuesFromServices = (venues || []).filter(v => venueIdSet.has(v.id));
 
        // Remove duplicates
        const uniqueVenues = venuesFromServices.filter((venue, index, arr) => 
          arr.findIndex(v => v.id === venue.id) === index);
 
        setGameBasedResults(uniqueVenues as Venue[]);
        setGameSearchInProgress(false);
      } catch (error) {
        console.error('🎮 gameSearch: ERROR', error);
        setGameBasedResults([]);
        setGameSearchInProgress(false);
      }
    };
 
    // No need for manual debouncing since we're using debouncedSearchQuery
    searchByGames();
  }, [debouncedSearchQuery, venues]);

  const searchResults = useMemo(() => {
    const timestamp = Date.now();
    
    if (!debouncedSearchQuery.trim() || !venues) {
      return [];
    }
    
    // Wait for game search to complete to prevent double renders
    if (gameSearchInProgress) {
      return [];
    }
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    // Search in venue names, locations, and districts
    const nameLocationResults = venues.filter((venue: Venue) => {
      const nameMatch = venue.name.toLowerCase().includes(query);
      const locationMatch = venue.location.toLowerCase().includes(query);
      const districtMatch = venue.district?.toLowerCase().includes(query);
      
      return nameMatch || locationMatch || districtMatch;
    });

    // Service-name matches (from servicesIndex)
    const serviceMatchVenueIds = new Set<string>();
    if (servicesIndex && servicesIndex.length > 0) {
      servicesIndex.forEach((row) => {
        const svcName = (row.name || '').toLowerCase();
        const svcTypeName = (row.services?.name || '').toLowerCase();
        if (svcName.includes(query) || svcTypeName.includes(query)) {
          serviceMatchVenueIds.add(row.venue_id);
        }
      });
    }
 
    // Combine results and remove duplicates
    const combinedMap = new Map<string, Venue>();
    nameLocationResults.forEach(v => combinedMap.set(v.id, v));
 
    // Add venues matching service names (client-side index)
    venues.forEach((v) => {
      if (serviceMatchVenueIds.has(v.id)) {
        combinedMap.set(v.id, v);
      }
    });
 
    // Add venues from server-side service search (gameBasedResults)
    gameBasedResults.forEach(gameVenue => {
      combinedMap.set(gameVenue.id, gameVenue);
    });
 
    const merged = Array.from(combinedMap.values());
 
    // Scoring: prioritize open/closed status first, then exact name matches and service matches
    const sortedFull = merged.sort((a, b) => {
      // First, sort by open/closed status (open venues first)
      const aOpen = isVenueOpenNow(a.working_hours);
      const bOpen = isVenueOpenNow(b.working_hours);
      if (aOpen !== bOpen) {
        return aOpen ? -1 : 1; // Open venues come first
      }
      
      // Within the same open/closed group, sort by relevance score
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aNameExact = aName === query ? 2 : (aName.includes(query) ? 1 : 0);
      const bNameExact = bName === query ? 2 : (bName.includes(query) ? 1 : 0);
      const aService = serviceMatchVenueIds.has(a.id) ? 1 : 0;
      const bService = serviceMatchVenueIds.has(b.id) ? 1 : 0;
      const aScore = aNameExact * 10 + aService * 5 + (a.rating || 0);
      const bScore = bNameExact * 10 + bService * 5 + (b.rating || 0);
      return bScore - aScore;
    });
 
    return sortedFull;
  }, [debouncedSearchQuery, venues, gameBasedResults, servicesIndex, gameSearchInProgress]);

  // Limited list for header dropdown; full list used for page filtering
  const searchResultsLimited = useMemo(() => {
    // Show results only when debounced search has completed and game search is done
    if (!debouncedSearchQuery.trim() || gameSearchInProgress) return [] as Venue[];
    return isMainPageSearch ? searchResults : searchResults.slice(0, 8);
  }, [searchResults, debouncedSearchQuery, isMainPageSearch, gameSearchInProgress]);

  // Sync with global state and trigger page updates
  useEffect(() => {
    const effectTimestamp = Date.now();
    
    if (!globalSearchState) return;
    
    if (isMainPageSearch) {
      // Register main page filter callback
      globalSearchState.onMainPageFilterChange = (filteredVenues: Venue[]) => {
        // This will be called from header search to update main page
      };
    } else if (isSearchPageSearch) {
      // Register search page filter callback
      globalSearchState.onSearchPageFilterChange = (filteredVenues: Venue[]) => {
        // This will be called from header search to update search page
      };
    } else {
      // Update global state from header search
      globalSearchState.searchQuery = debouncedSearchQuery;
      globalSearchState.isLiveFiltering = isLiveFiltering;
      
      // If live filtering is enabled, update both main page and search page (use FULL results)
      // Batch updates to prevent multiple rapid calls
      if (isLiveFiltering) {
        // Clear any existing timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Wait for game search to complete before updating
        if (gameSearchInProgress) {
          return;
        }
        
        // Batch the update with a small delay to catch any rapid successive changes
        updateTimeoutRef.current = setTimeout(() => {
          const filteredVenues = debouncedSearchQuery.trim() ? searchResults : venues || [];
          
          const updateTimestamp = Date.now();
          
          if (globalSearchState.onMainPageFilterChange) {
            globalSearchState.onMainPageFilterChange(filteredVenues);
          }
          
          if (globalSearchState.onSearchPageFilterChange) {
            globalSearchState.onSearchPageFilterChange(filteredVenues);
          }
          
          updateTimeoutRef.current = null;
        }, 50); // Small delay to batch rapid updates
      }
    }
  }, [debouncedSearchQuery, searchResults, isLiveFiltering, isMainPageSearch, isSearchPageSearch, venues, gameSearchInProgress]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
    
    // Re-enable live filtering when user types again
    if (!isLiveFiltering && query !== searchQuery) {
      setIsLiveFiltering(true);
      if (globalSearchState) {
        globalSearchState.isLiveFiltering = true;
      }
    }
  }, [searchQuery, isLiveFiltering, setSearchQuery]);

  const handleSearchButtonClick = useCallback(() => {
    // Execute immediate search to bypass debouncing
    executeImmediateSearch();
    
    setIsLiveFiltering(false);
    if (globalSearchState) {
      globalSearchState.isLiveFiltering = false;
    }
    
    // Lock the current search results on both main page and search page (use FULL results)
    const currentResults = searchQuery.trim() ? searchResults : venues || [];
    
    if (globalSearchState?.onMainPageFilterChange) {
      globalSearchState.onMainPageFilterChange(currentResults);
    }
    
    if (globalSearchState?.onSearchPageFilterChange) {
      globalSearchState.onSearchPageFilterChange(currentResults);
    }
    
    // Track search event
    if (searchQuery.trim()) {
      analyticsEvents.search(searchQuery.trim(), currentResults.length);
    }
    
    // Don't clear the search query - just exit typing mode
    // The search input keeps its text, but live filtering stops
  }, [executeImmediateSearch, searchQuery, searchResults, venues]);

  const clearSearch = useCallback(() => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    setSearchQueryImmediate('');  // Clear both input and debounced value immediately
    setIsSearching(false);
    setIsLiveFiltering(true);
    setGameBasedResults([]);
    setGameSearchInProgress(false);  // Reset game search state
    if (globalSearchState) {
      globalSearchState.searchQuery = '';
      globalSearchState.isLiveFiltering = true;
    }
    
    // Reset both main page and search page to show all venues
    if (venues && globalSearchState) {
      if (globalSearchState.onMainPageFilterChange) {
        globalSearchState.onMainPageFilterChange(venues);
      }
      if (globalSearchState.onSearchPageFilterChange) {
        globalSearchState.onSearchPageFilterChange(venues);
      }
    }
  }, [setSearchQueryImmediate, venues]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const registerMainPageCallback = (callback: (venues: Venue[]) => void) => {
    if (globalSearchState) {
      globalSearchState.onMainPageFilterChange = callback;
    }
  };

  const registerSearchPageCallback = (callback: (venues: Venue[]) => void) => {
    if (globalSearchState) {
      globalSearchState.onSearchPageFilterChange = callback;
    }
  };

  return {
    searchQuery,
    searchResults: searchResultsLimited,
    searchResultsFull: searchResults,
    isSearching: isSearching || isDebouncing || gameSearchInProgress,  // Show loading state while debouncing or game searching
    isLiveFiltering,
    isLoading,
    isDebouncing: isDebouncing || gameSearchInProgress,  // Include game search in debouncing state
    handleSearch,
    handleSearchButtonClick,
    clearSearch,
    registerMainPageCallback,
    registerSearchPageCallback
  };
};