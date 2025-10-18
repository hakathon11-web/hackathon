import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DOMPurify from 'dompurify';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Venue } from '@/hooks/useVenues';
import { getVenuePriceFallback } from '@/utils/venuePricing';
import VenueMapPopup from './VenueMapPopup';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';

interface MapboxVenueMapProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  mapboxToken: string;
  className?: string;
}

// Generate stable coordinates for venues - only called once per venue
const getVenueCoordinates = (venue: Venue) => {
  // If venue has actual coordinates, use them
  if (venue.latitude && venue.longitude) {
    return {
      lat: venue.latitude,
      lng: venue.longitude
    };
  }

  // Fallback: Generate stable coordinates based on venue ID and district
  const tbilisiBase = { lat: 41.7151, lng: 44.8271 };
  
  // Centralized district coordinates (Georgian)
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

  // Use district coordinates if available
  if (districts[venue.district]) {
    const base = districts[venue.district];
    // Generate stable offset based on venue ID
    const hash = venue.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      lat: base.lat + (hash % 100 - 50) * 0.001,
      lng: base.lng + (hash % 100 - 50) * 0.001
    };
  }

  // Fallback to Tbilisi center with stable offset
  const hash = venue.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return {
    lat: tbilisiBase.lat + (hash % 200 - 100) * 0.002,
    lng: tbilisiBase.lng + (hash % 200 - 100) * 0.002
  };
};





// Smart clustering algorithm with distance-based grouping
const clusterVenues = (venuesWithCoords: Array<{ venue: Venue; coordinates: { lat: number; lng: number } }>, zoom: number) => {
  // Show individual markers when zoomed in
  if (zoom >= 14) {
    return venuesWithCoords.map(({ venue, coordinates }) => ({
      type: 'individual' as const,
      venues: [venue],
      coordinates,
      center: coordinates
    }));
  }

  // Cluster venues when zoomed out
  const clusters: Array<{
    type: 'cluster' | 'individual';
    venues: Venue[];
    coordinates: { lat: number; lng: number };
    center: { lat: number; lng: number };
  }> = [];
  
  const processedVenues = new Set<string>();
  const clusterThreshold = zoom < 10 ? 0.015 : 0.008; // Distance threshold based on zoom
  
  venuesWithCoords.forEach(({ venue: currentVenue, coordinates: currentCoords }) => {
    if (processedVenues.has(currentVenue.id)) return;
    
    // Find nearby venues to cluster with
    const clusterGroup = [currentVenue];
    processedVenues.add(currentVenue.id);
    
    venuesWithCoords.forEach(({ venue: otherVenue, coordinates: otherCoords }) => {
      if (processedVenues.has(otherVenue.id) || currentVenue.id === otherVenue.id) return;
      
      // Calculate distance between venues
      const distance = Math.sqrt(
        Math.pow(currentCoords.lat - otherCoords.lat, 2) + 
        Math.pow(currentCoords.lng - otherCoords.lng, 2)
      );
      
      if (distance < clusterThreshold) {
        clusterGroup.push(otherVenue);
        processedVenues.add(otherVenue.id);
      }
    });
    
    // Calculate cluster center
    let centerLat = 0;
    let centerLng = 0;
    
    clusterGroup.forEach(venue => {
      const venueCoords = venuesWithCoords.find(v => v.venue.id === venue.id)?.coordinates;
      if (venueCoords) {
        centerLat += venueCoords.lat;
        centerLng += venueCoords.lng;
      }
    });
    
    const center = {
      lat: centerLat / clusterGroup.length,
      lng: centerLng / clusterGroup.length
    };
    
    clusters.push({
      type: clusterGroup.length > 1 ? 'cluster' : 'individual',
      venues: clusterGroup,
      coordinates: currentCoords,
      center
    });
  });
  
  return clusters;
};

// Function to animate venue convergence during zoom out
const animateMapboxVenueConvergence = (currentZoom: number) => {
  // For now, this will be handled by the clustering logic in marker updates
  // The animation is already built into the cluster formation process
  console.log('Mapbox convergence animation triggered at zoom:', currentZoom);
};

