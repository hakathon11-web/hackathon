import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useVenues } from "@/hooks/useVenues";
import { useVenuesInfinite } from "@/hooks/useVenuesInfinite";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useVenueSearch } from "@/hooks/useVenueSearch";
import VenueCard from "@/components/VenueCard";
import VenueCardSkeleton from "@/components/VenueCardSkeleton";
import VenueListSkeleton from "@/components/VenueListSkeleton";
import GoogleMapsWrapper from "@/components/GoogleMapsWrapper";
import MobileVenueCard from "@/components/MobileVenueCard";
import DesktopVenueCard from "@/components/DesktopVenueCard";
import MemoizedVenueList from "@/components/MemoizedVenueList";
import { analyticsEvents } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Grid3x3, RotateCcw, Navigation, Filter, X, Maximize2, Minimize2, LayoutGrid, Map as MapIcon } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";
import type { Venue } from "@/hooks/useVenues";
import InlineFilters from "@/components/InlineFilters";
import MobileFilterDrawer, { MobileFilterActions } from "@/components/MobileFilterDrawer";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { generateSearchResultsStructuredData, generateWebsiteStructuredData, generateOrganizationStructuredData } from "@/utils/structuredData";

// Generate stable coordinates for venues (same logic as AirbnbStyleMap)
const getVenueCoordinates = (venue: Venue) => {
  if (venue.latitude && venue.longitude) {
    return { lat: venue.latitude, lng: venue.longitude };
  }

  const tbilisiBase = { lat: 41.7151, lng: 44.8271 };
  const districts: { [key: string]: { lat: number; lng: number } } = {
    'გლდანი': { lat: 41.7789, lng: 44.8144 },
    'ისანი': { lat: 41.7033, lng: 44.8144 },
    'კრწანისი': { lat: 41.6725, lng: 44.8271 },
    'ნაძალადევი': { lat: 41.7578, lng: 44.7516 },
    'საბურთალო': { lat: 41.7325, lng: 44.7516 },
    'ჩუღურეთი': { lat: 41.7211, lng: 44.7737 },
    'მთაწმინდა': { lat: 41.6969, lng: 44.7909 },
    'ვაკე': { lat: 41.7070, lng: 44.7737 },
    'სამგორი': { lat: 41.6890, lng: 44.8600 },
    'დიდუბე': { lat: 41.7789, lng: 44.7916 }
  };

  if (districts[venue.district]) {
    const base = districts[venue.district];
    const hash = venue.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      lat: base.lat + (hash % 100 - 50) * 0.001,
      lng: base.lng + (hash % 100 - 50) * 0.001
    };
  }

  const hash = venue.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return {
    lat: tbilisiBase.lat + (hash % 200 - 100) * 0.002,
    lng: tbilisiBase.lng + (hash % 200 - 100) * 0.002
  };
};

