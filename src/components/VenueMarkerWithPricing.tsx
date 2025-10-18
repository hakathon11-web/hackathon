import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import mapboxgl from 'mapbox-gl';
import { Venue } from '@/hooks/useVenues';
import { useVenuePrice } from '@/utils/venuePricing';
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';

interface VenueMarkerWithPricingProps {
  venue: Venue;
  coordinates: { lat: number; lng: number };
  currentZoom: number;
  selectedVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  setPopupVenue: (venue: Venue | null) => void;
  setShowPopup: (show: boolean) => void;
  setPopupPosition: (position: { x: number; y: number }) => void;
  mapContainer: React.RefObject<HTMLDivElement>;
  map: any; // Map instance (Google Maps or Mapbox)
  mapType: 'google' | 'mapbox';
}

const VenueMarkerWithPricing: React.FC<VenueMarkerWithPricingProps> = ({
  venue,
  coordinates,
  currentZoom,
  selectedVenue,
  onVenueClick,
  setPopupVenue,
  setShowPopup,
  setPopupPosition,
  mapContainer,
  map,
  mapType
}) => {
  const { price } = useVenuePrice(venue.id);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !mapContainer.current) return;

      // Check if venue is currently closed (not bookable due to time constraints)
  const isClosedToday = !isVenueBookableNow(venue.working_hours);

    // Use the calculated price or fallback to venue price
    const displayPrice = price || venue.price || 25;

    if (mapType === 'google') {
      // Google Maps marker creation
      const marker = new google.maps.Marker({
        position: coordinates,
        map: map,
        title: venue.name,
        icon: createGoogleMarkerIcon(displayPrice, isClosedToday),
        clickable: true,
        draggable: false,
        zIndex: 1
      });

      // Add click handler
      marker.addListener('click', (e: any) => {
        e.stop();
        setPopupVenue(venue);
        setShowPopup(true);
        onVenueClick?.(venue);

        // Calculate popup position
        const rect = mapContainer.current?.getBoundingClientRect();
        if (rect) {
          const mapPoint = map.getProjection()?.fromLatLngToPoint(coordinates);
          if (mapPoint) {
            setPopupPosition({
              x: mapPoint.x,
              y: mapPoint.y - 10
            });
          }
        }
      });

      markerRef.current = marker;
    } else if (mapType === 'mapbox') {
      // Mapbox marker creation
      const markerEl = document.createElement('div');
      markerEl.className = 'venue-marker';
      
      const isZoomedOut = currentZoom < 12;
      
      // Sanitize venue data to prevent XSS
      const safeVenueId = DOMPurify.sanitize(venue.id.toString());
      const safeDisplayPrice = DOMPurify.sanitize(displayPrice.toString());
      const priceText = isClosedToday ? 'Closed' : `${safeDisplayPrice} GEL`;
      
      const svgContent = `
        <svg class="location-pin ${isZoomedOut ? 'zoomed-out' : ''} ${selectedVenue?.id === venue.id ? 'selected' : ''} ${isClosedToday ? 'closed' : ''}" 
             data-venue-id="${safeVenueId}"
             width="${isZoomedOut ? '40' : '50'}" 
             height="${isZoomedOut ? '48' : '60'}" 
             viewBox="0 0 50 60" 
             xmlns="http://www.w3.org/2000/svg">
          <!-- Pin shape -->
          <path d="M25 0C11.2 0 0 11.2 0 25c0 18.75 25 35 25 35s25-16.25 25-35C50 11.2 38.8 0 25 0z" 
                class="pin-body" />
          <!-- Inner circle for text background -->
          <circle cx="25" cy="22" r="18" class="pin-inner" />
          <!-- Price text -->
          <text x="25" y="22" 
                text-anchor="middle" 
                dominant-baseline="middle" 
                class="price-text"
                font-size="${isZoomedOut ? '10' : '11'}">
            ${priceText}
          </text>
        </svg>
      `;
      
      markerEl.innerHTML = DOMPurify.sanitize(svgContent);

      // Add click handler
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setPopupVenue(venue);
        setShowPopup(true);
        onVenueClick?.(venue);

        // Calculate popup position
        const rect = mapContainer.current?.getBoundingClientRect();
        if (rect) {
          const mapPoint = map.project([coordinates.lng, coordinates.lat]);
          if (mapPoint) {
            setPopupPosition({
              x: mapPoint.x,
              y: mapPoint.y - 10
            });
          }
        }
      });

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map);

      markerRef.current = marker;
      
      // Ensure styles are loaded for this component
      if (!document.getElementById('venue-marker-pin-styles')) {
        const style = document.createElement('style');
        style.id = 'venue-marker-pin-styles';
        style.textContent = `
          .location-pin {
            cursor: pointer;
            transition: transform 0.2s ease;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }
          .location-pin:hover {
            transform: scale(1.1);
            z-index: 10 !important;
          }
          .location-pin.selected {
            transform: scale(1.1);
            z-index: 11 !important;
          }
          .location-pin .pin-body {
            fill: #ef4444;
            stroke: white;
            stroke-width: 1.5;
            transition: fill 0.2s ease;
          }
          .location-pin .pin-inner {
            fill: white;
            stroke: none;
            transition: fill 0.2s ease;
          }
          .location-pin .price-text {
            fill: #374151;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 600;
            transition: fill 0.2s ease;
          }
          .location-pin:hover .pin-body,
          .location-pin.selected .pin-body {
            fill: #1f2937;
          }
          .location-pin:hover .pin-inner,
          .location-pin.selected .pin-inner {
            fill: white;
          }
          .location-pin:hover .price-text,
          .location-pin.selected .price-text {
            fill: #1f2937;
          }
          .location-pin.closed .pin-body {
            fill: #9ca3af;
            stroke: #6b7280;
          }
          .location-pin.closed .pin-inner {
            fill: #f3f4f6;
          }
          .location-pin.closed .price-text {
            fill: #6b7280;
          }
          .location-pin.closed:hover .pin-body {
            fill: #6b7280;
          }
          .location-pin.closed:hover .pin-inner {
            fill: #e5e7eb;
          }
          .location-pin.closed:hover .price-text {
            fill: #4b5563;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Cleanup function
    return () => {
      if (markerRef.current) {
        if (mapType === 'google') {
          markerRef.current.setMap(null);
        } else if (mapType === 'mapbox') {
          markerRef.current.remove();
        }
      }
    };
  }, [venue.id, coordinates, currentZoom, selectedVenue?.id, price, onVenueClick, setPopupVenue, setShowPopup, setPopupPosition, mapContainer, map, mapType]);

  return null; // This component doesn't render anything visible
};

// Helper function to create Google Maps marker icon
const createGoogleMarkerIcon = (price: number, isClosed: boolean = false) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = 50;
  canvas.height = 60;

  // Add shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Draw pin shape
  ctx.fillStyle = isClosed ? '#9ca3af' : '#ef4444';
  ctx.strokeStyle = isClosed ? '#6b7280' : '#ffffff';
  ctx.lineWidth = 1.5;
  
  // Create pin path
  ctx.beginPath();
  // Top circle part
  ctx.arc(25, 25, 25, Math.PI * 1.15, Math.PI * -0.15, false);
  // Bottom point
  ctx.bezierCurveTo(45, 35, 35, 50, 25, 60);
  ctx.bezierCurveTo(15, 50, 5, 35, 5, 25);
  ctx.closePath();
  
  ctx.fill();
  ctx.stroke();
  
  // Remove shadow for inner elements
  ctx.shadowColor = 'transparent';
  
  // Draw inner white circle
  ctx.fillStyle = isClosed ? '#f3f4f6' : '#ffffff';
  ctx.beginPath();
  ctx.arc(25, 22, 18, 0, Math.PI * 2);
  ctx.fill();

  // Add price text
  ctx.fillStyle = isClosed ? '#6b7280' : '#374151';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isClosed ? 'Closed' : `${price} GEL`, 25, 22);

  return {
    url: canvas.toDataURL(),
    scaledSize: new google.maps.Size(50, 60),
    anchor: new google.maps.Point(25, 60), // Bottom center of pin
    origin: new google.maps.Point(0, 0)
  };
};

export default VenueMarkerWithPricing;