const MapboxVenueMap = ({ 
  venues, 
  selectedVenue, 
  onVenueClick, 
  onBoundsChange, 
  mapboxToken,
  className = "w-full h-full"
}: MapboxVenueMapProps) => {
  const { t } = useTranslation();
  const isDarkMode = useDarkMode();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupVenue, setPopupVenue] = useState<Venue | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUserInteracting = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(11);
  
  // Store stable coordinates in a ref to prevent recalculation
  const stableCoordinates = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // Initialize stable coordinates only once per venue
  useEffect(() => {
    venues.forEach(venue => {
      if (!stableCoordinates.current.has(venue.id)) {
        const coords = getVenueCoordinates(venue);
        stableCoordinates.current.set(venue.id, coords);
        console.log(`Stored stable coordinates for venue ${venue.id}:`, coords);
      }
    });
  }, [venues]);

  // Get venues with their stable coordinates
  const venuesWithCoords = useMemo(() => {
    return venues.map(venue => ({
      venue,
      coordinates: stableCoordinates.current.get(venue.id) || getVenueCoordinates(venue)
    }));
  }, [venues]);

  // Debounced bounds change handler
  const debouncedBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    if (boundsChangeTimeout.current) {
      clearTimeout(boundsChangeTimeout.current);
    }
    
    boundsChangeTimeout.current = setTimeout(() => {
      if (onBoundsChange && !isUserInteracting.current) {
        onBoundsChange(bounds);
      }
    }, 300); // 300ms debounce
  }, [onBoundsChange]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [44.8271, 41.7151], // Tbilisi, Georgia
      zoom: 11,
      pitch: 0,
      bearing: 0
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Enhanced zoom tracking with convergence animation
    let previousZoom = map.current.getZoom();
    
    map.current.on('zoom', () => {
      if (map.current) {
        const currentZoom = map.current.getZoom();
        const isZoomingOut = currentZoom < previousZoom;
        setCurrentZoom(currentZoom);
        
        // Trigger venue convergence animation when zooming out creates clusters
        if (isZoomingOut && currentZoom < 14) {
          setTimeout(() => {
            animateMapboxVenueConvergence(currentZoom);
          }, 150);
        }
        
        previousZoom = currentZoom;
      }
    });

    // Add bounds change listener with debouncing
    map.current.on('moveend', () => {
      if (map.current) {
        const bounds = map.current.getBounds();
        debouncedBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });
      }
    });

    // Track user interactions to prevent unwanted bounds changes
    map.current.on('movestart', () => {
      isUserInteracting.current = true;
    });

    map.current.on('moveend', () => {
      // Small delay to ensure the move is complete
      setTimeout(() => {
        isUserInteracting.current = false;
      }, 100);
    });

    map.current.on('zoomstart', () => {
      isUserInteracting.current = true;
    });

    map.current.on('zoomend', () => {
      // Small delay to ensure the zoom is complete
      setTimeout(() => {
        isUserInteracting.current = false;
      }, 100);
    });

    return () => {
      // Cleanup timeouts
      if (boundsChangeTimeout.current) {
        clearTimeout(boundsChangeTimeout.current);
      }
      
      // Cleanup markers and reset animations for performance
      markers.current.forEach(marker => {
        const markerElement = marker.getElement();
        if (markerElement) {
          // Reset all animation properties
          markerElement.style.animation = '';
          markerElement.style.willChange = 'auto';
          markerElement.style.transform = '';
          markerElement.style.opacity = '';
          markerElement.style.transition = '';
          markerElement.classList.remove('clustering', 'forming-cluster', 'cluster-marker');
        }
        marker.remove();
      });
      markers.current = [];
      
      // Remove custom CSS styles to prevent memory leaks
      const styleElement = document.getElementById('mapbox-pin-styles');
      if (styleElement) {
        styleElement.remove();
      }
      
      // Cleanup map
      map.current?.remove();
    };
  }, [mapboxToken, debouncedBoundsChange, isDarkMode]);

  // Update markers when venues change or zoom changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Cluster venues based on current zoom using stable coordinates
    const clusters = clusterVenues(venuesWithCoords, currentZoom);

    // Add new markers with cluster support and animations
    clusters.forEach((cluster, index) => {
      const coordinates = cluster.center;
      
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = `venue-marker ${cluster.type === 'cluster' ? 'cluster-marker' : 'individual-marker'}`;
      
      if (cluster.type === 'cluster') {
        // Create cluster marker
        const clusterSize = cluster.venues.length;
        const isZoomedOut = currentZoom < 12;
        
        // Sanitize cluster data
        const safeClusterSize = DOMPurify.sanitize(clusterSize.toString());
        
        const clusterHtml = `
          <div class="mapbox-cluster-icon ${isZoomedOut ? 'zoomed-out' : ''}" 
               data-cluster-size="${safeClusterSize}"
               style="
                 width: ${isZoomedOut ? '44px' : '54px'};
                 height: ${isZoomedOut ? '44px' : '54px'};
                 border-radius: 50%;
                 background: linear-gradient(135deg, #FF385C, #E31C5F);
                 color: white;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 font-weight: 700;
                 font-size: ${isZoomedOut ? '12px' : '15px'};
                 box-shadow: 0 4px 12px rgba(255, 56, 92, 0.3);
                 transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                 cursor: pointer;
               ">
            ${safeClusterSize}
          </div>
        `;
        
        markerEl.innerHTML = DOMPurify.sanitize(clusterHtml);

        // Add cluster click handler to zoom in
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Calculate bounds for all venues in cluster
          const bounds = new mapboxgl.LngLatBounds();
          cluster.venues.forEach(venue => {
            const venueCoords = venuesWithCoords.find(v => v.venue.id === venue.id)?.coordinates;
            if (venueCoords) {
              bounds.extend([venueCoords.lng, venueCoords.lat]);
            }
          });
          
          // Zoom to show all clustered venues
          map.current?.fitBounds(bounds, {
            padding: 50,
            maxZoom: 16
          });
        });

        // Enhanced cluster formation with venue convergence effect
        requestAnimationFrame(() => {
          // First, animate individual venues converging to this cluster center
          const clusterPos = coordinates;
          const convergingVenues = cluster.venues;
          
          convergingVenues.forEach((venue, venueIndex) => {
            const originalCoords = venuesWithCoords.find(v => v.venue.id === venue.id)?.coordinates;
            if (originalCoords && (Math.abs(originalCoords.lat - clusterPos.lat) > 0.001 || Math.abs(originalCoords.lng - clusterPos.lng) > 0.001)) {
              
              // Find any existing individual venue markers that should converge
              const existingMarkers = markers.current.filter(existingMarker => {
                const markerPos = existingMarker.getLngLat();
                return Math.abs(markerPos.lat - originalCoords.lat) < 0.0001 && Math.abs(markerPos.lng - originalCoords.lng) < 0.0001;
              });
              
              existingMarkers.forEach(existingMarker => {
                const venueElement = existingMarker.getElement();
                if (venueElement) {
                  // Calculate movement vector
                  const dx = (clusterPos.lng - originalCoords.lng) * 100000; // Scale for pixel movement
                  const dy = (clusterPos.lat - originalCoords.lat) * 100000;
                  
                  // Set CSS variables and animate
                  venueElement.style.setProperty('--dx', `${dx}px`);
                  venueElement.style.setProperty('--dy', `${dy}px`);
                  venueElement.classList.add('clustering');
                  
                  setTimeout(() => {
                    venueElement.style.animation = `mapboxVenueConverge 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
                  }, venueIndex * 60);
                  
                  // Remove the individual marker after convergence
                  setTimeout(() => {
                    existingMarker.remove();
                    const markerIndex = markers.current.indexOf(existingMarker);
                    if (markerIndex > -1) {
                      markers.current.splice(markerIndex, 1);
                    }
                  }, 400 + (venueIndex * 60));
                }
              });
            }
          });
          
          // Then show the cluster marker with collision effect after convergence
          markerEl.style.transform = 'scale3d(0.1, 0.1, 1)';
          markerEl.style.opacity = '0';
          
          setTimeout(() => {
            markerEl.style.animation = 'mapboxClusterCollisionForm 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
          }, 300 + (convergingVenues.length * 30)); // Wait for venues to converge
        });

      } else {
        // Individual venue marker
        const venue = cluster.venues[0];
        const minPrice = getVenuePriceFallback(venue);
        const isZoomedOut = currentZoom < 12;
        const isSelected = selectedVenue?.id === venue.id;
        
        // Sanitize venue data to prevent XSS
        const safeVenueId = DOMPurify.sanitize(venue.id.toString());
        const safeMinPrice = DOMPurify.sanitize(minPrice.toString());
        
        const svgContent = `
          <svg class="location-pin ${isZoomedOut ? 'zoomed-out' : ''} ${isSelected ? 'selected' : ''}" 
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
              ${safeMinPrice} ${t('booking.currency')}
            </text>
          </svg>
        `;
        
        markerEl.innerHTML = DOMPurify.sanitize(svgContent);

        // Add venue click handler
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setPopupVenue(venue);
          setShowPopup(true);
          onVenueClick?.(venue);

          // Calculate popup position
          const rect = mapContainer.current?.getBoundingClientRect();
          if (rect) {
            const mapPoint = map.current?.project([coordinates.lng, coordinates.lat]);
            if (mapPoint) {
              setPopupPosition({
                x: mapPoint.x,
                y: mapPoint.y - 10
              });
            }
          }
        });
      }

      // Create and add marker to map
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map.current);

      markers.current.push(marker);
    });

    // Remove any existing mapbox pin styles to prevent conflicts
    const existingStyle = document.getElementById('mapbox-pin-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add modern marker styles with smooth animations
    const style = document.createElement('style');
    style.id = 'mapbox-pin-styles';
    style.textContent = `
      /* Individual venue markers */
      .location-pin {
        cursor: pointer;
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
        will-change: auto;
      }
      .location-pin:hover {
        transform: scale3d(1.1, 1.1, 1);
        z-index: 10 !important;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
      }
      .location-pin.selected {
        transform: scale3d(1.1, 1.1, 1);
        z-index: 11 !important;
        filter: drop-shadow(0 8px 16px rgba(37, 99, 235, 0.3));
      }
      .location-pin .pin-body {
        fill: #475569;
        stroke: white;
        stroke-width: 2;
        transition: fill 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .location-pin .pin-inner {
        fill: white;
        stroke: none;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .location-pin .price-text {
        fill: #374151;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        transition: fill 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .location-pin:hover .pin-body,
      .location-pin.selected .pin-body {
        fill: #2563EB;
      }
      .location-pin:hover .pin-inner,
      .location-pin.selected .pin-inner {
        fill: white;
      }
      .location-pin:hover .price-text,
      .location-pin.selected .price-text {
        fill: #2563EB;
      }
      
      /* Cluster markers */
      .mapbox-cluster-icon {
        will-change: transform;
      }
      .mapbox-cluster-icon:hover {
        transform: scale3d(1.15, 1.15, 1) !important;
        box-shadow: 0 8px 20px rgba(255, 56, 92, 0.4) !important;
      }
      
      /* Venue marker containers */
      .venue-marker {
        position: relative;
        z-index: 1;
        will-change: auto;
      }
      
      .venue-marker.individual-marker {
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      .venue-marker.cluster-marker {
        z-index: 10;
      }
      
      /* Enhanced venue convergence animation */
      @keyframes mapboxVenueConverge {
        0% { 
          transform: scale3d(1, 1, 1) translate3d(0, 0, 0);
          opacity: 1;
        }
        20% {
          transform: scale3d(1.03, 1.03, 1) translate3d(calc(var(--dx, 0) * 0.1), calc(var(--dy, 0) * 0.1), 0);
          opacity: 1;
        }
        50% {
          transform: scale3d(0.9, 0.9, 1) translate3d(calc(var(--dx, 0) * 0.5), calc(var(--dy, 0) * 0.5), 0);
          opacity: 0.8;
        }
        80% {
          transform: scale3d(0.5, 0.5, 1) translate3d(calc(var(--dx, 0) * 0.85), calc(var(--dy, 0) * 0.85), 0);
          opacity: 0.4;
        }
        100% { 
          transform: scale3d(0.1, 0.1, 1) translate3d(var(--dx, 0), var(--dy, 0), 0);
          opacity: 0;
        }
      }

      /* Cluster collision formation animation */
      @keyframes mapboxClusterCollisionForm {
        0% { 
          transform: scale3d(0.1, 0.1, 1) rotate(0deg);
          opacity: 0;
          filter: blur(3px) brightness(1.8);
        }
        30% { 
          transform: scale3d(1.2, 1.2, 1) rotate(180deg);
          opacity: 0.7;
          filter: blur(1px) brightness(1.3);
        }
        60% { 
          transform: scale3d(0.85, 0.85, 1) rotate(300deg);
          opacity: 0.9;
          filter: blur(0.5px) brightness(1.1);
        }
        100% { 
          transform: scale3d(1, 1, 1) rotate(360deg);
          opacity: 1;
          filter: blur(0px) brightness(1);
        }
      }
      
      /* Clustering state classes for animation control */
      .venue-marker.clustering {
        will-change: transform, opacity;
        animation-fill-mode: forwards;
      }
      
      .venue-marker.forming-cluster {
        animation: mapboxClusterForm 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(style);
  }, [venuesWithCoords, selectedVenue, onVenueClick, currentZoom]);

  // Close popup when clicking on map
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = () => {
      setShowPopup(false);
      setPopupVenue(null);
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Venue Popup */}
      {showPopup && popupVenue && (
        <div
          className="absolute z-50 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
            pointerEvents: 'auto'
          }}
        >
          <VenueMapPopup
            venue={popupVenue}
            onClose={() => {
              setShowPopup(false);
              setPopupVenue(null);
            }}
          />
        </div>
      )}
      
      {/* Map attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
        {t('map.mapAttribution')}
      </div>
    </div>
  );
};

export default MapboxVenueMap;