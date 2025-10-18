
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Venue, useVenueServices } from "@/hooks/useVenues";
import { getServicePricingSummary, extractNumericPrice } from "@/utils/guestPricing";
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from "@/utils/workingHours";
import { MapPin, MapPinOff, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import VenueMapPopup from "@/components/VenueMapPopup";

interface InteractiveMapProps {
  venues: Venue[];
  onBoundsChange: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onVenueClick?: (venue: Venue) => void;
  selectedVenue?: Venue | null;
  mapCenter?: { lat: number; lng: number } | null;
}

interface VenueMarker extends Venue {
  x: number;
  y: number;
  lat: number;
  lng: number;
}

const InteractiveMap = ({ venues, onBoundsChange, onVenueClick, selectedVenue, mapCenter }: InteractiveMapProps) => {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [venueMarkers, setVenueMarkers] = useState<VenueMarker[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Update map center when mapCenter prop changes (venue hover)
  useEffect(() => {
    if (mapCenter) {
      const x = ((mapCenter.lng + 74.0060) * 10000) % 800;
      const y = ((mapCenter.lat - 40.7128) * 10000) % 600;
      setCenter({ x: -x + 400, y: -y + 300 }); // Center the venue
    }
  }, [mapCenter]);

  // Generate venue markers with coordinates
  useEffect(() => {
    const markers = venues.map(venue => {
      const hash = venue.location.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const lat = 40.7128 + (hash % 1000) / 10000;
      const lng = -74.0060 + (hash % 2000) / 10000;
      
      // Convert lat/lng to screen coordinates (simplified projection)
      const x = ((lng + 74.0060) * 10000) % 800;
      const y = ((lat - 40.7128) * 10000) % 600;
      
      return {
        ...venue,
        x,
        y,
        lat,
        lng
      };
    });
    
    setVenueMarkers(markers);
  }, [venues]);

  // Update bounds when zoom or center changes
  useEffect(() => {
    const mapWidth = 800 * zoom;
    const mapHeight = 600 * zoom;
    
    const bounds = {
      north: 40.7628 + (center.y + mapHeight/2) / 10000,
      south: 40.6628 + (center.y - mapHeight/2) / 10000,
      east: -73.9060 + (center.x + mapWidth/2) / 10000,
      west: -74.1060 + (center.x - mapWidth/2) / 10000
    };
    
    onBoundsChange(bounds);
  }, [zoom, center, onBoundsChange]);

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

  const handleVenueMarkerClick = (venue: VenueMarker, event: React.MouseEvent) => {
    event.stopPropagation();
    onVenueClick?.(venue);
    
    // Calculate popup position
    const rect = mapRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setShowPopup(true);
    }
  };

  return (
    <div className="relative w-full h-full bg-muted/20 overflow-hidden">
      {/* Map Background */}
      <div
        ref={mapRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${center.x}px, ${center.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => setShowPopup(false)}
      >
        {/* Map Grid */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Venue Markers */}
        {venueMarkers.map((venue) => {
          const VenueMarker = () => {
            const { data: markerServices } = useVenueServices(venue.id);
            
              // Check if venue is currently closed (not bookable due to time constraints)
  const isClosedToday = !isVenueBookableNow(venue.working_hours);
            
            return (
              <div
                key={venue.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
                style={{
                  left: venue.x,
                  top: venue.y
                }}
                onClick={(e) => handleVenueMarkerClick(venue, e)}
              >
                <div className="relative">
                  {isClosedToday ? (
                    <MapPinOff className="w-8 h-8 text-muted-foreground fill-muted-foreground drop-shadow-lg" />
                  ) : (
                    <MapPin className="w-8 h-8 text-primary fill-primary drop-shadow-lg" />
                  )}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isClosedToday 
                      ? 'bg-muted-foreground text-muted' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {isClosedToday ? (
                      'Closed'
                    ) : (
                      markerServices && markerServices.length > 0 ? (() => {
                        const prices = markerServices.map(service => {
                          const displayPrice = getServicePricingSummary(service, t);
                          return extractNumericPrice(displayPrice) || service.price;
                        });
                        return Math.min(...prices);
                      })() : '?'
                    )} {!isClosedToday && 'GEL'}
                  </div>
                </div>
              </div>
            );
          };
          
          return <VenueMarker key={venue.id} />;
        })}
      </div>

      {/* Venue Popup */}
      {showPopup && selectedVenue && (
        <div
          className="absolute z-30 transform -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: popupPosition.x,
            top: popupPosition.y
          }}
        >
          <VenueMapPopup
            venue={selectedVenue}
            onClose={() => setShowPopup(false)}
          />
        </div>
      )}

      {/* Map Controls */}
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

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm z-20">
        <p className="text-muted-foreground">
          Zoom: {zoom.toFixed(1)}x • {venueMarkers.length} venues shown
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground z-20">
        Drag to pan • Scroll to zoom • Hover markers for details
      </div>
    </div>
  );
};

export default InteractiveMap;
