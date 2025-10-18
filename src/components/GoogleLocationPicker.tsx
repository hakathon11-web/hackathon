import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, CheckCircle, MapIcon, AlertTriangle } from 'lucide-react';
import { googleMapsLoader } from '@/utils/googleMapsLoader';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDarkMode } from '@/hooks/useDarkMode';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  district?: string;
}

interface GoogleLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  className?: string;
}


const GoogleLocationPicker = ({ 
  onLocationSelect, 
  initialLocation, 
  className 
}: GoogleLocationPickerProps) => {
  const { t, i18n } = useTranslation();
  const isDarkMode = useDarkMode();
  const mapContainer = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const autocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const handleEnterKeyRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation || null);
  const [accuracyWarning, setAccuracyWarning] = useState<{ message: string; accuracy: number } | null>(null);

  const { getCurrentLocation } = useGeolocation();

  // Function to ensure address is in English
  const ensureEnglishAddress = async (address: string, lat: number, lng: number): Promise<string> => {
    // If address contains Georgian characters, try to get English version
    if (/[\u10A0-\u10FF]/.test(address)) {
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({
          location: { lat, lng },
          language: 'en'
        });
        
        if (response.results && response.results.length > 0) {
          return response.results[0].formatted_address;
        }
      } catch (error) {
        console.error('Failed to get English address:', error);
      }
    }
    
    return address;
  };

  // Initialize Google Maps and Autocomplete
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await googleMapsLoader.loadGoogleMaps();

        if (!mapContainer.current || !searchInputRef.current) return;

        const center = initialLocation 
          ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
          : { lat: 41.7151, lng: 44.8271 };

        // Initialize map
        map.current = new google.maps.Map(mapContainer.current, {
          center,
          zoom: initialLocation ? 16 : 12,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: 'greedy', // Enable single-finger navigation on mobile
          
          // Use Google's native dark mode
          colorScheme: isDarkMode ? google.maps.ColorScheme.DARK : google.maps.ColorScheme.LIGHT,
          
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "simplified" }]
            },
            {
              featureType: "transit",
              elementType: "labels", 
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        // Initialize native Google Places Autocomplete
        autocomplete.current = new google.maps.places.Autocomplete(searchInputRef.current, {
          bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(41.6, 44.6),
            new google.maps.LatLng(41.8, 45.0)
          ),
          componentRestrictions: { country: 'ge' },
          fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name'],
          types: ['establishment', 'geocode'],
          language: 'en'
        });

        // Style the autocomplete dropdown to match our design
        const pacContainer = document.querySelector('.pac-container');
        if (pacContainer) {
          (pacContainer as HTMLElement).style.zIndex = '9999';
          (pacContainer as HTMLElement).style.borderRadius = '8px';
          (pacContainer as HTMLElement).style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        }

        // Helper: apply a text query (when user presses Enter or place has no geometry)
        const applyManualSearch = async (query?: string) => {
          try {
            const text = (query ?? searchInputRef.current?.value ?? '').trim();
            if (!text) return;
            const geocoder = new google.maps.Geocoder();
            const resp = await geocoder.geocode({ address: text, region: 'ge', language: 'en' });
            const result = resp.results && resp.results[0];
            const loc = result?.geometry?.location;
            if (!loc) return;
            const lat = loc.lat();
            const lng = loc.lng();

            let district = '';
            if (result?.address_components) {
              for (const component of result.address_components) {
                if (
                  component.types.includes('sublocality') ||
                  component.types.includes('sublocality_level_1') ||
                  component.types.includes('administrative_area_level_2') ||
                  component.types.includes('neighborhood')
                ) {
                  district = component.long_name;
                  break;
                }
              }
            }

            map.current?.setCenter({ lat, lng });
            map.current?.setZoom(16);
            addMarker(lat, lng);

            // Ensure the address is in English
            const finalAddress = await ensureEnglishAddress(
              result?.formatted_address || text,
              lat,
              lng
            );

            const locationData = {
              address: finalAddress,
              latitude: lat,
              longitude: lng,
              district
            };

            setSelectedLocation(locationData);
            onLocationSelect(locationData);
          } catch (e) {
            console.error('Manual geocode failed:', e);
          }
        };

        // If user presses Enter without selecting a dropdown item, geocode the typed text
        const handleEnterKey = (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyManualSearch();
          }
        };
        handleEnterKeyRef.current = handleEnterKey;
        const inputEl = searchInputRef.current;
        inputEl.addEventListener('keydown', handleEnterKey);

        // Handle autocomplete place selection
        autocomplete.current.addListener('place_changed', async () => {
          const place = autocomplete.current?.getPlace();
          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            // Always fetch English address via Geocoder using placeId if available
            const geocoder = new google.maps.Geocoder();
            let district = '';
            let englishAddress = '';

            if (place.place_id) {
              const geocodeById = await geocoder.geocode({ placeId: place.place_id, language: 'en' });
              if (geocodeById.results && geocodeById.results.length > 0) {
                const result = geocodeById.results[0];
                englishAddress = result.formatted_address || '';
                for (const component of result.address_components) {
                  if (component.types.includes('sublocality') || 
                      component.types.includes('sublocality_level_1') ||
                      component.types.includes('administrative_area_level_2') ||
                      component.types.includes('neighborhood')) {
                    district = component.long_name;
                    break;
                  }
                }
              }
            }

            // Fallback to reverse geocoding in English by coordinates
            if (!englishAddress) {
              const resp = await geocoder.geocode({ location: { lat, lng }, language: 'en' });
              if (resp.results && resp.results.length > 0) {
                const result = resp.results[0];
                englishAddress = result.formatted_address || '';
                for (const component of result.address_components) {
                  if (component.types.includes('sublocality') || 
                      component.types.includes('sublocality_level_1') ||
                      component.types.includes('administrative_area_level_2') ||
                      component.types.includes('neighborhood')) {
                    district = component.long_name;
                    break;
                  }
                }
              }
            }
            
            map.current?.setCenter({ lat, lng });
            map.current?.setZoom(16);
            addMarker(lat, lng);
            
            // Ensure the address is in English
            const finalAddress = await ensureEnglishAddress(
              englishAddress || place.formatted_address || place.name || '',
              lat,
              lng
            );
            
            const locationData = {
              address: finalAddress,
              latitude: lat,
              longitude: lng,
              district
            };
            
            setSelectedLocation(locationData);
            onLocationSelect(locationData);
            
            // Clear the search input
            if (searchInputRef.current) {
              searchInputRef.current.value = '';
            }
          } else {
            // Some selections may not return geometry (e.g., free-typed text). Fallback to manual geocode.
            const fallbackText = (place?.formatted_address || place?.name || searchInputRef.current?.value || '').trim();
            if (fallbackText) {
              await applyManualSearch(fallbackText);
              if (searchInputRef.current) {
                searchInputRef.current.value = '';
              }
            }
          }
        });

        if (initialLocation) {
          addMarker(initialLocation.latitude, initialLocation.longitude);
        }

        // Handle map clicks
        map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            addMarker(lat, lng);
            handleLocationSelect(lat, lng);
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Google Maps:', err);
        setError('Failed to load Google Maps. Please check your internet connection.');
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (marker.current) {
        marker.current.setMap(null);
      }
      const inputEl = searchInputRef.current;
      if (inputEl && handleEnterKeyRef.current) {
        inputEl.removeEventListener('keydown', handleEnterKeyRef.current);
      }
    };
  }, [isDarkMode]);

  // Custom marker creation
  const createCustomMarker = (lat: number, lng: number) => {
    return new google.maps.Marker({
      position: { lat, lng },
      map: map.current,
      draggable: true,
      title: 'Venue Location (drag to adjust)',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
        anchor: new google.maps.Point(0, 0)
      },
      animation: google.maps.Animation.DROP
    });
  };

  const addMarker = (lat: number, lng: number) => {
    if (!map.current) return;

    if (marker.current) {
      marker.current.setMap(null);
    }

    marker.current = createCustomMarker(lat, lng);

    marker.current.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        handleLocationSelect(lat, lng);
      }
    });

    map.current.panTo({ lat, lng });
  };

  const handleLocationSelect = async (lat: number, lng: number, providedAddress?: string) => {
    try {
      let address = providedAddress;
      let district = '';

      if (!address) {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({
          location: { lat, lng },
          language: 'en'
        });

        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          address = result.formatted_address;
          
          // Extract district
          for (const component of result.address_components) {
            if (component.types.includes('sublocality') || 
                component.types.includes('sublocality_level_1') ||
                component.types.includes('administrative_area_level_2')) {
              district = component.long_name;
              break;
            }
          }
        }
      }

      if (address) {
        // Ensure the address is in English
        const finalAddress = await ensureEnglishAddress(address, lat, lng);
        
        const locationData: LocationData = {
          address: finalAddress,
          latitude: lat,
          longitude: lng,
          district
        };

        setSelectedLocation(locationData);
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const useCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (!result) {
      setError('Your location could not be determined.');
      return;
    }

    const { latitude: lat, longitude: lng, accuracy } = result;

    // Relaxed thresholds: only warn on very poor accuracy
    if (accuracy > 500) {
      const message = t('locationPicker.veryPoorAccuracyMessage', { accuracy: Math.round(accuracy) });
      setAccuracyWarning({ message, accuracy });
    } else if (accuracy > 200) {
      const message = t('locationPicker.poorAccuracyMessage', { accuracy: Math.round(accuracy) });
      setAccuracyWarning({ message, accuracy });
    } else {
      setAccuracyWarning(null);
    }

    if (map.current) {
      map.current.setCenter({ lat, lng });
      map.current.setZoom(16);
      addMarker(lat, lng);
      handleLocationSelect(lat, lng);
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert className="border-destructive">
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="h-5 w-5" />
          {t('partner.locationPicker.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('partner.locationPicker.subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Native Google Places Autocomplete Search */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              ref={searchInputRef}
              placeholder={t('partner.locationPicker.searchPlaceholder')}
              className="h-12 text-base"
            />
            <div className="absolute inset-0 pointer-events-none border border-border rounded-md"></div>
          </div>

          {/* Current Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={useCurrentLocation}
            className="w/full justify-start gap-2 h-11"
            disabled={isLoading}
          >
            <Navigation className="h-4 w-4" />
            {isLoading ? 'Getting location...' : t('partner.locationPicker.useCurrentLocation')}
          </Button>
        </div>

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


        {/* Selected Location Display */}
        {selectedLocation && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-green-800 dark:text-green-200">
                  📍 Location pinned successfully!
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  {selectedLocation.address}
                </div>
                {selectedLocation.district && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    District: {selectedLocation.district}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Map Container */}
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="w-full h-96 bg-muted rounded-lg border border-border overflow-hidden"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
              </div>
            </div>
          )}
          
          {/* Map Instructions Overlay */}
          {!selectedLocation && !isLoading && (
            <div className="absolute top-4 left-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-sm">
              <p className="text-sm text-muted-foreground text-center">
                🎯 <strong>{t('partner.locationPicker.tip')}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
          <p>🔍 <strong>{t('partner.locationPicker.searchLegend')}</strong> {t('partner.locationPicker.searchDescription')}</p>
          <p>🗺️ <strong>{t('partner.locationPicker.mapLegend')}</strong> {t('partner.locationPicker.mapDescription')}</p>
          <p>📍 <strong>{t('partner.locationPicker.locationLegend')}</strong> {t('partner.locationPicker.locationDescription')}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleLocationPicker;