import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSupabaseConfig } from '@/config/supabase';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDarkMode } from '@/hooks/useDarkMode';

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

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  district?: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  className?: string;
}

const LocationPicker = ({ onLocationSelect, initialLocation, className }: LocationPickerProps) => {
  const { t } = useTranslation();
  const isDarkMode = useDarkMode();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  const [searchQuery, setSearchQuery] = useState(initialLocation?.address || '');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation || null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [accuracyWarning, setAccuracyWarning] = useState<{ message: string; accuracy: number } | null>(null);

  const { getCurrentLocation } = useGeolocation();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        setIsMapLoading(true);
        setMapError(null);
        
        console.log('Initializing map...');
        
        // Get Mapbox token from Supabase function
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-mapbox-token`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get Mapbox token: ${response.status} ${response.statusText}`);
        }
        
        const { mapboxToken } = await response.json();
        
        if (!mapboxToken) {
          throw new Error('Mapbox token is empty or undefined');
        }
        
        // Mapbox token retrieved successfully
        mapboxgl.accessToken = mapboxToken;

        // Create map instance
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
          center: initialLocation ? [initialLocation.longitude, initialLocation.latitude] : [44.8271, 41.7151], // Tbilisi center
          zoom: initialLocation ? 15 : 11
        });

        // Wait for map to load before adding controls and event listeners
        map.current.on('load', () => {
          console.log('Map loaded successfully');
          
          // Add navigation controls
          map.current!.addControl(new mapboxgl.NavigationControl(), 'top-right');

          // Add click handler to set location
          map.current!.on('click', async (e) => {
            console.log('Map clicked at:', e.lngLat);
            const { lng, lat } = e.lngLat;
            await handleLocationSelect(lng, lat);
          });

          // Add initial marker if location exists
          if (initialLocation) {
            addMarker(initialLocation.longitude, initialLocation.latitude);
          }
          
          setIsMapLoading(false);
        });

        // Handle map errors
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setMapError('Failed to load map. Please refresh the page.');
          setIsMapLoading(false);
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError(error instanceof Error ? error.message : 'Failed to initialize map');
        setIsMapLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isDarkMode]);

  // Add or update marker
  const addMarker = (lng: number, lat: number) => {
    if (!map.current) {
      console.error('Map not initialized');
      return;
    }

    console.log('Adding marker at:', lng, lat);

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create new marker
    marker.current = new mapboxgl.Marker({
      color: '#3B82F6',
      draggable: true
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Handle marker drag
    marker.current.on('dragend', async () => {
      const lngLat = marker.current!.getLngLat();
      console.log('Marker dragged to:', lngLat);
      await handleLocationSelect(lngLat.lng, lngLat.lat);
    });

    // Center map on marker
    map.current.flyTo({ center: [lng, lat], zoom: 15 });
  };

  // Handle location selection (either by click or marker drag)
  const handleLocationSelect = async (lng: number, lat: number) => {
    try {
      console.log('Handling location selection for:', lng, lat);
      
      if (!mapboxgl.accessToken) {
        throw new Error('Mapbox token not available');
      }

      // Try multiple geocoding approaches to get the best result
      let bestFeature = null;
      
      // First, try to get a specific address
      let response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address&limit=1&language=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        bestFeature = data.features?.[0];
        console.log('Address geocoding result:', bestFeature);
      }
      
      // If no specific address, try POI (points of interest)
      if (!bestFeature) {
        response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=poi&limit=1&language=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          bestFeature = data.features?.[0];
          console.log('POI geocoding result:', bestFeature);
        }
      }
      
      // If still no result, try without type restrictions to get any result
      if (!bestFeature) {
        response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Look for the most specific result (address or poi first, then place, then locality)
          bestFeature = data.features?.find(f => 
            f.place_type?.includes('address') || 
            f.place_type?.includes('poi')
          ) || data.features?.[0];
          console.log('Unrestricted geocoding result:', bestFeature);
        }
      }
      
      if (bestFeature) {
        const address = bestFeature.place_name;
        const district = bestFeature.context?.find((c: any) => c.id.includes('locality'))?.text || 
                        bestFeature.context?.find((c: any) => c.id.includes('region'))?.text || 
                        'Tbilisi';
        
        const locationData: LocationData = {
          address,
          latitude: lat,
          longitude: lng,
          district
        };

        console.log('Location data set:', locationData);
        setSelectedLocation(locationData);
        setSearchQuery(address);
        onLocationSelect(locationData);
        addMarker(lng, lat);
      } else {
        throw new Error('No location data found');
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback: still set coordinates without address
      const locationData: LocationData = {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng
      };
      setSelectedLocation(locationData);
      onLocationSelect(locationData);
      addMarker(lng, lat);
    }
  };

  // Common Tbilisi landmarks and areas
  const getCommonTbilisiLocations = (query: string) => {
    const commonLocations = [
      {
        text: "Freedom Square",
        place_name: "Freedom Square, Tbilisi, Georgia",
        center: [44.8015, 41.6971],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      },
      {
        text: "Rustaveli Avenue",
        place_name: "Rustaveli Avenue, Tbilisi, Georgia",
        center: [44.7995, 41.6995],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      },
      {
        text: "Old Tbilisi",
        place_name: "Old Tbilisi, Tbilisi, Georgia",
        center: [44.8105, 41.6895],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      },
      {
        text: "Vake",
        place_name: "Vake, Tbilisi, Georgia",
        center: [44.7455, 41.7085],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      },
      {
        text: "Saburtalo",
        place_name: "Saburtalo, Tbilisi, Georgia",
        center: [44.7455, 41.7285],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      },
      {
        text: "Mtatsminda",
        place_name: "Mtatsminda, Tbilisi, Georgia",
        center: [44.7855, 41.7085],
        context: [{ text: "Tbilisi" }, { text: "Georgia" }]
      }
    ];

    const queryLower = query.toLowerCase();
    return commonLocations.filter(location => 
      location.text.toLowerCase().includes(queryLower) ||
      location.place_name.toLowerCase().includes(queryLower)
    );
  };

  // Search for addresses
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      if (!mapboxgl.accessToken) {
        throw new Error('Mapbox token not available');
      }

      console.log('Searching for:', query);

      // Get common Tbilisi locations that match the query first
      const commonLocations = getCommonTbilisiLocations(query);
      console.log('Common locations found:', commonLocations);

      // If we have common locations, use them and skip API search
      if (commonLocations.length > 0) {
        console.log('Using common locations only');
        setSearchSuggestions(commonLocations);
        setShowSuggestions(true);
        setIsSearching(false);
        return;
      }

      // Search with proximity to Tbilisi for better local results
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&proximity=44.8271,41.7151&types=address,poi,place&limit=10&language=en`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const suggestions = data.features || [];
      
      console.log('Search results:', suggestions);

      // Filter results to only include Georgia/Tbilisi results
      const filteredSuggestions = suggestions
        .filter((suggestion: any) => {
          const placeName = suggestion.place_name.toLowerCase();
          const context = suggestion.context || [];
          
          // Check if it's in Georgia
          const isGeorgia = context.some((c: any) => 
            c.text?.toLowerCase() === 'georgia' || 
            c.short_code?.toLowerCase() === 'ge'
          );
          
          // Check if it's in Tbilisi
          const isTbilisi = placeName.includes('tbilisi') || 
                           placeName.includes('თბილისი') ||
                           context.some((c: any) => 
                             c.text?.toLowerCase() === 'tbilisi' ||
                             c.short_code?.toLowerCase() === 'ge-tb'
                           );
          
          // Only include Georgia/Tbilisi results
          return isGeorgia || isTbilisi;
        })
        .slice(0, 5);

      console.log('Filtered suggestions:', filteredSuggestions);
      
      setSearchSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (feature: any) => {
    console.log('Suggestion selected:', feature);
    
    // Handle both API results and common locations
    let lng, lat, address, district;
    
    if (Array.isArray(feature.center)) {
      // Common location format - center is already an array
      [lng, lat] = feature.center;
      address = feature.place_name;
      district = feature.context?.find((c: any) => c.text === 'Tbilisi')?.text || 'Tbilisi';
    } else if (feature.center) {
      // API result format - center is a property that contains coordinates
      [lng, lat] = feature.center;
      address = feature.place_name;
      district = feature.context?.find((c: any) => c.id.includes('locality'))?.text || 'Tbilisi';
    } else {
      console.error('Invalid feature format:', feature);
      return;
    }
    
    console.log('Extracted location data:', { lng, lat, address, district });
    
    const locationData: LocationData = {
      address,
      latitude: lat,
      longitude: lng,
      district
    };

    console.log('Setting location data:', locationData);
    setSelectedLocation(locationData);
    setSearchQuery(address);
    setShowSuggestions(false);
    onLocationSelect(locationData);
    addMarker(lng, lat);
  };

  // Use current location with unified Google-style logic
  const useCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (!result) {
      alert("Your location could not be determined.");
      return;
    }

    const { latitude, longitude, accuracy } = result;

    if (accuracy > 500) {
      const message = t('locationPicker.veryPoorAccuracyMessage', { accuracy: Math.round(accuracy) });
      setAccuracyWarning({ message, accuracy });
    } else if (accuracy > 200) {
      const message = t('locationPicker.poorAccuracyMessage', { accuracy: Math.round(accuracy) });
      setAccuracyWarning({ message, accuracy });
    } else {
      setAccuracyWarning(null);
    }
    
    // Fix: Pass longitude first, then latitude to match handleLocationSelect signature
    handleLocationSelect(longitude, latitude);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t('locationPicker.venueLocation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {mapError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
        )}

        {/* Accuracy Warning Alert */}
        {accuracyWarning && (
          <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t('locationPicker.locationAccuracyWarning')}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {accuracyWarning.message}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300">
                    {t('locationPicker.accuracyMeters', { accuracy: Math.round(accuracyWarning.accuracy) })}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccuracyWarning(null)}
                    className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                  >
                    {t('locationPicker.adjustLocationManually')}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Input */}
        <div className="space-y-2">
          <Label>{t('locationPicker.searchAddress')}</Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('locationPicker.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  console.log('Search input changed:', e.target.value);
                  setSearchQuery(e.target.value);
                  searchAddress(e.target.value);
                }}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            
            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      console.log('Suggestion button clicked:', index, suggestion);
                      e.preventDefault();
                      e.stopPropagation();
                      selectSuggestion(suggestion);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm">{suggestion.place_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Location Button */}
        <Button 
          variant="outline" 
          onClick={useCurrentLocation}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          {t('locationPicker.useCurrentLocation')}
        </Button>

        {/* Selected Location Display */}
        {selectedLocation && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{t('locationPicker.selectedLocation')}</p>
                <p className="text-sm text-gray-600">{selectedLocation.address}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">
                    Lat: {selectedLocation.latitude.toFixed(6)}
                  </Badge>
                  <Badge variant="secondary">
                    Lng: {selectedLocation.longitude.toFixed(6)}
                  </Badge>
                  {selectedLocation.district && (
                    <Badge variant="outline">
                      {selectedLocation.district}
                    </Badge>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Map Container */}
        <div className="space-y-2">
          <Label>{t('map.clickMapToSetLocation')}</Label>
          <div 
            ref={mapContainer} 
            className="w-full h-64 border border-gray-200 rounded-lg overflow-hidden relative"
          >
            {isMapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('map.loadingMap')}</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 text-center">
            💡 {t('map.dragMarkerTip')}
          </p>
        </div>

        {!selectedLocation && !mapError && (
          <Alert>
            <AlertDescription>
              {t('map.pleaseSearchOrClick')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationPicker;