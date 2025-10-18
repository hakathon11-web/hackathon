import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { Venue } from '@/hooks/useVenues';
import { getVenuePriceFallback } from '@/utils/venuePricing';
import VenueMapPopup from './VenueMapPopup';
import { TBILISI_DISTRICT_EN } from '@/constants/districts';
import { useDarkMode } from '@/hooks/useDarkMode';

interface GoogleVenueMapProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  googleMapsApiKey: string;
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

// Smart clustering algorithm for Google Maps
const clusterGoogleVenues = (venuesWithCoords: Array<{ venue: Venue; coordinates: { lat: number; lng: number } }>, zoom: number) => {
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
const animateGoogleVenueConvergence = (currentZoom: number) => {
  // The convergence animation is already built into the cluster formation process
  // This will be triggered during marker updates when clusters form
  console.log('Google Maps convergence animation triggered at zoom:', currentZoom);
};

const GoogleVenueMap = ({ 
  venues, 
  selectedVenue, 
  onVenueClick, 
  onBoundsChange, 
  googleMapsApiKey,
  className = "w-full h-full"
}: GoogleVenueMapProps) => {
  const { t } = useTranslation();
  const isDarkMode = useDarkMode();
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const infoWindows = useRef<google.maps.InfoWindow[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupVenue, setPopupVenue] = useState<Venue | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUserInteracting = useRef(false);
  const activeInfoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [currentZoom, setCurrentZoom] = useState(11);
  const currentZoomRef = useRef(11);
  
  // Store stable coordinates in a ref to prevent recalculation
  const stableCoordinates = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // Initialize stable coordinates only once per venue
  useEffect(() => {
    venues.forEach(venue => {
      if (!stableCoordinates.current.has(venue.id)) {
        const coords = getVenueCoordinates(venue);
        stableCoordinates.current.set(venue.id, coords);
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

  // Helper function to get the correct price for a venue
  const getVenuePrice = (venue: Venue) => {
    return getVenuePriceFallback(venue);
  };

  // Helper function to create modern venue marker icon
  const createMarkerIcon = (price: number, selected: boolean = false) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 80;
    canvas.height = 40;

    // Modern color scheme
    const bgColor = selected ? '#2563EB' : '#475569';
    const textColor = '#ffffff';

    // Draw modern rounded rectangle
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();

    // Add price text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${price} ${t('booking.currency')}`, canvas.width / 2, canvas.height / 2);

    return {
      url: canvas.toDataURL(),
      scaledSize: new google.maps.Size(canvas.width, canvas.height),
      anchor: new google.maps.Point(canvas.width / 2, canvas.height),
      origin: new google.maps.Point(0, 0)
    };
  };

  // Helper function to create cluster marker icon
  const createClusterIcon = (count: number, size: 'small' | 'medium' | 'large' = 'small') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Modern sizing
    let diameter, fontSize;
    switch (size) {
      case 'small':
        diameter = 50;
        fontSize = 14;
        break;
      case 'medium':
        diameter = 60;
        fontSize = 16;
        break;
      case 'large':
        diameter = 70;
        fontSize = 18;
        break;
    }

    canvas.width = diameter;
    canvas.height = diameter;

    const centerX = diameter / 2;
    const centerY = diameter / 2;
    const radius = diameter / 2;

    // Create modern gradient
    const gradient = ctx.createLinearGradient(0, 0, diameter, diameter);
    gradient.addColorStop(0, '#FF385C');
    gradient.addColorStop(1, '#E31C5F');

    // Draw cluster circle with shadow
    ctx.shadowColor = 'rgba(255, 56, 92, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.fill();

    // Remove shadow for text
    ctx.shadowColor = 'transparent';

    // Add white border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add count text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count.toString(), centerX, centerY);

    return {
      url: canvas.toDataURL(),
      scaledSize: new google.maps.Size(diameter, diameter),
      anchor: new google.maps.Point(centerX, centerY),
      origin: new google.maps.Point(0, 0)
    };
  };

  // Helper function to create hover tooltip content
  const createTooltipContent = (venue: Venue) => {
    const price = getVenuePrice(venue);
    const firstImage = venue.images && venue.images.length > 0 ? venue.images[0] : '/placeholder.svg';
    const imageCount = venue.images ? venue.images.length : 0;
    
    // Get translated district name
    const isEnglish = (t as any).i18n?.language === 'en';
    const displayDistrict = venue.district && isEnglish 
      ? TBILISI_DISTRICT_EN[venue.district as keyof typeof TBILISI_DISTRICT_EN] || venue.district
      : venue.district;
    
    return `
      <div class="airbnb-venue-card" style="
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        overflow: hidden;
        font-family: Circular, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, sans-serif;
        cursor: default;
        border: 1px solid #ebebeb;
        transition: transform 0.2s ease;
      ">
        <!-- Image Container -->
        <div style="position: relative; height: 200px; background: #f7f7f7;">
          <img src="${firstImage}" alt="${venue.name}" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          " onerror="this.src='/placeholder.svg'">
          
          <!-- Overlay Buttons -->
          <div style="
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            gap: 8px;
          ">
            <!-- Heart Button -->
            <div class="heart-btn" style="
              width: 32px;
              height: 32px;
              background: rgba(255,255,255,0.9);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 16px;
              color: #222222;
              transition: all 0.2s ease;
            ">♡</div>
            
            <!-- Close Button -->
            <div class="close-btn" style="
              width: 32px;
              height: 32px;
              background: rgba(255,255,255,0.9);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 18px;
              color: #222222;
              font-weight: 300;
              transition: all 0.2s ease;
            ">×</div>
          </div>
          
          <!-- Image Dots -->
          ${imageCount > 1 ? `
            <div style="
              position: absolute;
              bottom: 12px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 6px;
            ">
              ${Array.from({ length: Math.min(imageCount, 5) }, (_, i) => `
                <div style="
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: ${i === 0 ? 'white' : 'rgba(255,255,255,0.6)'};
                  border: ${i === 0 ? 'none' : '1px solid rgba(255,255,255,0.6)'};
                "></div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <!-- Content Section -->
        <div style="padding: 12px;">
          <!-- Title and Rating Row -->
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
          ">
            <div style="
              font-weight: 600;
              font-size: 15px;
              line-height: 20px;
              color: #222222;
              flex: 1;
              margin-right: 12px;
            ">${venue.name}</div>
            
            ${venue.rating ? `
              <div style="
                display: flex;
                align-items: center;
                font-size: 14px;
                color: #222222;
                white-space: nowrap;
              ">
                <span style="margin-right: 4px;">★</span>
                <span style="font-weight: 500;">${venue.rating}</span>
                <span style="color: #717171; margin-left: 4px;">(${venue.review_count || 0})</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Location -->
          <div style="
            font-size: 14px;
            color: #717171;
            margin-bottom: 4px;
            line-height: 18px;
          ">📍 ${displayDistrict}</div>
          

          
          <!-- Price -->
          <div style="
            font-size: 15px;
            color: #222222;
            margin-bottom: 12px;
            line-height: 18px;
          ">
            <span style="font-weight: 600;">${price} ${t('booking.currency')}</span>
            <span style="font-weight: 400; color: #717171;"> per hour</span>
          </div>
          
          <!-- View Details Button -->
          <div class="view-details-btn" style="
            background: #222222;
            color: white;
            text-align: center;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease;
            user-select: none;
            line-height: 18px;
          ">View Details</div>
        </div>
      </div>
    `;
  };

  // Debounced bounds change handler
  const debouncedBoundsChange = useCallback((bounds: google.maps.LatLngBounds) => {
    if (boundsChangeTimeout.current) {
      clearTimeout(boundsChangeTimeout.current);
    }
    
    boundsChangeTimeout.current = setTimeout(() => {
      if (onBoundsChange && !isUserInteracting.current) {
        onBoundsChange({
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng()
        });
      }
    }, 300);
  }, [onBoundsChange]);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || !googleMapsApiKey) {
      console.log('GoogleVenueMap: Missing mapRef or API key', { 
        hasMapRef: !!mapRef.current, 
        hasApiKey: !!googleMapsApiKey 
      });
      return;
    }

    // Check if Google Maps is loaded
    if (!window.google || !window.google.maps) {
      console.log('GoogleVenueMap: Google Maps not loaded yet');
      return;
    }

    console.log('GoogleVenueMap: Initializing map with', venuesWithCoords.length, 'venues');

    const mapOptions: google.maps.MapOptions = {
      center: { lat: 41.7151, lng: 44.8271 }, // Tbilisi, Georgia
      zoom: 11,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      gestureHandling: 'greedy', // Enable single-finger navigation on mobile
      
      // Use Google's native dark mode color scheme
      colorScheme: isDarkMode ? google.maps.ColorScheme.DARK : google.maps.ColorScheme.LIGHT,
      
      // Hide POI and transit labels for cleaner look
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    try {
      map.current = new google.maps.Map(mapRef.current, mapOptions);
      console.log('GoogleVenueMap: Map initialized successfully');

      // Add bounds change listener
      map.current.addListener('bounds_changed', () => {
        if (map.current) {
          const bounds = map.current.getBounds();
          if (bounds) {
            debouncedBoundsChange(bounds);
          }
        }
      });

      // Track user interactions
      map.current.addListener('dragstart', () => {
        isUserInteracting.current = true;
        // Close any open info windows when dragging
        if (activeInfoWindow.current) {
          activeInfoWindow.current.close();
          activeInfoWindow.current = null;
        }
      });

      map.current.addListener('dragend', () => {
        setTimeout(() => {
          isUserInteracting.current = false;
        }, 100);
      });

      // Enhanced zoom change handler with convergence animation
      let previousZoom = map.current.getZoom() || 11;
      
      map.current.addListener('zoom_changed', () => {
        isUserInteracting.current = true;
        
        // Update current zoom level
        const newZoom = map.current?.getZoom() || 11;
        const isZoomingOut = newZoom < previousZoom;
        // Keep React state stable during interaction; store in ref for internal logic
        currentZoomRef.current = newZoom;
        
        // Close any open info windows when zooming
        if (activeInfoWindow.current) {
          activeInfoWindow.current.close();
          activeInfoWindow.current = null;
        }
        
        // Trigger venue convergence animation when zooming out creates clusters
        if (isZoomingOut && newZoom < 14) {
          setTimeout(() => {
            animateGoogleVenueConvergence(newZoom);
          }, 150);
        }
        
        previousZoom = newZoom;
        
        setTimeout(() => {
          isUserInteracting.current = false;
        }, 100);
      });

    } catch (error) {
      console.error('GoogleVenueMap: Error initializing map:', error);
    }

    return () => {
      // Cleanup timeouts
      if (boundsChangeTimeout.current) {
        clearTimeout(boundsChangeTimeout.current);
      }
      
      // Cleanup markers and animations for performance
      markers.current.forEach(marker => {
        const markerDiv = (marker as any).getDiv?.();
        if (markerDiv) {
          // Reset all animation properties
          markerDiv.style.animation = '';
          markerDiv.style.willChange = 'auto';
          markerDiv.style.transform = '';
          markerDiv.style.opacity = '';
          markerDiv.style.transition = '';
          markerDiv.style.removeProperty('--dx');
          markerDiv.style.removeProperty('--dy');
        }
        marker.setMap(null);
      });
      markers.current = [];
      
      // Cleanup info windows
      infoWindows.current.forEach(infoWindow => {
        infoWindow.close();
      });
      infoWindows.current = [];
      
      // Cleanup active info window
      if (activeInfoWindow.current) {
        activeInfoWindow.current.close();
        activeInfoWindow.current = null;
      }
      
      // Remove custom CSS styles to prevent memory leaks
      const existingStyleElements = document.querySelectorAll('style[data-google-maps-style]');
      existingStyleElements.forEach(element => {
        element.remove();
      });
    };
  }, [googleMapsApiKey, debouncedBoundsChange, venuesWithCoords.length, isDarkMode]);

  // Update markers when venues change
  useEffect(() => {
    if (!map.current) {
      console.log('GoogleVenueMap: Map not ready for markers');
      return;
    }

    console.log('GoogleVenueMap: Updating markers for', venuesWithCoords.length, 'venues');

    // Clear existing markers and info windows
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];
    
    infoWindows.current.forEach(infoWindow => infoWindow.close());
    infoWindows.current = [];

    // Create clusters based on current zoom level
    const clusters = clusterGoogleVenues(venuesWithCoords, currentZoomRef.current);
    console.log('GoogleVenueMap: Created', clusters.length, 'clusters/markers');

    // Add new markers with cluster support and animations
    clusters.forEach((cluster, index) => {
      try {
        const coordinates = cluster.center;
        let marker: google.maps.Marker;
        let infoWindow: google.maps.InfoWindow | null = null;

        if (cluster.type === 'cluster') {
          // Create cluster marker
          const clusterSize = cluster.venues.length;
          let size: 'small' | 'medium' | 'large' = 'small';
          if (clusterSize >= 20) size = 'large';
          else if (clusterSize >= 10) size = 'medium';

          const clusterIcon = createClusterIcon(clusterSize, size);
          if (!clusterIcon) return;

          marker = new google.maps.Marker({
            position: coordinates,
            map: map.current,
            title: `${clusterSize} venues`,
            icon: clusterIcon,
            clickable: true,
            draggable: false,
            zIndex: 100,
            optimized: true
          });

          // Add cluster click handler to zoom in
          marker.addListener('click', () => {
            const bounds = new google.maps.LatLngBounds();
            cluster.venues.forEach(venue => {
              const venueCoords = venuesWithCoords.find(v => v.venue.id === venue.id)?.coordinates;
              if (venueCoords) {
                bounds.extend(venueCoords);
              }
            });
            
            map.current?.fitBounds(bounds, { padding: 80 });
          });

          // Enhanced cluster formation with venue convergence animation
          requestAnimationFrame(() => {
            setTimeout(() => {
              const markerDiv = (marker as any).getDiv?.();
              if (markerDiv) {
                // Start with cluster invisible, it will appear after venues converge
                markerDiv.style.transform = 'scale3d(0.1, 0.1, 1)';
                markerDiv.style.opacity = '0';
                
                // Animate individual venues converging to cluster center first
                cluster.venues.forEach((venue, venueIdx) => {
                  const originalCoords = venuesWithCoords.find(v => v.venue.id === venue.id)?.coordinates;
                  if (originalCoords) {
                    // Calculate movement from original position to cluster center
                    const projection = map.current?.getProjection();
                    if (projection) {
                      const fromPoint = projection.fromLatLngToPoint(originalCoords);
                      const toPoint = projection.fromLatLngToPoint(coordinates);
                      const zoom = map.current?.getZoom() || 11;
                      const scale = Math.pow(2, zoom);
                      
                      const dx = (toPoint.x - fromPoint.x) * scale * 256;
                      const dy = (toPoint.y - fromPoint.y) * scale * 256;
                      
                      // Find existing individual markers and animate them
                      const existingMarkers = markers.current.filter(existingMarker => {
                        const existingPos = existingMarker.getPosition();
                        return existingPos && 
                               Math.abs(existingPos.lat() - originalCoords.lat) < 0.001 && 
                               Math.abs(existingPos.lng() - originalCoords.lng) < 0.001;
                      });
                      
                      existingMarkers.forEach(existingMarker => {
                        const existingDiv = (existingMarker as any).getDiv?.();
                        if (existingDiv && Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                          // Set CSS variables for movement
                          existingDiv.style.setProperty('--dx', `${dx}px`);
                          existingDiv.style.setProperty('--dy', `${dy}px`);
                          
                          setTimeout(() => {
                            existingDiv.style.animation = `googleVenueConverge 550ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
                          }, venueIdx * 80);
                          
                          // Hide the individual marker after convergence
                          setTimeout(() => {
                            existingMarker.setMap(null);
                          }, 450 + (venueIdx * 80));
                        }
                      });
                    }
                  }
                });
                
                // Show cluster with collision effect after venues have converged
                setTimeout(() => {
                  markerDiv.style.animation = 'googleClusterCollisionForm 450ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
                }, 350 + (cluster.venues.length * 50));
              }
            }, index * 75); // Stagger different clusters
          });

        } else {
          // Individual venue marker
          const venue = cluster.venues[0];
          const price = getVenuePrice(venue);
          const isSelected = selectedVenue?.id === venue.id;

          console.log(`Creating marker for venue ${venue.name} at`, coordinates);

          const markerIcon = createMarkerIcon(price, isSelected);
          if (!markerIcon) return;

          marker = new google.maps.Marker({
            position: coordinates,
            map: map.current,
            title: venue.name,
            icon: markerIcon,
            clickable: true,
            draggable: false,
            zIndex: isSelected ? 10 : 1,
            optimized: true
          });

          // Create info window for hover tooltip
          infoWindow = new google.maps.InfoWindow({
            content: createTooltipContent(venue),
            disableAutoPan: true,
            pixelOffset: new google.maps.Size(-160, -10), // Center the card over the marker
            maxWidth: 320
          });

          // Add hover listeners with delay
          let hoverTimeout: NodeJS.Timeout;
          
          marker.addListener('mouseover', () => {
            console.log('Marker hover:', venue.name);
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
              // Close any other open info window
              if (activeInfoWindow.current && activeInfoWindow.current !== infoWindow) {
                activeInfoWindow.current.close();
              }
              infoWindow!.open(map.current, marker);
              activeInfoWindow.current = infoWindow;
            }, 200); // Small delay to prevent flickering
          });

          marker.addListener('mouseout', () => {
            clearTimeout(hoverTimeout);
            setTimeout(() => {
              if (activeInfoWindow.current === infoWindow) {
                infoWindow!.close();
                activeInfoWindow.current = null;
              }
            }, 300); // Keep open briefly when moving from marker to info window
          });

          // Add click listener to marker
          marker.addListener('click', () => {
            console.log('Marker clicked:', venue.name);
            infoWindow!.close();
            activeInfoWindow.current = null;
            setPopupVenue(venue);
            setShowPopup(true);
            onVenueClick?.(venue);
          });

          // Add click listener to info window content (only for individual venues)
          if (infoWindow) {
            infoWindow.addListener('domready', () => {
              // Wait a bit for the DOM to be ready
              setTimeout(() => {
                const infoWindowElement = infoWindow!.getContent();
                if (infoWindowElement) {
                  const div = document.createElement('div');
                  div.innerHTML = DOMPurify.sanitize(infoWindowElement as string);
              
              // Add click listener to the entire card
              const venueCard = div.querySelector('.airbnb-venue-card');
              if (venueCard) {
                venueCard.addEventListener('click', (e) => {
                  // Don't trigger if clicking on close or favorite buttons
                  if ((e.target as Element).closest('.close-btn') || (e.target as Element).closest('.heart-btn')) {
                    return;
                  }
                  console.log('Venue card clicked:', venue.name);
                  infoWindow.close();
                  activeInfoWindow.current = null;
                  setPopupVenue(venue);
                  setShowPopup(true);
                  onVenueClick?.(venue);
                });
              }
              
              // Add specific click listener to View Details button
              const viewDetailsBtn = div.querySelector('.view-details-btn');
              if (viewDetailsBtn) {
                viewDetailsBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  console.log('View Details button clicked:', venue.name);
                  infoWindow.close();
                  activeInfoWindow.current = null;
                  setPopupVenue(venue);
                  setShowPopup(true);
                  onVenueClick?.(venue);
                });
              }
              
              // Add click listener to close button
              const closeBtn = div.querySelector('.close-btn');
              if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  console.log('Close button clicked');
                  infoWindow.close();
                  activeInfoWindow.current = null;
                });
              }
              
              // Add click listener to favorite button
              const favoriteBtn = div.querySelector('.heart-btn') as HTMLElement;
              if (favoriteBtn) {
                favoriteBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  console.log('Favorite button clicked:', venue.name);
                  // TODO: Implement favorite functionality
                  favoriteBtn.innerHTML = DOMPurify.sanitize('♥');
                  favoriteBtn.style.color = '#ff385c';
                });
              }
                }
              }, 100);
            });
          }
        }

        // Add marker to arrays (both clusters and individual venues)
        markers.current.push(marker);
        if (infoWindow) {
          infoWindows.current.push(infoWindow);
        }

      } catch (error) {
        console.error(`Error creating marker for venue ${venue.name}:`, error);
      }
    });

    console.log('GoogleVenueMap: Created', markers.current.length, 'markers');

    // Add modern marker styles with smooth animations
    const style = document.createElement('style');
    style.textContent = `
      /* Venue card animations */
      .airbnb-venue-card {
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        will-change: auto;
      }
      .airbnb-venue-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
      }
      .airbnb-venue-card img {
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .airbnb-venue-card:hover img {
        transform: scale(1.05);
      }
      
      /* Button animations */
      .view-details-btn {
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .view-details-btn:hover {
        background: #000000 !important;
        transform: translateY(-1px);
      }
      .heart-btn, .close-btn {
        transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .heart-btn:hover, .close-btn:hover {
        background: rgba(255,255,255,1) !important;
        transform: scale(1.1);
      }
      
      /* Removed global transform transitions on internal Google Maps layers to reduce jank */
      
      /* Enhanced venue convergence animation */
      @keyframes googleVenueConverge {
        0% { 
          transform: scale3d(1, 1, 1) translate3d(0, 0, 0);
          opacity: 1;
        }
        25% {
          transform: scale3d(1.02, 1.02, 1) translate3d(calc(var(--dx, 0) * 0.15), calc(var(--dy, 0) * 0.15), 0);
          opacity: 1;
        }
        60% {
          transform: scale3d(0.8, 0.8, 1) translate3d(calc(var(--dx, 0) * 0.65), calc(var(--dy, 0) * 0.65), 0);
          opacity: 0.7;
        }
        90% {
          transform: scale3d(0.3, 0.3, 1) translate3d(calc(var(--dx, 0) * 0.95), calc(var(--dy, 0) * 0.95), 0);
          opacity: 0.2;
        }
        100% { 
          transform: scale3d(0.1, 0.1, 1) translate3d(var(--dx, 0), var(--dy, 0), 0);
          opacity: 0;
        }
      }

      /* Cluster collision formation animation */
      @keyframes googleClusterCollisionForm {
        0% { 
          transform: scale3d(0.1, 0.1, 1) rotate(0deg);
          opacity: 0;
          filter: blur(4px) brightness(2);
        }
        25% { 
          transform: scale3d(0.9, 0.9, 1) rotate(90deg);
          opacity: 0.6;
          filter: blur(2px) brightness(1.5);
        }
        50% { 
          transform: scale3d(1.25, 1.25, 1) rotate(180deg);
          opacity: 0.8;
          filter: blur(1px) brightness(1.2);
        }
        75% { 
          transform: scale3d(0.9, 0.9, 1) rotate(270deg);
          opacity: 0.95;
          filter: blur(0.5px) brightness(1.1);
        }
        100% { 
          transform: scale3d(1, 1, 1) rotate(360deg);
          opacity: 1;
          filter: blur(0px) brightness(1);
        }
      }
      
      /* Hover effects for cluster markers */
      .gm-style div[style*="cursor: pointer"] {
        transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      /* Smooth scaling for all interactive elements */
      .gm-style div[style*="cursor: pointer"]:hover {
        transform: scale3d(1.1, 1.1, 1) !important;
      }
    `;
    document.head.appendChild(style);
  }, [venuesWithCoords, selectedVenue, onVenueClick]);

  // Close popup when clicking on map
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = () => {
      setShowPopup(false);
      setPopupVenue(null);
      // Close any open info windows
      if (activeInfoWindow.current) {
        activeInfoWindow.current.close();
        activeInfoWindow.current = null;
      }
    };

    map.current.addListener('click', handleMapClick);

    return () => {
      if (map.current) {
        google.maps.event.clearListeners(map.current, 'click');
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      
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
        © Google Maps
      </div>
    </div>
  );
};

export default GoogleVenueMap; 