const SearchResults = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Use infinite scroll for venues
  const { 
    venues, 
    isLoading, 
    isLoadingMore, 
    hasMore, 
    error, 
    loadMore, 
    reset 
  } = useVenuesInfinite({ pageSize: 12 });
  
  // Infinite scroll setup
  const { setElementRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
    threshold: 0.1,
    rootMargin: '100px'
  });
  
  const { 
    registerSearchPageCallback, 
    searchQuery, 
    searchResults,
    searchResultsFull,
    handleSearch, 
    handleSearchButtonClick, 
    clearSearch,
    isSearching 
  } = useVenueSearch({ isSearchPageSearch: true });

  // Mobile-specific search state to prevent double renders
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState<Venue[]>([]);
  const [mobileSearchDebounce, setMobileSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  
  // Initialize viewMode based on URL parameters and screen size
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialViewMode = urlParams.get('view') === 'map' && window.innerWidth < 1024 ? 'map' : 'list';
  
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>(initialViewMode);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Ensure page scrolls to top when search page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle screen resize to maintain proper view mode
  useEffect(() => {
    const handleResize = () => {
      // On mobile/tablet, ensure we don't show 'split' view
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('list');
      }
      // Exit fullscreen when screen becomes too small
      if (window.innerWidth < 768 && isFullscreenMap) {
        setIsFullscreenMap(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, isFullscreenMap]);

  // Set body attribute for mobile map view to force header hiding
  useEffect(() => {
    if (viewMode === 'map' && window.innerWidth < 1024) {
      document.body.setAttribute('data-mobile-map', 'true');
      // Also hide header directly as backup
      const header = document.querySelector('header');
      if (header) {
        header.style.display = 'none';
      }
    } else {
      document.body.removeAttribute('data-mobile-map');
      // Restore header
      const header = document.querySelector('header');
      if (header) {
        header.style.display = '';
      }
    }

    return () => {
      document.body.removeAttribute('data-mobile-map');
      const header = document.querySelector('header');
      if (header) {
        header.style.display = '';
      }
    };
  }, [viewMode]);

  // Responsive toggle logic
  const handleToggleView = useCallback(() => {
    if (window.innerWidth >= 1024) {
      // Desktop: Toggle between List and Split View
      setViewMode(prev => prev === 'list' ? 'split' : 'list');
    } else {
      // Mobile: Toggle between List and Map View
      setViewMode(prev => {
        const newMode = prev === 'list' ? 'map' : 'list';
        // Update URL via router so `location` updates (needed for header visibility)
        const search = newMode === 'map' ? '?view=map' : '';
        navigate({ pathname: location.pathname, search }, { replace: true });
        return newMode;
      });
    }
    setIsFullscreenMap(false);
  }, []);

  // Get current toggle state - always shows "Map" with map icon
  const getToggleState = useCallback(() => {
    const isDesktop = window.innerWidth >= 1024;
    
    if (isDesktop) {
      return {
        isActive: viewMode === 'split',
        icon: MapIcon,
        label: t('search.mapView')
      };
    } else {
      return {
        isActive: viewMode === 'map',
        icon: MapIcon,
        label: t('search.mapView')
      };
    }
  }, [viewMode, t]);

  // Toggle fullscreen map
  const toggleFullscreenMap = useCallback(() => {
    setIsFullscreenMap(prev => !prev);
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenMap) {
        setIsFullscreenMap(false);
      }
    };

    if (isFullscreenMap) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreenMap]);

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [hoveredVenue, setHoveredVenue] = useState<Venue | null>(null);
  const [desktopSelectedVenue, setDesktopSelectedVenue] = useState<Venue | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const mapBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  
  // Search and display state (local search removed - using header search)
  const [showFilters, setShowFilters] = useState(false);
  const { getCurrentLocation, loading: locationLoading, error: locationError, latitude: userLat, longitude: userLng } = useGeolocation();
  const routerLocation = useLocation();
  
  // Mobile venue card state
  const [currentMobileVenueIndex, setCurrentMobileVenueIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Filter state management
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [currentFilters, setCurrentFilters] = useState({
    services: [],
    location: []
  });

  // Simple mobile search function with debouncing to prevent excessive re-renders
  const handleMobileSearch = useCallback((query: string) => {
    setMobileSearchQuery(query);
    
    // Clear existing timeout
    if (mobileSearchDebounce) {
      clearTimeout(mobileSearchDebounce);
    }
    
    // If query is empty, clear results immediately
    if (!query.trim()) {
      setMobileSearchResults([]);
      return;
    }

    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      // Simple client-side search through filtered venues
      const searchLower = query.toLowerCase();
      const results = filteredVenues.filter(venue => 
        venue.name.toLowerCase().includes(searchLower) ||
        venue.location.toLowerCase().includes(searchLower) ||
        venue.district?.toLowerCase().includes(searchLower)
      );
      
      setMobileSearchResults(results);
    }, 300); // 300ms debounce delay

    setMobileSearchDebounce(timeoutId);
  }, [filteredVenues, mobileSearchDebounce]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mobileSearchDebounce) {
        clearTimeout(mobileSearchDebounce);
      }
    };
  }, [mobileSearchDebounce]);
  
  // Stabilize filteredVenues reference to prevent unnecessary map re-renders
  // Only create new array if venue IDs actually change
  const stableFilteredVenues = useMemo(() => {
    return filteredVenues;
  }, [
    // Only recompute if the venue IDs change, not the array reference
    filteredVenues.length,
    filteredVenues.map(v => v.id).join(',')
  ]);

  // For mobile map, use simple mobile search results when available, otherwise use filtered venues
  const mobileMapVenues = useMemo(() => {
    // Use mobile search results if we have a query and results
    if (mobileSearchQuery.trim() && mobileSearchResults.length > 0) {
      return mobileSearchResults;
    }
    // Return filtered venues when no search or no results
    return filteredVenues;
  }, [mobileSearchQuery, mobileSearchResults, filteredVenues]);

  // Fetch all venue services for filtering (must be declared before any usage)
  const { data: allVenueServices } = useQuery({
    queryKey: ['all-venue-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_services')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Track when results come from header search and store the base list
  const [headerSearchActive, setHeaderSearchActive] = useState(false);
  const headerBaseVenuesRef = useRef<Venue[]>([]);
  
  // Use refs to avoid stale closures in callback
  const currentFiltersRef = useRef(currentFilters);
  const allVenueServicesRef = useRef(allVenueServices);
  
  // Keep refs up to date
  useEffect(() => {
    currentFiltersRef.current = currentFilters;
  }, [currentFilters]);
  
  useEffect(() => {
    allVenueServicesRef.current = allVenueServices;
  }, [allVenueServices]);

  const applyFiltersToBase = useCallback((base: Venue[]) => {
    let filtered = base;
    
    const hasServiceFilter = currentFilters.services && currentFilters.services.length > 0;
    const hasLocationFilter = currentFilters.location && currentFilters.location.length > 0;

    // Apply services filter (OR logic within services)
    // This filters to venues that match ANY of the selected services
    if (hasServiceFilter && allVenueServices) {
      const venueIdsWithServices = allVenueServices
        .filter(service => {
          const serviceType = (service as any).services?.name || '';
          const serviceName = (service as any).name || '';
          return currentFilters.services.some((s: string) => {
            const sLower = s.toLowerCase();
            return serviceName.toLowerCase() === sLower ||
                   serviceName.toLowerCase().includes(sLower) ||
                   serviceType.toLowerCase().includes(sLower);
          });
        })
        .map(service => (service as { venue_id: string }).venue_id);

      // Filter venues to only those matching the service filter
      filtered = filtered.filter(venue => venueIdsWithServices.includes(venue.id));
    }

    // Apply location filter (OR logic within locations) - search by district only
    // This is applied to the already-filtered list (AND logic between categories)
    // If both filters are active, only venues that match BOTH will remain
    if (hasLocationFilter) {
      // Further filter the already filtered venues by location
      filtered = filtered.filter(venue => 
        currentFilters.location.some((location: string) => {
          return venue.district && venue.district.toLowerCase().includes(location.toLowerCase());
        })
      );
    }

    return filtered;
  }, [currentFilters, allVenueServices]);

  // Register search page callback for header search integration
  // This enables the header search bar to filter content on the search page
  useEffect(() => {
    registerSearchPageCallback((searchFilteredVenues) => {
      setHeaderSearchActive(true);
      headerBaseVenuesRef.current = searchFilteredVenues || [];
      
      // Apply filters using refs to avoid stale closures
      let filtered = searchFilteredVenues || [];
      
      if (allVenueServicesRef.current) {
        const hasServiceFilter = currentFiltersRef.current.services && currentFiltersRef.current.services.length > 0;
        const hasLocationFilter = currentFiltersRef.current.location && currentFiltersRef.current.location.length > 0;

        // Apply services filter
        if (hasServiceFilter) {
          const venueIdsWithServices = allVenueServicesRef.current
            .filter(service => {
              const serviceType = (service as any).services?.name || '';
              const serviceName = (service as any).name || '';
              return currentFiltersRef.current.services.some((s: string) => {
                const sLower = s.toLowerCase();
                return serviceName.toLowerCase() === sLower ||
                       serviceName.toLowerCase().includes(sLower) ||
                       serviceType.toLowerCase().includes(sLower);
              });
            })
            .map(service => (service as { venue_id: string }).venue_id);

          filtered = filtered.filter(venue => venueIdsWithServices.includes(venue.id));
        }

        // Apply location filter
        if (hasLocationFilter) {
          filtered = filtered.filter(venue => 
            currentFiltersRef.current.location.some((location: string) => {
              return venue.district && venue.district.toLowerCase().includes(location.toLowerCase());
            })
          );
        }
      }
      
      setFilteredVenues(filtered);
    });
  }, [registerSearchPageCallback]);

  // Update user location state when geolocation data is available
  useEffect(() => {
    if (userLat && userLng) {
      setUserLocation({ latitude: userLat, longitude: userLng });
    }
  }, [userLat, userLng]);

  // Update filtered venues when venues data or filters change (only when header search is NOT active)
  useEffect(() => {
    if (headerSearchActive) return;
    
    if (!venues) {
      setFilteredVenues([]);
      return;
    }

    let filtered = venues;

    const hasServiceFilter = currentFilters.services && currentFilters.services.length > 0;
    const hasLocationFilter = currentFilters.location && currentFilters.location.length > 0;

    // Apply service filters (OR logic within services)
    // This filters to venues that match ANY of the selected services
    if (hasServiceFilter && allVenueServices) {
      const venueIdsWithServices = allVenueServices
        .filter(service => {
          const serviceType = (service as any).services?.name || '';
          const serviceName = (service as any).name || '';
          return currentFilters.services.some((s: string) => {
            const sLower = s.toLowerCase();
            return serviceName.toLowerCase() === sLower ||
                   serviceName.toLowerCase().includes(sLower) ||
                   serviceType.toLowerCase().includes(sLower);
          });
        })
        .map(service => (service as { venue_id: string }).venue_id);
      
      // Filter venues to only those matching the service filter
      filtered = filtered.filter(venue => venueIdsWithServices.includes(venue.id));
    }

    // Apply location filters (OR logic within locations)
    // This is applied to the already-filtered list (AND logic between categories)
    // If both filters are active, only venues that match BOTH will remain
    if (hasLocationFilter) {
      // Further filter the already filtered venues by location
      filtered = filtered.filter(venue => 
        currentFilters.location.some((location: string) => {
          return venue.district && venue.district.toLowerCase().includes(location.toLowerCase());
        })
      );
    }

    setFilteredVenues(filtered);
    
    // Reset mobile venue index when filtered venues change
    setCurrentMobileVenueIndex(0);
  }, [venues, currentFilters, allVenueServices, headerSearchActive]);

  // When header search is active, re-apply filters to the header base list on filter changes
  useEffect(() => {
    if (!headerSearchActive) return;
    const next = applyFiltersToBase(headerBaseVenuesRef.current || []);
    setFilteredVenues(next);
  }, [headerSearchActive, currentFilters, applyFiltersToBase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Parse URL params for view and filters, and apply when data is ready
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const viewParam = params.get('view');
    
    // Only set viewMode from URL if it's explicitly provided and valid
    // For main page (/) without view param, default to 'list'
    // Only allow 'map' view from URL, prevent 'split' view from URL on main page
    if (viewParam === 'map') {
      setViewMode('map');
    } else if (viewParam === 'list') {
      setViewMode('list');
    }
    // Note: We explicitly don't allow 'split' view from URL parameters
    // to prevent skeleton issues on main page

    const parseList = (value: string | null) =>
      value && value.trim().length > 0
        ? value.split(',').map(v => v.trim()).filter(Boolean)
        : [];

    const parsed = {
      services: parseList(params.get('services')) as string[],
      location: parseList(params.get('location')) as string[]
    };

    // Only update if there is at least one filter present
    if (parsed.services.length || parsed.location.length) {
      setCurrentFilters(parsed as unknown as { services: []; location: [] });
      // Apply when data is available
      if (venues && allVenueServices) {
        handleFiltersChange(parsed as { services: string[]; location: string[] });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.search, venues, allVenueServices]);

  // Filter venues for LIST display based on map bounds when in split or map view
  // NOTE: Map always gets stableFilteredVenues to prevent circular re-renders
  const filteredVenuesForList = useMemo(() => {
    if (!stableFilteredVenues) {
      return [];
    }
    
    // Only filter LIST when map is visible and bounds are available
    if ((viewMode === 'split' || viewMode === 'map') && mapBounds) {
      const boundedVenues = stableFilteredVenues.filter(venue => {
        const coordinates = getVenueCoordinates(venue);
        return (
          coordinates.lat >= mapBounds.south &&
          coordinates.lat <= mapBounds.north &&
          coordinates.lng >= mapBounds.west &&
          coordinates.lng <= mapBounds.east
        );
      });
      return boundedVenues;
    }
    
    // Return all filtered venues when in list view or no bounds available
    return stableFilteredVenues;
  }, [stableFilteredVenues, mapBounds, viewMode]);

  // Memoize venue coordinates to prevent recalculation on every render
  const memoizedVenueCoordinates = useMemo(() => {
    if (!filteredVenuesForList) return new Map();
    
    const coordinatesMap = new Map();
    filteredVenuesForList.forEach(venue => {
      coordinatesMap.set(venue.id, getVenueCoordinates(venue));
    });
    return coordinatesMap;
  }, [filteredVenuesForList]);

  // Handle filters change
  const handleFiltersChange = (filters: {
    services: string[];
    location: string[];
  }) => {
    
    // Store current filters
    setCurrentFilters(filters);
    
    // The filtering logic is now handled in the useEffect above
    // which will automatically re-run when currentFilters changes
  };

  // Handle map bounds change - stable callback using ref to prevent re-renders
  const handleBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    // Only update if bounds actually changed (with small epsilon for floating point comparison)
    const epsilon = 0.0001;
    const currentBounds = mapBoundsRef.current;
    
    if (!currentBounds || 
        Math.abs(currentBounds.north - bounds.north) > epsilon ||
        Math.abs(currentBounds.south - bounds.south) > epsilon ||
        Math.abs(currentBounds.east - bounds.east) > epsilon ||
        Math.abs(currentBounds.west - bounds.west) > epsilon) {
      mapBoundsRef.current = bounds;
      setMapBounds(bounds);
    }
  }, []); // No dependencies - stable callback!

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVenueHover = useCallback((venue: Venue) => {
    // Clear any existing timeout when hovering over a new venue
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredVenue(venue);
    // Don't show desktop venue card on hover - only highlight the marker
  }, []);

  const handleVenueHoverEnd = useCallback(() => {
    setHoveredVenue(null);
    // Clear any existing timeout first
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Desktop venue card is not shown on hover anymore, only on click
  }, []);

  const handleResetMap = useCallback(() => {
    // Reset map to default state
    setMapCenter(null);
    setSelectedVenue(null);
    setHoveredVenue(null);
    setDesktopSelectedVenue(null);
    setMapBounds(null);
    mapBoundsRef.current = null; // Also reset the ref
    
    // Trigger map reset
    setResetTrigger(prev => prev + 1);
    
    // Show success message
    toast.success(t('search.mapReset'));
  }, [t]);

  const handleUseMyLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      // Google Maps accuracy thresholds based on their documented standards
      if (location.accuracy > 500) {
        // Red accuracy (>15m) - Show warning but don't center map (Google's behavior)
        toast.warning(t('locationPicker.veryPoorAccuracyMessage', { accuracy: Math.round(location.accuracy) }), {
          duration: 8000,
        });
        // Don't center the map for low accuracy (Google's behavior)
        return;
      } else if (location.accuracy > 200) {
        // Yellow accuracy (5-15m) - Show warning but center map
        toast.warning(t('locationPicker.poorAccuracyMessage', { accuracy: Math.round(location.accuracy) }), {
          duration: 6000,
        });
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        setMapCenteringType('user');
      } else {
        // Green accuracy (0-5m) - Center map without warning
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        setMapCenteringType('user');
        // Optional: Show subtle success message
        toast.success(t('search.locationCentered'), {
          duration: 2000,
        });
      }
    } else if (locationError) {
      // Handle different types of location errors
      let errorMessage = locationError;
      if (locationError.includes('denied')) {
        errorMessage = t('locationPicker.permissionDenied');
      } else if (locationError.includes('unavailable')) {
        errorMessage = t('locationPicker.positionUnavailable');
      } else if (locationError.includes('timeout')) {
        errorMessage = t('locationPicker.timeout');
      } else {
        errorMessage = t('locationPicker.locationError');
      }
      
      toast.error(errorMessage, {
        duration: 6000,
      });
    }
  };

  // Handle venue selection from map clicks
  const handleVenueClick = (venue: Venue) => {
    if (filteredVenues) {
      const venueIndex = filteredVenues.findIndex(v => v.id === venue.id);
      if (venueIndex !== -1) {
        handleMobileVenueChange(venueIndex);
      }
    }
  };

  // Handle desktop venue selection from map
  const handleDesktopVenueClick = useCallback((venue: Venue) => {
    setDesktopSelectedVenue(venue);
  }, []);


  // Handle mobile venue selection with map centering
  const handleMobileVenueChange = useCallback((newIndex: number) => {
    setCurrentMobileVenueIndex(newIndex);
    
    // Center map on the selected venue
    if (filteredVenues && filteredVenues[newIndex]) {
      const selectedVenue = filteredVenues[newIndex];
      const venueCoords = getVenueCoordinates(selectedVenue);
      setMapCenter(venueCoords);
      setMapCenteringType('venue'); // Set centering type for venue selection
    }
  }, [filteredVenues]);

  // Map centering type state
  const [mapCenteringType, setMapCenteringType] = useState<'user' | 'venue'>('user');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="responsive-container py-8">
          {/* Header skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-80 animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-36 animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            </div>
          </div>

          {/* Content skeleton - List view layout */}
          <div className="w-full">
            {/* Venues List skeleton - responsive grid */}
            <div className="overflow-hidden">
              <div className="h-full overflow-y-auto pr-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-card rounded-lg border p-4 space-y-3">
                      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Prepare SEO data
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  const searchResultsTitle = filteredVenues && filteredVenues.length > 0
    ? `Gaming Venues in Georgia (${filteredVenues.length}) - Book Now | Dajavshne`
    : 'Book Gaming Venues in Georgia - Console, VR, PC Gaming | Dajavshne';
  
  const searchResultsDescription = filteredVenues && filteredVenues.length > 0
    ? `Discover ${filteredVenues.length} gaming venues in Georgia. Book console rooms, VR zones, PC gaming cafes instantly. Easy online booking with instant confirmation.`
    : 'Discover and book amazing gaming venues in Georgia - Console rooms, VR zones, PC gaming cafes, PlayStation rooms and more. Easy online booking with instant confirmation and best prices.';

  // Generate structured data for search results
  const searchStructuredData = filteredVenues && filteredVenues.length > 0
    ? generateSearchResultsStructuredData(
        filteredVenues.slice(0, 10).map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
        })),
        siteUrl
      )
    : null;

  const websiteStructuredData = generateWebsiteStructuredData(siteUrl);
  const organizationStructuredData = generateOrganizationStructuredData(siteUrl);

  const structuredDataArray = [websiteStructuredData, organizationStructuredData];
  if (searchStructuredData) {
    structuredDataArray.push(searchStructuredData);
  }

  const keywords = [
    'gaming venues Georgia',
    'book gaming venue',
    'console room booking',
    'VR zone Georgia',
    'PC gaming cafe',
    'PlayStation room',
    'gaming cafe Tbilisi',
    'esports venue',
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={searchResultsTitle}
        description={searchResultsDescription}
        canonical={`${siteUrl}/search`}
        ogType="website"
        keywords={keywords}
        structuredData={structuredDataArray}
      />
      
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className={`${isFullscreenMap ? '' : 'responsive-container pt-4'} ${!filteredVenues?.length && venues?.length ? 'pb-4' : 'pb-6'}`}>
          {/* Header */}
          {!isFullscreenMap && (
            <div className="mb-4">
              {/* Top Control Bar - Filters and View Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Inline Filters */}
              <div className="flex-1">
                <InlineFilters 
                  onFiltersChange={handleFiltersChange}
                  initialFilters={currentFilters}
                />
              </div>
              
              {/* Right: Responsive View Toggle */}
              <div className="flex items-center gap-2">
                {/* Responsive View Toggle Button */}
                <Button
                  variant={getToggleState().isActive ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleView}
                  className="flex items-center gap-2"
                  title={getToggleState().label}
                >
                  {(() => {
                    const Icon = getToggleState().icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="hidden sm:inline">{getToggleState().label}</span>
                </Button>
              </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className={`${isFullscreenMap ? 'fixed inset-0 z-50 bg-background flex flex-col' : 'flex gap-4 min-h-0'} ${!isFullscreenMap && viewMode === 'split' ? 'h-[calc(100vh-280px)]' : ''}`}>
            {/* Fullscreen Filters Bar */}
            {isFullscreenMap && (
              <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <InlineFilters 
                    onFiltersChange={handleFiltersChange}
                    initialFilters={currentFilters}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreenMap}
                  className="h-8 w-8 p-0"
                  title={t('search.exitFullscreen')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Venues List */}
            {!isFullscreenMap && (viewMode === 'split' || viewMode === 'list') && (
              <div className={`${viewMode === 'split' ? 'w-1/2 flex-shrink-0 overflow-hidden' : 'w-full'} search-results-container`}>
                <div className={`pr-2 ${viewMode === 'split' ? 'h-full overflow-y-auto' : ''}`}>
                  <div className={`search-results-grid ${viewMode === 'split' ? 'compact' : ''} ${
                    viewMode === 'list' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                      : 'grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {/* Initial loading skeleton */}
                    {isLoading && (
                      viewMode === 'split' ? (
                        <VenueCardSkeleton count={6} />
                      ) : (
                        <VenueListSkeleton 
                          count={12} 
                          gridClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                        />
                      )
                    )}
                    
                    {/* Venue cards */}
                    {(filteredVenuesForList && filteredVenuesForList.length > 0) ? filteredVenuesForList.map((venue, index) => (
                      <motion.div
                        key={venue.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (index % 12) * 0.05 }}
                        className="group w-full"
                      >
                        <VenueCard venue={venue} searchMode={viewMode === 'split'} onHover={handleVenueHover} onHoverEnd={handleVenueHoverEnd} />
                      </motion.div>
                    )) : null}
                  </div>
                  
                  {/* Infinite scroll loading indicator */}
                  {isLoadingMore && (
                    <div className="infinite-scroll-loader">
                      <div className="spinner"></div>
                    </div>
                  )}
                  
                  {/* Intersection observer target */}
                  {hasMore && !isLoading && (
                    <div ref={setElementRef} className="h-4"></div>
                  )}
                  
                  
                  {!filteredVenues?.length && venues && venues.length > 0 && (
                    <div className="text-center py-12">
                      <div className="max-w-md mx-auto">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 text-3xl">🔍</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('search.noVenuesFound')}</h3>
                        <p className="text-gray-600 mb-6">
                          {t('search.noVenuesMatchFilters')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!venues || venues.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg">
                        {t('search.noVenuesFound')}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Interactive Map */}
            {(viewMode === 'split' || viewMode === 'map' || isFullscreenMap) && (
              <div className={`${isFullscreenMap ? 'flex-1 w-full' : viewMode === 'split' ? 'w-1/2 flex-shrink-0' : 'w-full'} ${isFullscreenMap ? 'overflow-hidden' : 'rounded-lg overflow-hidden border'} relative ${viewMode === 'split' ? 'h-full' : 'h-[calc(100vh-280px)]'}`}>
                {venues && venues.length > 0 ? (
                  <GoogleMapsWrapper
                    venues={stableFilteredVenues || []}
                    selectedVenue={desktopSelectedVenue || selectedVenue}
                    hoveredVenue={hoveredVenue}
                    mapCenter={mapCenter}
                    centeringType={mapCenteringType}
                    resetTrigger={resetTrigger}
                    onBoundsChange={handleBoundsChange}
                    onVenueClick={handleDesktopVenueClick}
                    showPopups={false}
                    fitToVenuesOnLoad={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-muted-foreground">No venues to display on map</p>
                    </div>
                  </div>
                )}
                
                {/* Map Controls - Always visible on map */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  {/* Fullscreen Toggle - Only show in split view */}
                  {viewMode === 'split' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFullscreenMap}
                      className="h-10 w-10 p-0 bg-background/90 backdrop-blur-sm"
                      title={isFullscreenMap ? t('search.exitFullscreen') : t('search.fullscreen')}
                    >
                      {isFullscreenMap ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Use My Location */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    className="h-10 w-10 p-0 bg-background/90 backdrop-blur-sm"
                    title={t('search.useMyLocation')}
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Reset Map */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetMap}
                    className="h-10 w-10 p-0 bg-background/90 backdrop-blur-sm"
                    title={t('search.resetMap')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Desktop Venue Card Overlay */}
                <DesktopVenueCard
                  venue={desktopSelectedVenue}
                  userLocation={userLocation}
                  onClose={() => setDesktopSelectedVenue(null)}
                  position={viewMode === 'split' ? 'bottom-right' : 'bottom-left'}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Layout */}
      <div className="lg:hidden">
        {/* Mobile Map View - Fullscreen with simple search overlay */}
        {viewMode === 'map' ? (
          <div className="mobile-map-container bg-background">
            {/* Fullscreen Map */}
            <div className="w-full h-full">
              {venues && venues.length > 0 ? (
                <GoogleMapsWrapper
                  venues={mobileMapVenues || []}
                  selectedVenue={mobileMapVenues?.[currentMobileVenueIndex] || null}
                  hoveredVenue={null}
                  mapCenter={mapCenter}
                  centeringType={mapCenteringType}
                  resetTrigger={resetTrigger}
                  onBoundsChange={handleBoundsChange}
                  onVenueClick={handleVenueClick}
                  showPopups={false}
                  fitToVenuesOnLoad={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-muted-foreground">No venues to display on map</p>
                  </div>
                </div>
              )}
            </div>

            {/* Simple Search Overlay */}
            <div className="absolute top-4 left-4 right-4 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              <div className="flex items-center gap-2">
                {/* Search Field */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('search.searchVenues', 'Search venues...')}
                    value={mobileSearchQuery}
                    onChange={(e) => {
                      handleMobileSearch(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        // Mobile search is already executed on change, so just blur the input
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full h-12 pl-4 pr-4 bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-white backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-full text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 dark:focus:ring-primary/40 dark:focus:border-primary/60 shadow-lg"
                  />
                </div>
                
                {/* Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-12 w-12 p-0 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-white/10 flex-shrink-0 relative shadow-lg text-gray-800 dark:text-white overflow-visible ${
                    (currentFilters.services.length > 0 || currentFilters.location.length > 0)
                      ? 'border-primary/70 dark:border-primary/60 bg-primary/10 dark:bg-primary/20 text-primary dark:text-white'
                      : 'hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-5 w-5 text-gray-800 dark:text-white" />
                  {(currentFilters.services.length > 0 || currentFilters.location.length > 0) && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {currentFilters.services.length + currentFilters.location.length}
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute left-4 z-50 h-12 w-12 p-0 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-white/10 flex-shrink-0 shadow-lg hover:border-gray-300 dark:hover:border-white/20 text-gray-800 dark:text-white"
              style={{ top: `calc(4rem + env(safe-area-inset-top, 0px) + 1rem)` }}
              onClick={() => {
                setViewMode('list');
                navigate({ pathname: location.pathname, search: '' }, { replace: true });
              }}
              title={t('common.back', 'Back')}
            >
              <X className="h-5 w-5 text-gray-800 dark:text-white" />
            </Button>
            
            {/* Map Controls */}
            <div className="absolute right-4 z-10 flex flex-col gap-2" style={{ top: `calc(4rem + env(safe-area-inset-top, 0px) + 1rem)` }}>
                <Button
                variant="outline"
                size="sm"
                onClick={handleUseMyLocation}
                disabled={locationLoading}
                  className="h-12 w-12 p-0 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-lg hover:border-gray-300 dark:hover:border-white/20 text-gray-800 dark:text-white [&_svg]:text-gray-800 dark:[&_svg]:text-white"
                title={t('search.useMyLocation')}
              >
                {locationLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-800 dark:text-white" />
                ) : (
                  <Navigation className="w-5 h-5 text-gray-800 dark:text-white" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetMap}
                className="h-12 w-12 p-0 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-lg hover:border-gray-300 dark:hover:border-white/20 text-gray-800 dark:text-white [&_svg]:text-gray-800 dark:[&_svg]:text-white"
                title={t('search.resetMap')}
              >
                <RotateCcw className="w-5 h-5 text-gray-800 dark:text-white" />
              </Button>
            </div>

            {/* Mobile Venue Card for Map View */}
            {mobileMapVenues && mobileMapVenues.length > 0 && (
              <MobileVenueCard
                venues={mobileMapVenues}
                currentVenueIndex={currentMobileVenueIndex}
                userLocation={userLocation}
                onVenueChange={handleMobileVenueChange}
              />
            )}
          </div>
        ) : (
          /* Regular Mobile Layout for List View */
          <div className={`responsive-container pt-4 search-results-container ${!filteredVenues?.length && venues?.length ? 'pb-4' : 'pb-6'}`}>
            {/* Header */}
            <div className="mb-4">
              {/* Top Control Bar - Filters and View Toggle */}
              <div className="flex flex-col gap-3">
                {/* Controls Row - View Toggle */}
                <div className="flex items-center justify-between gap-2">
                  {/* Compact Mobile Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 px-3 gap-2 overflow-visible ${
                      (currentFilters.services.length > 0 || currentFilters.location.length > 0)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted-foreground/30'
                    }`}
                    onClick={() => setShowFilters(true)}
                  >
                    <Filter className="h-4 w-4" />
                    <span className="text-sm">
                      {t('filters.title', 'Filters')}
                    </span>
                    {(currentFilters.services.length > 0 || currentFilters.location.length > 0) && (
                      <div className="min-w-[18px] h-[18px] bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {currentFilters.services.length + currentFilters.location.length}
                      </div>
                    )}
                  </Button>
                  
                  {/* Responsive View Toggle Button */}
                  <Button
                    variant={getToggleState().isActive ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleView}
                    className="flex items-center gap-2 flex-shrink-0"
                    title={getToggleState().label}
                  >
                    {(() => {
                      const Icon = getToggleState().icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                    <span className="hidden sm:inline">{getToggleState().label}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              {/* List View */}
              {viewMode === 'list' && (
                <div>
                  {/* Initial loading skeleton */}
                  {isLoading && (
                    <div className="p-4">
                      <VenueListSkeleton count={6} />
                    </div>
                  )}
                  
                  {(filteredVenues && filteredVenues.length > 0) ? (
                    <>
                      <MemoizedVenueList venues={filteredVenues} searchMode={false} />
                      
                      {/* Infinite scroll loading indicator */}
                      {isLoadingMore && (
                        <div className="infinite-scroll-loader">
                          <div className="spinner"></div>
                        </div>
                      )}
                      
                      {/* Intersection observer target */}
                      {hasMore && !isLoading && (
                        <div ref={setElementRef} className="h-4"></div>
                      )}
                      
                    </>
                  ) : null}

                  {!filteredVenues?.length && venues && venues.length > 0 && (
                    <div className="text-center py-12">
                      <div className="max-w-md mx-auto">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 text-3xl">🔍</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('search.noVenuesFound')}</h3>
                        <p className="text-gray-600 mb-6">
                          {t('search.noVenuesMatchFilters')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!venues || venues.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg">
                        {t('search.noVenuesFound')}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="max-h-[85vh] border-t-0">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="pb-4 pt-6 px-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DrawerTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {t('filters.title', 'Filter Venues')}
                  </DrawerTitle>
                  <DrawerDescription className="text-gray-500 text-base leading-relaxed">
                    {t('filters.description', 'Find venues that match your preferences')}
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 -mt-1">
                    <X className="h-5 w-5 text-gray-400" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[45vh]">
              <MobileFilterDrawer 
                onFiltersChange={handleFiltersChange}
                initialFilters={currentFilters}
                onClose={() => setShowFilters(false)}
                showButtons={false}
              />
            </div>
            
            <MobileFilterActions
              onApply={() => {
                setShowFilters(false);
              }}
              onClearAll={() => {
                const emptyFilters = { services: [], location: [] };
                handleFiltersChange(emptyFilters);
                setShowFilters(false);
              }}
              activeFilterCount={currentFilters.services.length + currentFilters.location.length}
              t={t}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default SearchResults;