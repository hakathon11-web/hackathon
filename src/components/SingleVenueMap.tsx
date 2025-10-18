import { useEffect, useRef, useState } from "react";
import { MapPin, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDarkMode } from "@/hooks/useDarkMode";

interface SingleVenueMapProps {
  location: string;
  venueName: string;
}

// Mock function to get coordinates from location
const getVenueCoordinates = (location: string) => {
  const locationMap: { [key: string]: { lat: number; lng: number } } = {
    "New York": { lat: 40.7128, lng: -74.0060 },
    "Los Angeles": { lat: 34.0522, lng: -118.2437 },
    "Chicago": { lat: 41.8781, lng: -87.6298 },
    "Houston": { lat: 29.7604, lng: -95.3698 },
    "Phoenix": { lat: 33.4484, lng: -112.0740 },
    "Philadelphia": { lat: 39.9526, lng: -75.1652 },
    "San Antonio": { lat: 29.4241, lng: -98.4936 },
    "San Diego": { lat: 32.7157, lng: -117.1611 },
    "Dallas": { lat: 32.7767, lng: -96.7970 },
    "San Jose": { lat: 37.3382, lng: -121.8863 },
    "Rustaveli": { lat: 41.6977, lng: 44.8015 },
    "Tbilisi": { lat: 41.7151, lng: 44.8271 },
  };

  if (locationMap[location]) {
    return locationMap[location];
  }

  // Generate pseudo-random coordinates based on location string
  const hash = location.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return {
    lat: 40.7128 + (hash % 1000) / 10000, // Around New York area
    lng: -74.0060 + (hash % 2000) / 10000
  };
};

const SingleVenueMap = ({ location, venueName }: SingleVenueMapProps) => {
  const isDarkMode = useDarkMode();
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const coordinates = getVenueCoordinates(location);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - center.x, y: e.clientY - center.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCenter({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setShowTokenInput(false);
      // Initialize actual Mapbox map here
      initializeMapbox();
    }
  };

  const initializeMapbox = async () => {
    if (!mapRef.current || !mapboxToken) return;

    try {
      // Dynamically import mapbox-gl
      const mapboxgl = await import('mapbox-gl');
      
      // Set the access token
      (mapboxgl as any).accessToken = mapboxToken;
      
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
        center: [coordinates.lng, coordinates.lat],
        zoom: 15,
      });

      // Add marker for the venue
      new mapboxgl.Marker()
        .setLngLat([coordinates.lng, coordinates.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${venueName}</h3>
                <p class="text-sm text-gray-600">${location}</p>
                <p class="text-xs text-gray-500">Lat: ${coordinates.lat.toFixed(4)}, Lng: ${coordinates.lng.toFixed(4)}</p>
              </div>
            `)
        )
        .addTo(map);

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
    }
  };

  if (showTokenInput) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <h3 className="text-lg font-semibold">Mapbox Integration Required</h3>
        <p className="text-sm text-muted-foreground text-center">
          To view the interactive map, please enter your Mapbox public token.
          <br />
          Get your token from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
        </p>
        <div className="flex gap-2 w-full max-w-md">
          <Input
            type="text"
            placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSI..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleTokenSubmit}
            disabled={!mapboxToken.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
          >
            Load Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-muted/20 overflow-hidden">
      {/* Mapbox container */}
      <div ref={mapRef} className="absolute inset-0" />
      
      {/* Fallback placeholder if Mapbox fails */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${center.x}px, ${center.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          display: mapboxToken ? 'none' : 'block'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Map Grid */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="single-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#single-grid)" />
        </svg>

        {/* Venue Marker */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{
            left: '50%',
            top: '50%'
          }}
        >
          <div className="relative animate-bounce">
            <MapPin className="w-12 h-12 text-primary fill-primary drop-shadow-lg" />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm min-w-fit">
              <div className="font-semibold">{venueName}</div>
              <div className="text-muted-foreground text-xs">{location}</div>
              <div className="text-xs text-muted-foreground">
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Controls - only show for fallback */}
      {!mapboxToken && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <Button
            size="icon"
            variant="outline"
            onClick={handleZoomIn}
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
            className="bg-background/90 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleZoomOut}
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
            className="bg-background/90 backdrop-blur-sm"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm z-20">
        <p className="text-muted-foreground">
          {mapboxToken ? 'Interactive Mapbox Map' : `Zoom: ${zoom.toFixed(1)}x • Mock coordinates`}
        </p>
      </div>
    </div>
  );
};

export default SingleVenueMap;