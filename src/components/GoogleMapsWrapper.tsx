import React, { useState, useEffect } from 'react';
import { Venue } from '@/hooks/useVenues';
import AirbnbStyleMap from './AirbnbStyleMap';
import { googleMapsLoader } from '@/utils/googleMapsLoader';
import { getSupabaseConfig } from '@/config/supabase';

// Helper function to get Supabase URL from centralized config
function getSupabaseUrl(): string {
  const config = getSupabaseConfig();
  
  // Security improvement: Validate URL format
  if (!config.url || !config.url.startsWith('https://')) {
    console.error('Invalid Supabase URL configuration');
    throw new Error('Supabase URL not properly configured');
  }
  
  return config.url;
}

interface GoogleMapsWrapperProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  hoveredVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  mapCenter?: { lat: number; lng: number } | null;
  centeringType?: 'user' | 'venue';
  resetTrigger?: number;
  className?: string;
  showPopups?: boolean;
  fitToVenuesOnLoad?: boolean;
}

const GoogleMapsWrapper = React.memo(({ 
  venues, 
  selectedVenue, 
  hoveredVenue,
  onVenueClick, 
  onBoundsChange,
  mapCenter,
  centeringType = 'user',
  resetTrigger,
  className = "w-full h-full",
  showPopups = true,
  fitToVenuesOnLoad = true
}: GoogleMapsWrapperProps) => {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Fetch Google Maps API key from Supabase edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // GoogleMapsWrapper: Fetching API key from Supabase
        
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-google-maps-api-key`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const apiKey = data.apiKey;
        
        if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
          throw new Error('Google Maps API key not configured in Supabase secrets');
        }
        
        // GoogleMapsWrapper: API key fetched successfully
        setGoogleMapsApiKey(apiKey);
      } catch (err) {
        console.error('GoogleMapsWrapper: Failed to get API key:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Google Maps API key');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Load Google Maps API using global loader
  useEffect(() => {
    if (!googleMapsApiKey) return;

    console.log('GoogleMapsWrapper: Loading Google Maps API...');

    // Check if already loaded
    if (googleMapsLoader.isGoogleMapsLoaded()) {
      console.log('GoogleMapsWrapper: Google Maps already loaded');
      setIsGoogleMapsLoaded(true);
      return;
    }

    // Load Google Maps using global loader
    googleMapsLoader.loadGoogleMaps(googleMapsApiKey)
      .then((success) => {
        if (success) {
          console.log('GoogleMapsWrapper: Google Maps loaded successfully');
          setIsGoogleMapsLoaded(true);
        } else {
          console.error('GoogleMapsWrapper: Failed to load Google Maps');
          setError('Failed to load Google Maps API');
        }
      })
      .catch((err) => {
        console.error('GoogleMapsWrapper: Google Maps loading error:', err);
        setError('Failed to load Google Maps API. Please check your API key and internet connection.');
      });
  }, [googleMapsApiKey]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p>Failed to load Google Maps: {error}</p>
            <p className="text-sm mt-2">Please check the setup guide in GOOGLE_MAPS_SETUP.md</p>
          </div>
        </div>
      </div>
    );
  }

  // If no API key, show error
  if (!googleMapsApiKey) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p>Google Maps unavailable: API key not configured</p>
            <p className="text-sm mt-2">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
          </div>
        </div>
      </div>
    );
  }

  // If Google Maps not loaded yet, show loading
  if (!isGoogleMapsLoaded) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading Google Maps API...</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('GoogleMapsWrapper: Rendering Airbnb-style map with', venues.length, 'venues');

  // Show the Airbnb-style map
  return (
    <AirbnbStyleMap
      venues={venues}
      selectedVenue={selectedVenue}
      hoveredVenue={hoveredVenue}
      onVenueClick={onVenueClick}
      onBoundsChange={onBoundsChange}
      mapCenter={mapCenter}
      centeringType={centeringType}
      resetTrigger={resetTrigger}
      googleMapsApiKey={googleMapsApiKey}
      className={className}
      showPopups={showPopups}
      fitToVenuesOnLoad={fitToVenuesOnLoad}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  // Only re-render if critical props have changed
  
  console.log('🔍 GoogleMapsWrapper: Comparing props for re-render...');
  
  // Compare venues array by length and IDs (shallow comparison)
  if (prevProps.venues.length !== nextProps.venues.length) {
    console.log('❌ GoogleMapsWrapper: WILL RE-RENDER - venues length changed:', prevProps.venues.length, '→', nextProps.venues.length);
    return false;
  }
  
  // Check if venue IDs have changed (assumes venues are in same order for efficiency)
  for (let i = 0; i < prevProps.venues.length; i++) {
    if (prevProps.venues[i].id !== nextProps.venues[i].id) {
      console.log('❌ GoogleMapsWrapper: WILL RE-RENDER - venue IDs changed at index', i);
      return false;
    }
  }
  
  // Compare other important props
  const checks = {
    selectedVenue: prevProps.selectedVenue?.id === nextProps.selectedVenue?.id,
    hoveredVenue: prevProps.hoveredVenue?.id === nextProps.hoveredVenue?.id,
    mapCenterLat: prevProps.mapCenter?.lat === nextProps.mapCenter?.lat,
    mapCenterLng: prevProps.mapCenter?.lng === nextProps.mapCenter?.lng,
    centeringType: prevProps.centeringType === nextProps.centeringType,
    resetTrigger: prevProps.resetTrigger === nextProps.resetTrigger,
    className: prevProps.className === nextProps.className,
    showPopups: prevProps.showPopups === nextProps.showPopups,
    fitToVenuesOnLoad: prevProps.fitToVenuesOnLoad === nextProps.fitToVenuesOnLoad,
    onVenueClick: prevProps.onVenueClick === nextProps.onVenueClick
  };
  
  const allEqual = Object.values(checks).every(v => v);
  
  if (!allEqual) {
    console.log('❌ GoogleMapsWrapper: WILL RE-RENDER - prop changes:', 
      Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
    );
  } else {
    console.log('✅ GoogleMapsWrapper: SKIP RE-RENDER - props unchanged');
  }
  
  return allEqual;
});

export default GoogleMapsWrapper; 