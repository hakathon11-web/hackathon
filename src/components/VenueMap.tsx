import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface VenueMapProps {
  location: string;
  venueName: string;
}

// Mock function to generate coordinates based on location
const getVenueCoordinates = (location: string) => {
  const locations: { [key: string]: { lat: number, lng: number } } = {
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Houston': { lat: 29.7604, lng: -95.3698 },
    'Phoenix': { lat: 33.4484, lng: -112.0740 },
    'Philadelphia': { lat: 39.9526, lng: -75.1652 },
    'San Antonio': { lat: 29.4241, lng: -98.4936 },
    'San Diego': { lat: 32.7157, lng: -117.1611 },
    'Dallas': { lat: 32.7767, lng: -96.7970 },
    'San Jose': { lat: 37.3382, lng: -121.8863 },
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'Jacksonville': { lat: 30.3322, lng: -81.6557 },
    'Fort Worth': { lat: 32.7555, lng: -97.3308 },
    'Columbus': { lat: 39.9612, lng: -82.9988 },
    'Charlotte': { lat: 35.2271, lng: -80.8431 },
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'Indianapolis': { lat: 39.7684, lng: -86.1581 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
    'Denver': { lat: 39.7392, lng: -104.9903 },
    'Washington DC': { lat: 38.9072, lng: -77.0369 },
  };

  // Return coordinates if found, otherwise generate based on string hash
  if (locations[location]) {
    return locations[location];
  }

  // Generate pseudo-random coordinates based on location string
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    const char = location.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const lat = 40 + (hash % 20) - 10; // Between 30-50
  const lng = -100 + (hash % 50) - 25; // Between -125 to -75
  
  return { lat, lng };
};

const VenueMap = ({ location, venueName }: VenueMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const coordinates = getVenueCoordinates(location);

  useEffect(() => {
    if (!mapRef.current) return;

    // Sanitize user-provided data to prevent XSS
    const safeVenueName = DOMPurify.sanitize(venueName);
    const safeLocation = DOMPurify.sanitize(location);
    const safeLatitude = DOMPurify.sanitize(coordinates.lat.toFixed(4));
    const safeLongitude = DOMPurify.sanitize(coordinates.lng.toFixed(4));

    // Create a simple map placeholder with the venue location
    const mapElement = mapRef.current;
    const mapContent = `
      <div class="relative w-full h-full bg-muted rounded-lg overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center space-y-4">
            <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto shadow-lg">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-foreground">${safeVenueName}</p>
              <p class="text-sm text-muted-foreground">${safeLocation}</p>
              <p class="text-xs text-muted-foreground mt-1">Lat: ${safeLatitude}, Lng: ${safeLongitude}</p>
            </div>
          </div>
        </div>
        <div class="absolute bottom-4 left-4 right-4">
          <div class="bg-background/80 backdrop-blur-sm rounded-lg p-3 text-center">
            <p class="text-sm text-muted-foreground">Interactive map integration coming soon</p>
          </div>
        </div>
      </div>
    `;
    
    mapElement.innerHTML = DOMPurify.sanitize(mapContent);
  }, [location, venueName, coordinates]);

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Venue Location</h3>
        </div>
        <div 
          ref={mapRef} 
          className="w-full h-64"
        />
      </CardContent>
    </Card>
  );
};

export default VenueMap;