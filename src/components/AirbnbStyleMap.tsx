import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Venue, useVenueServices } from '@/hooks/useVenues';
import { getTranslatedServiceName } from '@/utils/serviceTranslation';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';
import { getVenueDiscountInfo, getVenuePriceFallback } from '@/utils/venuePricing';
import { formatWorkingHours, getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { supabase } from '@/integrations/supabase/client';
import { useDarkMode } from '@/hooks/useDarkMode';


interface AirbnbStyleMapProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  hoveredVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  mapCenter?: { lat: number; lng: number } | null;
  centeringType?: 'user' | 'venue'; // Type of centering to apply
  resetTrigger?: number;
  googleMapsApiKey: string;
  className?: string;
  showPopups?: boolean; // Whether to show InfoWindow popups on marker clicks
  fitToVenuesOnLoad?: boolean; // Whether to auto fit bounds on initial load
}

// Modern cluster icon with Airbnb-inspired design
const createModernClusterIcon = (count: number, size: 'small' | 'medium' | 'large') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // High-DPI rendering for crystal clear appearance
  const pixelRatio = window.devicePixelRatio || 1;

  // Modern sizing with better visual hierarchy
  let diameter, fontSize, fontWeight, innerRadius;
  switch (size) {
    case 'small':
      diameter = 44;
      fontSize = 12;
      fontWeight = '700';
      innerRadius = 16;
      break;
    case 'medium':
      diameter = 54;
      fontSize = 15;
      fontWeight = '800';
      innerRadius = 20;
      break;
    case 'large':
      diameter = 64;
      fontSize = 18;
      fontWeight = '900';
      innerRadius = 24;
      break;
  }

  // Add margin for modern effects
  const effectsMargin = 12;
  const canvasSize = diameter + (effectsMargin * 2);
  
  canvas.width = canvasSize * pixelRatio;
  canvas.height = canvasSize * pixelRatio;
  canvas.style.width = canvasSize + 'px';
  canvas.style.height = canvasSize + 'px';
  
  ctx.scale(pixelRatio, pixelRatio);
  
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const radius = diameter / 2;

  // Modern color palette inspired by Airbnb and contemporary design
  const primaryColor = '#FF385C';      // Airbnb coral red
  const secondaryColor = '#E31C5F';    // Deeper red for gradient
  const accentColor = '#FFFFFF';       // Pure white
  const shadowColor = 'rgba(255, 56, 92, 0.25)'; // Soft coral shadow

  // Create gradient for depth
  const gradient = ctx.createLinearGradient(
    centerX - radius, centerY - radius,
    centerX + radius, centerY + radius
  );
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);

  // Draw modern drop shadow
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Outer ring with gradient
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner circle for contrast
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle inner border
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 1, 0, Math.PI * 2);
  ctx.stroke();

  // Modern typography
  ctx.fillStyle = primaryColor;
  ctx.font = `${fontWeight} ${fontSize}px "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Ultra-crisp text rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.fillText(count.toString(), centerX, centerY);

  return {
    url: canvas.toDataURL('image/png'),
    scaledSize: new google.maps.Size(canvasSize, canvasSize),
    anchor: new google.maps.Point(centerX, centerY),
    labelOrigin: new google.maps.Point(centerX, centerY),
    origin: new google.maps.Point(0, 0),
    size: new google.maps.Size(canvasSize, canvasSize)
  };
};

// Create highlighted cluster icon when a venue in the cluster is hovered
const createHighlightedClusterIcon = (count: number, size: 'small' | 'medium' | 'large') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const pixelRatio = window.devicePixelRatio || 1;

  let diameter, fontSize, fontWeight, innerRadius;
  switch (size) {
    case 'small':
      diameter = 48; // Slightly larger when highlighted
      fontSize = 12;
      fontWeight = '700';
      innerRadius = 18;
      break;
    case 'medium':
      diameter = 58;
      fontSize = 15;
      fontWeight = '800';
      innerRadius = 22;
      break;
    case 'large':
      diameter = 68;
      fontSize = 18;
      fontWeight = '900';
      innerRadius = 26;
      break;
  }

  const effectsMargin = 12;
  const canvasSize = diameter + (effectsMargin * 2);
  
  canvas.width = canvasSize * pixelRatio;
  canvas.height = canvasSize * pixelRatio;
  canvas.style.width = canvasSize + 'px';
  canvas.style.height = canvasSize + 'px';
  
  ctx.scale(pixelRatio, pixelRatio);
  
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const radius = diameter / 2;

  // Highlighted colors (slightly different from normal)
  const primaryColor = '#3B82F6';      // Blue instead of coral
  const secondaryColor = '#1D4ED8';    // Deeper blue
  const accentColor = '#FFFFFF';
  const shadowColor = 'rgba(59, 130, 246, 0.35)'; // Blue shadow

  // Create gradient for depth
  const gradient = ctx.createLinearGradient(
    centerX - radius, centerY - radius,
    centerX + radius, centerY + radius
  );
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);

  // Draw highlighted drop shadow (more prominent)
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Outer ring with gradient
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner circle for contrast
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle inner border
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 1, 0, Math.PI * 2);
  ctx.stroke();

  // Typography
  ctx.fillStyle = primaryColor;
  ctx.font = `${fontWeight} ${fontSize}px "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.fillText(count.toString(), centerX, centerY);

  return {
    url: canvas.toDataURL('image/png'),
    scaledSize: new google.maps.Size(canvasSize, canvasSize),
    anchor: new google.maps.Point(centerX, centerY),
    labelOrigin: new google.maps.Point(centerX, centerY),
    origin: new google.maps.Point(0, 0),
    size: new google.maps.Size(canvasSize, canvasSize)
  };
};

// Generate stable coordinates for venues
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


const AirbnbStyleMap = React.memo(({ 
  venues, 
  selectedVenue, 
  hoveredVenue,
  onVenueClick,
  onBoundsChange, 
  mapCenter,
  centeringType = 'user',
  resetTrigger,
  googleMapsApiKey,
  className = "w-full h-full",
  showPopups = true,
  fitToVenuesOnLoad = true
}: AirbnbStyleMapProps) => {
  const { t, i18n } = useTranslation();
  const isDarkMode = useDarkMode();
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUserInteracting = useRef(false);
  // REMOVED: Old continuous monitoring variables - no longer needed
  const lastZoom = useRef<number>(11);
  
  // Real-time smooth clustering state
  const smoothClusteringId = useRef<number | null>(null);
  const clusteringProgress = useRef<number>(0); // 0-1 scale for clustering progression
  const predictedClusters = useRef<Map<string, any>>(new Map());
  const venueAnimationStates = useRef<Map<string, any>>(new Map());

  // Modern, selective CSS animations for smooth clustering
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'modern-cluster-animations';
      let existingStyle = document.getElementById(styleId);
      
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* Venue movement toward cluster center - focused on translation */
          @keyframes venueConvergeToCluster {
            0% { 
              transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
              opacity: 1;
              z-index: 2000;
            }
            5% {
              transform: translate3d(calc(var(--dx, 0) * 0.02), calc(var(--dy, 0) * 0.02), 0) scale3d(1.02, 1.02, 1);
              opacity: 1;
            }
            15% {
              transform: translate3d(calc(var(--dx, 0) * 0.1), calc(var(--dy, 0) * 0.1), 0) scale3d(1.01, 1.01, 1);
              opacity: 1;
            }
            30% {
              transform: translate3d(calc(var(--dx, 0) * 0.25), calc(var(--dy, 0) * 0.25), 0) scale3d(1, 1, 1);
              opacity: 1;
            }
            50% {
              transform: translate3d(calc(var(--dx, 0) * 0.5), calc(var(--dy, 0) * 0.5), 0) scale3d(0.95, 0.95, 1);
              opacity: 1;
            }
            70% {
              transform: translate3d(calc(var(--dx, 0) * 0.75), calc(var(--dy, 0) * 0.75), 0) scale3d(0.85, 0.85, 1);
              opacity: 0.9;
            }
            85% {
              transform: translate3d(calc(var(--dx, 0) * 0.9), calc(var(--dy, 0) * 0.9), 0) scale3d(0.6, 0.6, 1);
              opacity: 0.6;
            }
            95% {
              transform: translate3d(calc(var(--dx, 0) * 0.98), calc(var(--dy, 0) * 0.98), 0) scale3d(0.3, 0.3, 1);
              opacity: 0.3;
            }
            100% { 
              transform: translate3d(var(--dx, 0), var(--dy, 0), 0) scale3d(0.1, 0.1, 1);
              opacity: 0;
              z-index: 1;
            }
          }
          
          /* Epic cluster formation - multi-layered spectacular animation */
          @keyframes clusterEpicFormation {
            0% { 
              transform: scale3d(0.02, 0.02, 1) rotate(0deg);
              opacity: 0;
              filter: blur(15px) brightness(5) saturate(3) hue-rotate(0deg) contrast(2);
              box-shadow: 
                0 0 20px rgba(255, 255, 255, 1),
                0 0 60px rgba(255, 56, 92, 1),
                0 0 120px rgba(255, 156, 92, 0.8),
                0 0 200px rgba(255, 200, 92, 0.6),
                inset 0 0 40px rgba(255, 255, 255, 0.8);
            }
            8% { 
              transform: scale3d(0.4, 0.4, 1) rotate(90deg);
              opacity: 0.3;
              filter: blur(12px) brightness(4.5) saturate(2.8) hue-rotate(45deg) contrast(1.9);
              box-shadow: 
                0 0 40px rgba(255, 255, 255, 0.9),
                0 0 100px rgba(255, 56, 92, 0.95),
                0 0 160px rgba(255, 156, 92, 0.7),
                0 0 240px rgba(255, 200, 92, 0.5),
                inset 0 0 35px rgba(255, 255, 255, 0.7);
            }
            18% { 
              transform: scale3d(1.8, 1.8, 1) rotate(180deg);
              opacity: 0.6;
              filter: blur(8px) brightness(3.5) saturate(2.3) hue-rotate(90deg) contrast(1.7);
              box-shadow: 
                0 0 60px rgba(255, 255, 255, 0.7),
                0 0 140px rgba(255, 56, 92, 0.8),
                0 0 200px rgba(255, 156, 92, 0.6),
                0 0 280px rgba(255, 200, 92, 0.4),
                inset 0 0 30px rgba(255, 255, 255, 0.6);
            }
            32% { 
              transform: scale3d(3.2, 3.2, 1) rotate(270deg);
              opacity: 0.85;
              filter: blur(5px) brightness(2.8) saturate(1.8) hue-rotate(135deg) contrast(1.5);
              box-shadow: 
                0 0 80px rgba(255, 255, 255, 0.5),
                0 0 180px rgba(255, 56, 92, 0.7),
                0 0 250px rgba(255, 156, 92, 0.5),
                0 0 320px rgba(255, 200, 92, 0.3),
                inset 0 0 25px rgba(255, 255, 255, 0.5);
            }
            48% { 
              transform: scale3d(2.4, 2.4, 1) rotate(360deg);
              opacity: 0.92;
              filter: blur(3px) brightness(2.2) saturate(1.5) hue-rotate(180deg) contrast(1.3);
              box-shadow: 
                0 0 70px rgba(255, 255, 255, 0.4),
                0 0 150px rgba(255, 56, 92, 0.6),
                0 0 200px rgba(255, 156, 92, 0.4),
                0 0 260px rgba(255, 200, 92, 0.25),
                inset 0 0 20px rgba(255, 255, 255, 0.4);
            }
            65% { 
              transform: scale3d(1.4, 1.4, 1) rotate(405deg);
              opacity: 0.96;
              filter: blur(1.5px) brightness(1.8) saturate(1.3) hue-rotate(225deg) contrast(1.2);
              box-shadow: 
                0 0 50px rgba(255, 255, 255, 0.3),
                0 0 100px rgba(255, 56, 92, 0.5),
                0 0 140px rgba(255, 156, 92, 0.3),
                0 0 180px rgba(255, 200, 92, 0.2),
                inset 0 0 15px rgba(255, 255, 255, 0.3);
            }
            78% { 
              transform: scale3d(1.15, 1.15, 1) rotate(432deg);
              opacity: 0.98;
              filter: blur(0.8px) brightness(1.4) saturate(1.15) hue-rotate(270deg) contrast(1.1);
              box-shadow: 
                0 0 30px rgba(255, 255, 255, 0.2),
                0 0 70px rgba(255, 56, 92, 0.4),
                0 0 100px rgba(255, 156, 92, 0.25),
                0 0 130px rgba(255, 200, 92, 0.15),
                inset 0 0 10px rgba(255, 255, 255, 0.2);
            }
            88% { 
              transform: scale3d(0.85, 0.85, 1) rotate(450deg);
              opacity: 0.99;
              filter: blur(0.3px) brightness(1.25) saturate(1.08) hue-rotate(315deg) contrast(1.05);
              box-shadow: 
                0 0 20px rgba(255, 255, 255, 0.15),
                0 0 50px rgba(255, 56, 92, 0.3),
                0 0 75px rgba(255, 156, 92, 0.2),
                0 0 100px rgba(255, 200, 92, 0.1),
                inset 0 0 8px rgba(255, 255, 255, 0.15);
            }
            94% { 
              transform: scale3d(1.12, 1.12, 1) rotate(468deg);
              opacity: 0.995;
              filter: blur(0.1px) brightness(1.15) saturate(1.04) hue-rotate(340deg) contrast(1.02);
              box-shadow: 
                0 0 15px rgba(255, 255, 255, 0.1),
                0 0 35px rgba(255, 56, 92, 0.25),
                0 0 50px rgba(255, 156, 92, 0.15),
                0 0 70px rgba(255, 200, 92, 0.08),
                inset 0 0 5px rgba(255, 255, 255, 0.1);
            }
            97% { 
              transform: scale3d(0.96, 0.96, 1) rotate(474deg);
              opacity: 0.998;
              filter: blur(0.05px) brightness(1.08) saturate(1.02) hue-rotate(350deg) contrast(1.01);
              box-shadow: 
                0 0 13px rgba(255, 255, 255, 0.08),
                0 0 30px rgba(255, 56, 92, 0.22),
                0 0 45px rgba(255, 156, 92, 0.12),
                0 0 65px rgba(255, 200, 92, 0.06),
                inset 0 0 4px rgba(255, 255, 255, 0.08);
            }
            100% { 
              transform: scale3d(1, 1, 1) rotate(480deg);
              opacity: 1;
              filter: blur(0px) brightness(1) saturate(1) hue-rotate(360deg) contrast(1);
              box-shadow: 
                0 0 12px rgba(255, 56, 92, 0.2),
                0 0 24px rgba(255, 156, 92, 0.1),
                0 0 36px rgba(255, 200, 92, 0.05);
            }
          }
          
          /* Ripple wave effect for cluster formation */
          @keyframes clusterRippleWave {
            0% { 
              transform: scale3d(0, 0, 1);
              opacity: 0.9;
              border: 4px solid rgba(255, 56, 92, 0.9);
              filter: blur(0px);
            }
            25% {
              transform: scale3d(1.5, 1.5, 1);
              opacity: 0.7;
              border: 3px solid rgba(255, 56, 92, 0.7);
              filter: blur(0.5px);
            }
            50% {
              transform: scale3d(3, 3, 1);
              opacity: 0.5;
              border: 2px solid rgba(255, 56, 92, 0.5);
              filter: blur(1px);
            }
            75% {
              transform: scale3d(5, 5, 1);
              opacity: 0.25;
              border: 1px solid rgba(255, 56, 92, 0.25);
              filter: blur(2px);
            }
            100% { 
              transform: scale3d(8, 8, 1);
              opacity: 0;
              border: 0px solid rgba(255, 56, 92, 0);
              filter: blur(4px);
            }
          }
          
          /* Energy burst particles effect */
          @keyframes clusterEnergyBurst {
            0% { 
              transform: scale3d(0.1, 0.1, 1) rotate(0deg);
              opacity: 0;
              filter: blur(8px) brightness(6) saturate(3);
              box-shadow: 0 0 100px rgba(255, 56, 92, 1);
            }
            15% {
              transform: scale3d(2, 2, 1) rotate(54deg);
              opacity: 0.8;
              filter: blur(6px) brightness(5) saturate(2.5);
              box-shadow: 0 0 150px rgba(255, 56, 92, 0.8);
            }
            35% {
              transform: scale3d(4, 4, 1) rotate(126deg);
              opacity: 0.6;
              filter: blur(4px) brightness(4) saturate(2);
              box-shadow: 0 0 200px rgba(255, 56, 92, 0.6);
            }
            60% {
              transform: scale3d(6, 6, 1) rotate(216deg);
              opacity: 0.3;
              filter: blur(3px) brightness(3) saturate(1.5);
              box-shadow: 0 0 250px rgba(255, 56, 92, 0.4);
            }
            85% {
              transform: scale3d(8, 8, 1) rotate(324deg);
              opacity: 0.1;
              filter: blur(2px) brightness(2) saturate(1.2);
              box-shadow: 0 0 300px rgba(255, 56, 92, 0.2);
            }
            100% { 
              transform: scale3d(10, 10, 1) rotate(360deg);
              opacity: 0;
              filter: blur(1px) brightness(1) saturate(1);
              box-shadow: 0 0 0px rgba(255, 56, 92, 0);
            }
          }
          
          /* Floating particle animation for cluster formation */
          @keyframes clusterParticleFloat {
            0% { 
              transform: translate3d(0, 0, 0) scale3d(0.1, 0.1, 1) rotate(0deg);
              opacity: 0;
              filter: blur(2px) brightness(2);
            }
            20% { 
              transform: translate3d(0, -8px, 0) scale3d(0.8, 0.8, 1) rotate(72deg);
              opacity: 0.9;
              filter: blur(1px) brightness(1.8);
            }
            40% { 
              transform: translate3d(-15px, -20px, 0) scale3d(1.2, 1.2, 1) rotate(144deg);
              opacity: 0.7;
              filter: blur(0.5px) brightness(1.5);
            }
            60% { 
              transform: translate3d(-25px, -35px, 0) scale3d(1.4, 1.4, 1) rotate(216deg);
              opacity: 0.5;
              filter: blur(0.8px) brightness(1.3);
            }
            80% { 
              transform: translate3d(-35px, -55px, 0) scale3d(1.1, 1.1, 1) rotate(288deg);
              opacity: 0.3;
              filter: blur(1.5px) brightness(1.1);
            }
            100% { 
              transform: translate3d(-45px, -75px, 0) scale3d(0.2, 0.2, 1) rotate(360deg);
              opacity: 0;
              filter: blur(3px) brightness(1);
            }
          }
          
          /* Dramatic camera shake effect for cluster formation */
          @keyframes clusterCameraShake {
            0% { transform: translate3d(0, 0, 0); }
            10% { transform: translate3d(-2px, -1px, 0); }
            20% { transform: translate3d(3px, 2px, 0); }
            30% { transform: translate3d(-1px, 3px, 0); }
            40% { transform: translate3d(2px, -2px, 0); }
            50% { transform: translate3d(-3px, 1px, 0); }
            60% { transform: translate3d(1px, -3px, 0); }
            70% { transform: translate3d(-2px, 2px, 0); }
            80% { transform: translate3d(2px, 1px, 0); }
            90% { transform: translate3d(-1px, -1px, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          
          /* Magnetic field visualization */
          @keyframes magneticFieldPulse {
            0% { 
              transform: scale3d(0, 0, 1);
              opacity: 0;
              filter: blur(10px);
              background: radial-gradient(circle, rgba(255,56,92,0.3) 0%, rgba(255,156,92,0.1) 50%, transparent 100%);
            }
            25% { 
              transform: scale3d(2, 2, 1);
              opacity: 0.6;
              filter: blur(5px);
              background: radial-gradient(circle, rgba(255,56,92,0.4) 0%, rgba(255,156,92,0.2) 50%, transparent 100%);
            }
            50% { 
              transform: scale3d(4, 4, 1);
              opacity: 0.4;
              filter: blur(3px);
              background: radial-gradient(circle, rgba(255,56,92,0.5) 0%, rgba(255,156,92,0.3) 50%, transparent 100%);
            }
            75% { 
              transform: scale3d(6, 6, 1);
              opacity: 0.2;
              filter: blur(8px);
              background: radial-gradient(circle, rgba(255,56,92,0.3) 0%, rgba(255,156,92,0.1) 50%, transparent 100%);
            }
            100% { 
              transform: scale3d(8, 8, 1);
              opacity: 0;
              filter: blur(15px);
              background: radial-gradient(circle, rgba(255,56,92,0.1) 0%, rgba(255,156,92,0.05) 50%, transparent 100%);
            }
          }
          
          /* Spiral vortex particle effect */
          @keyframes spiralVortex {
            0% { 
              transform: translate3d(0, 0, 0) scale3d(0.1, 0.1, 1) rotate(0deg);
              opacity: 0;
              filter: blur(3px) brightness(3);
            }
            20% { 
              transform: translate3d(-5px, -15px, 0) scale3d(0.6, 0.6, 1) rotate(144deg);
              opacity: 0.8;
              filter: blur(2px) brightness(2.5);
            }
            40% { 
              transform: translate3d(-15px, -25px, 0) scale3d(1.0, 1.0, 1) rotate(288deg);
              opacity: 0.9;
              filter: blur(1px) brightness(2);
            }
            60% { 
              transform: translate3d(-30px, -20px, 0) scale3d(1.3, 1.3, 1) rotate(432deg);
              opacity: 0.7;
              filter: blur(0.5px) brightness(1.8);
            }
            80% { 
              transform: translate3d(-35px, -5px, 0) scale3d(1.5, 1.5, 1) rotate(576deg);
              opacity: 0.4;
              filter: blur(1.5px) brightness(1.5);
            }
            100% { 
              transform: translate3d(-25px, 15px, 0) scale3d(0.3, 0.3, 1) rotate(720deg);
              opacity: 0;
              filter: blur(4px) brightness(1);
            }
          }
          
          /* Attraction line pulsing animation */
          @keyframes attractionLinePulse {
            0% { 
              stroke-opacity: 0.3;
              stroke-width: 1;
            }
            50% { 
              stroke-opacity: 0.8;
              stroke-width: 3;
            }
            100% { 
              stroke-opacity: 0.3;
              stroke-width: 1;
            }
          }
          
          /* Subtle hover effect for markers */
          .venue-marker {
            transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: auto;
          }
          
          .venue-marker:hover {
            transform: scale3d(1.1, 1.1, 1);
          }
          
          /* Magnetic attraction state - smooth movement toward other venues */
          .venue-marker.magnetic-attraction {
            will-change: transform, box-shadow, filter;
            z-index: 1500;
            transition: 
              transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              filter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform: translate3d(var(--dx, 0), var(--dy, 0), 0) scale3d(calc(1 + var(--strength, 0) * 0.15), calc(1 + var(--strength, 0) * 0.15), 1);
            box-shadow: 
              0 0 calc(15px * var(--strength, 0)) rgba(255, 56, 92, calc(0.4 * var(--strength, 0))),
              0 0 calc(30px * var(--strength, 0)) rgba(255, 156, 92, calc(0.2 * var(--strength, 0)));
            filter: brightness(calc(1 + 0.3 * var(--strength, 0))) saturate(calc(1 + 0.2 * var(--strength, 0)));
          }
          
          /* Clustering animation states */
          .venue-marker.clustering {
            will-change: transform, opacity;
            animation-fill-mode: forwards;
            z-index: 3000;
          }
          
          .cluster-marker {
            will-change: transform, opacity;
            animation-fill-mode: forwards;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [currentZoom, setCurrentZoom] = useState(11);
  const zoomUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeClusterAnimations = useRef<Set<string>>(new Set());
  
  const stableCoordinates = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const venuePrices = useRef<Map<string, number>>(new Map());
  const venueServices = useRef<Map<string, any[]>>(new Map());
  const [venueServicesLoaded, setVenueServicesLoaded] = useState(false);
  
  // Cluster highlighting state
  const hoveredClusterRef = useRef<any>(null);
  const originalClusterIconRef = useRef<any>(null);
  const venueToClusterMap = useRef<Map<string, any>>(new Map());

  // Function to find which cluster contains a specific venue
  const findClusterContainingVenue = useCallback((venueId: string) => {
    return venueToClusterMap.current.get(venueId) || null;
  }, []);

  // Function to highlight a cluster
  const highlightCluster = useCallback((cluster: any) => {
    if (!cluster || !cluster.marker) return;
    
    const clusterMarker = cluster.marker;
    const count = cluster.count || cluster.markers?.length || 0;
    const size = cluster.size || 'small';
    
    // Store original icon if not already stored
    if (!originalClusterIconRef.current) {
      originalClusterIconRef.current = clusterMarker.getIcon();
    }
    
    // Create and set highlighted icon
    const highlightedIcon = createHighlightedClusterIcon(count, size);
    if (highlightedIcon) {
      clusterMarker.setIcon(highlightedIcon);
      hoveredClusterRef.current = cluster;
    }
  }, []);

  // Function to remove cluster highlighting
  const removeClusterHighlight = useCallback(() => {
    if (hoveredClusterRef.current && originalClusterIconRef.current) {
      const clusterMarker = hoveredClusterRef.current.marker;
      if (clusterMarker) {
        clusterMarker.setIcon(originalClusterIconRef.current);
      }
      hoveredClusterRef.current = null;
      originalClusterIconRef.current = null;
    }
  }, []);

  // Create modern marker icon with fresh design - memoized for better performance
  const createMarkerIcon = useCallback((price: number, selected: boolean = false, isOpen: boolean = true) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Canvas context not available');
        return null;
      }

      const text = isOpen ? `${price}₾` : 'Closed';
      
      // High resolution dimensions for crisp rendering
      const scale = 2; // 2x scale for high DPI displays
      const markerWidth = 56;
      const markerHeight = 64;
      const circleRadius = 22;
      const shadowMargin = 8;
      
      // Set canvas size with 2x scale for crisp rendering
      canvas.width = (markerWidth + (shadowMargin * 2)) * scale;
      canvas.height = (markerHeight + shadowMargin) * scale;
      
      // Scale the context to match
      ctx.scale(scale, scale);
      
      // Enable high-quality text rendering
      ctx.textRenderingOptimization = 'optimizeQuality';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      const centerX = (canvas.width / scale) / 2;
      const circleY = shadowMargin + circleRadius;
      
      // Modern, professional color scheme matching contemporary web design
      let mainColor, accentColor, textColor, shadowColor;
      if (!isOpen) {
        // Closed venues: Red color
        mainColor = '#DC2626';  // Red-600
        accentColor = '#B91C1C'; // Red-700
        textColor = '#FFFFFF';
        shadowColor = 'rgba(220, 38, 38, 0.25)';
      } else if (selected) {
        // Selected: Professional blue (modern, trustworthy)
        mainColor = '#2563EB';  // Blue-600
        accentColor = '#1D4ED8'; // Blue-700
        textColor = '#FFFFFF';
        shadowColor = 'rgba(37, 99, 235, 0.25)';
      } else {
        // Unselected: Clean slate gray (neutral, modern)
        mainColor = '#475569';  // Slate-600  
        accentColor = '#334155'; // Slate-700
        textColor = '#FFFFFF';
        shadowColor = 'rgba(71, 85, 105, 0.2)';
      }
      
      // Modern shadow - single, clean drop shadow
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      
      // Draw main pin shape - modern teardrop
      ctx.fillStyle = mainColor;
      
      // Circular top
      ctx.beginPath();
      ctx.arc(centerX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Clean pointed bottom
      ctx.beginPath();
      const pointWidth = circleRadius * 0.6;
      const pointY = circleY + circleRadius + 20;
      
      ctx.moveTo(centerX - pointWidth, circleY + circleRadius * 0.7);
      ctx.lineTo(centerX, pointY);
      ctx.lineTo(centerX + pointWidth, circleY + circleRadius * 0.7);
      ctx.closePath();
      ctx.fill();
      
      // Remove shadow for inner elements
      ctx.shadowColor = 'transparent';
      
      // Inner white circle for price - clean and minimal
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerX, circleY, circleRadius - 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Subtle inner border for definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // High-quality text rendering - adjust font size for "Closed" text
      ctx.fillStyle = selected ? mainColor : accentColor;
      const fontSize = isOpen ? 12 : 9; // Smaller font for "Closed" text
      const fontWeight = selected ? '700' : (isOpen ? '600' : '700'); // Bold for "Closed" text
      ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Additional text rendering improvements
      ctx.letterSpacing = '0.5px';
      
      // Measure text to ensure proper centering
      const textMetrics = ctx.measureText(text);
      const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
      
      ctx.fillText(text, centerX, circleY);
      
      // Add subtle highlight ring on hover/selected
      if (selected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, circleY, circleRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const dataUrl = canvas.toDataURL();
      if (!dataUrl || dataUrl === 'data:,') {
        console.warn('Canvas toDataURL failed');
        return null;
      }

      return {
        url: dataUrl,
        scaledSize: new google.maps.Size(canvas.width / scale, canvas.height / scale),
        anchor: new google.maps.Point(centerX, (canvas.height / scale) - 4),
        origin: new google.maps.Point(0, 0)
      };
    } catch (error) {
      console.error('Error creating marker icon:', error);
      return null;
    }
  }, []);
  
  // Smooth marker size updates during zoom without recreating markers
  const updateMarkerSizes = useCallback((zoom: number) => {
    if (!map.current || markersRef.current.size === 0) return;
    
    console.log('AirbnbStyleMap: Updating marker sizes for zoom level:', zoom);
    
    // Update existing markers with new icons based on zoom level
    markersRef.current.forEach((marker, venueId) => {
      const venue = venues.find(v => v.id === venueId);
      if (!venue) return;
      
      const price = venuePrices.current.get(venueId) || getVenuePriceFallback(venue);
      const isSelected = selectedMarkerId === venueId || selectedVenue?.id === venueId || hoveredVenue?.id === venueId;
      const isOpen = isVenueBookableNow(venue.working_hours);
      
      const newIcon = createMarkerIcon(price, isSelected, isOpen);
      if (newIcon) {
        // Update marker icon smoothly
        marker.setIcon(newIcon);
        marker.setZIndex(isSelected ? 10 : 1);
      }
    });
  }, [venues, selectedMarkerId, selectedVenue?.id, hoveredVenue?.id, createMarkerIcon, venuePrices]);

  // Load all venue services data for proper pricing
  useEffect(() => {
    const loadVenueServicesData = async () => {
      if (!venues.length) return;
      
      console.log('AirbnbStyleMap: Loading venue services data for pricing');
      
      try {
        // Get all venue services in one query
        const venueIds = venues.map(v => v.id);
        const { data: servicesData, error } = await supabase
          .from('venue_services')
          .select(`
            *,
            services (
              name,
              pricing_model,
              description,
              duration
            )
          `)
          .in('venue_id', venueIds)
          .order('price', { ascending: true });
          
        if (error) {
          console.error('Error loading venue services:', error);
          return;
        }
        
        // Group services by venue_id
        const servicesMap = new Map<string, any[]>();
        (servicesData || []).forEach(service => {
          const venueId = service.venue_id;
          if (!servicesMap.has(venueId)) {
            servicesMap.set(venueId, []);
          }
          servicesMap.get(venueId)!.push(service);
        });
        
        venueServices.current = servicesMap;
        
        // Calculate and store prices
        venueIds.forEach(venueId => {
          const services = servicesMap.get(venueId) || [];
          if (services.length > 0) {
            const prices = services.map(service => {
              const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'));
              return extractNumericPrice(displayPrice) || service.price;
            });
            const minPrice = Math.min(...prices);
            venuePrices.current.set(venueId, minPrice);
            console.log(`Calculated price for venue ${venueId}: ${minPrice} ${t('booking.currency')}`);
          }
        });
        
        setVenueServicesLoaded(true);
        console.log('AirbnbStyleMap: Venue services data loaded successfully');
        
      } catch (error) {
        console.error('Error loading venue services data:', error);
      }
    };
    
    loadVenueServicesData();
  }, [venues, t]);

  // Initialize stable coordinates
  useEffect(() => {
    venues.forEach(venue => {
      if (!stableCoordinates.current.has(venue.id)) {
        const coords = getVenueCoordinates(venue);
        stableCoordinates.current.set(venue.id, coords);
      }
    });
  }, [venues]);

  const venuesWithCoords = useMemo(() => {
    return venues.map(venue => {
      // Get or generate coordinates
      let coordinates = stableCoordinates.current.get(venue.id);
      if (!coordinates) {
        coordinates = getVenueCoordinates(venue);
        stableCoordinates.current.set(venue.id, coordinates);
      }
      
      return {
        venue,
        coordinates
      };
    });
  }, [venues]);

  // Enhanced function to animate venue convergence with collision detection
  const animateVenueConvergence = useCallback((currentZoom: number) => {
    if (!map.current || !markerClustererRef.current) return;

    console.log(`🎪 === STARTING VENUE CONVERGENCE ANIMATION ===`);
    console.log(`📊 Current zoom: ${currentZoom}`);

    // Get current clusters from MarkerClusterer
    const clusters = markerClustererRef.current.getClusters();
    console.log(`📈 Total clusters found: ${clusters.length}`);
    
    clusters.forEach((cluster, clusterIndex) => {
      if (cluster.getMarkers().length < 2) return; // Skip individual markers
      
      const clusterMarkers = cluster.getMarkers();
      console.log(`🎯 === CLUSTER ${clusterIndex} === with ${clusterMarkers.length} venues`);
      
      // Calculate the center point where venues will converge
      let centerLat = 0, centerLng = 0;
      clusterMarkers.forEach(marker => {
        const pos = marker.getPosition();
        if (pos) {
          centerLat += pos.lat();
          centerLng += pos.lng();
        }
      });
      centerLat /= clusterMarkers.length;
      centerLng /= clusterMarkers.length;
      
      const convergencePoint = new google.maps.LatLng(centerLat, centerLng);
      console.log(`🎯 Convergence point:`, convergencePoint.toJSON());
      
      // Get screen position of convergence point
      const projection = map.current!.getProjection();
      if (!projection) return;
      
      const convergenceScreenPos = projection.fromLatLngToPoint(convergencePoint);
      const scale = Math.pow(2, currentZoom);
      
      const baseDelay = clusterIndex * 150; // Stagger different clusters
      const convergingVenues: Array<{marker: google.maps.Marker, element: HTMLElement, venueId: string, dx: number, dy: number}> = [];
      
      // Prepare all venues for convergence
      clusterMarkers.forEach((marker, markerIndex) => {
        const markerPosition = marker.getPosition();
        if (!markerPosition) return;
        
        const markerElement = (marker as any).getDiv?.();
        if (!markerElement) return;
        
        // Calculate movement vector to convergence point
        const markerScreenPos = projection.fromLatLngToPoint(markerPosition);
        const dx = (convergenceScreenPos.x - markerScreenPos.x) * scale * 256;
        const dy = (convergenceScreenPos.y - markerScreenPos.y) * scale * 256;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log(`📏 Venue ${markerIndex} distance to center:`, distance);
        
        // Only animate if there's meaningful movement
        if (distance > 15) {
          // Find venue ID for this marker
          let venueId: string | null = null;
          for (const [id, venueMarker] of markersRef.current.entries()) {
            if (venueMarker === marker) {
              venueId = id;
              break;
            }
          }
          
          if (venueId) {
            convergingVenues.push({ marker, element: markerElement, venueId, dx, dy });
            
            // Mark as clustering and set animation variables
            activeClusterAnimations.current.add(venueId);
            markerElement.style.setProperty('--dx', `${dx}px`);
            markerElement.style.setProperty('--dy', `${dy}px`);
            markerElement.classList.add('clustering');
            markerElement.style.zIndex = '1000'; // Bring to front during animation
            
            console.log(`🏃‍♂️ Venue ${venueId} will move dx:${dx}px dy:${dy}px`);
          }
        }
      });
      
      if (convergingVenues.length === 0) return;
      
      console.log(`🎪 Starting convergence animation for ${convergingVenues.length} venues`);
      
      // Start venue convergence animations with slight stagger
      convergingVenues.forEach(({ element, venueId }, index) => {
        const venueDelay = baseDelay + (index * 50);
        
        setTimeout(() => {
          element.style.animation = `venueConvergeToCluster 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
          console.log(`🎯 Started animation for venue ${venueId}`);
        }, venueDelay);
        
        // Cleanup venue after convergence
        setTimeout(() => {
          element.style.animation = '';
          element.style.removeProperty('--dx');
          element.style.removeProperty('--dy');
          element.classList.remove('clustering');
          element.style.zIndex = '';
          activeClusterAnimations.current.delete(venueId);
          console.log(`✅ Cleaned up venue ${venueId}`);
        }, venueDelay + 850);
      });
      
      // Create collision effect and cluster formation at convergence point
      const clusterFormationDelay = baseDelay + (convergingVenues.length * 30) + 600; // After venues have mostly converged
      
      setTimeout(() => {
        console.log(`💥 Creating cluster collision effect`);
        
        // Find cluster marker and animate its formation
        requestAnimationFrame(() => {
          const mapContainer = map.current!.getDiv();
          const allImages = mapContainer.querySelectorAll('img[src*="data:image/png"]');
          
          allImages.forEach((img: any) => {
            // Skip venue markers - look for cluster markers (no venue ID attribute)
            if (img.hasAttribute('data-venue-id')) return;
            
            const imgRect = img.getBoundingClientRect();
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Check if this image is at the convergence point
            const imgCenterX = imgRect.left - mapRect.left + imgRect.width / 2;
            const imgCenterY = imgRect.top - mapRect.top + imgRect.height / 2;
            
            // Convert convergence point to screen coordinates
            const screenPoint = projection.fromLatLngToDivPixel(convergencePoint);
            if (!screenPoint) return;
            
            const distance = Math.sqrt(
              Math.pow(imgCenterX - screenPoint.x, 2) + 
              Math.pow(imgCenterY - screenPoint.y, 2)
            );
            
            // If this cluster marker is at our convergence point, animate it
            if (distance < 100) {
              console.log(`✨ Found cluster marker at convergence point, animating formation`);
              img.style.animation = `clusterCollisionForm 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
              
              setTimeout(() => {
                img.style.animation = '';
                console.log(`🎉 Cluster formation complete`);
              }, 650);
            }
          });
        });
      }, clusterFormationDelay);
    });
  }, []);

  // Function to monitor venue proximity and apply magnetic attraction
  const monitorVenueProximityAndAttraction = useCallback((currentZoom: number) => {
    if (!map.current) return;
    
    console.log(`🧲 === MONITORING VENUE PROXIMITY ===`);
    console.log(`📊 Current zoom: ${currentZoom}`);
    console.log(`📍 MarkersRef size: ${markersRef.current.size}`);
    console.log(`📍 MarkersRef keys:`, Array.from(markersRef.current.keys()));
    
    const currentMarkers = Array.from(markersRef.current.values());
    console.log(`📍 Current markers array length: ${currentMarkers.length}`);
    
    const mapContainer = map.current.getDiv();
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Calculate distances between all venue pairs
    const venuePositions: Array<{
      marker: google.maps.Marker;
      element: HTMLElement;
      venueId: string;
      centerX: number;
      centerY: number;
    }> = [];
    
    // Get current screen positions of all venues
    currentMarkers.forEach((marker, index) => {
      console.log(`🔍 Processing marker ${index}:`, marker);
      const markerElement = (marker as any).getDiv?.();
      console.log(`📍 Marker ${index} element:`, markerElement);
      if (!markerElement) {
        console.log(`⚠️ Marker ${index} has no DOM element - skipping`);
        return;
      }
      
      const markerRect = markerElement.getBoundingClientRect();
      const centerX = markerRect.left - mapRect.left + markerRect.width / 2;
      const centerY = markerRect.top - mapRect.top + markerRect.height / 2;
      
      // Find venue ID
      let venueId: string | null = null;
      for (const [id, venueMarker] of markersRef.current.entries()) {
        if (venueMarker === marker) {
          venueId = id;
          break;
        }
      }
      
      if (venueId) {
        venuePositions.push({ marker, element: markerElement, venueId, centerX, centerY });
      }
    });
    
    console.log(`📍 Monitoring ${venuePositions.length} venues`);
    
    // Check distances between all pairs and apply magnetic attraction
    const attractionPairs: Array<{
      venue1: any;
      venue2: any;
      distance: number;
      attractionStrength: number;
    }> = [];
    
    for (let i = 0; i < venuePositions.length; i++) {
      for (let j = i + 1; j < venuePositions.length; j++) {
        const venue1 = venuePositions[i];
        const venue2 = venuePositions[j];
        
        const distance = Math.sqrt(
          Math.pow(venue1.centerX - venue2.centerX, 2) + 
          Math.pow(venue1.centerY - venue2.centerY, 2)
        );
        
        // Define attraction zones based on distance (VERY GENEROUS for testing)
        const TOUCH_DISTANCE = 200;       // When venues "touch" - form cluster (HUGE for testing)
        const STRONG_ATTRACTION = 400;    // Strong magnetic pull - obvious leaning  
        const WEAK_ATTRACTION = 600;      // Slight lean toward each other - starts early
        
        if (distance < WEAK_ATTRACTION) {
          let attractionStrength = 0;
          
          if (distance < TOUCH_DISTANCE) {
            attractionStrength = 1.0; // Maximum attraction - form cluster
          } else if (distance < STRONG_ATTRACTION) {
            attractionStrength = 0.8; // Strong attraction - obvious movement
          } else {
            attractionStrength = 0.5; // Weak attraction - visible lean
          }
          
          attractionPairs.push({ venue1, venue2, distance, attractionStrength });
          
          console.log(`🧲 Attraction pair: ${venue1.venueId} ↔ ${venue2.venueId}`);
          console.log(`   Distance: ${distance.toFixed(1)}px, Strength: ${attractionStrength.toFixed(1)}`);
        }
      }
    }
    
    if (venuePositions.length === 0) {
      console.log(`⚠️ No venue positions detected at zoom ${currentZoom} - markers may not be ready`);
      return;
    }
    
    if (attractionPairs.length === 0) {
      console.log(`⏭️ No venues close enough for attraction at zoom ${currentZoom} (checked ${venuePositions.length} venues)`);
      return;
    }
    
    // Apply magnetic attraction to each pair
    attractionPairs.forEach((pair, pairIndex) => {
      const { venue1, venue2, distance, attractionStrength } = pair;
      
      // Calculate midpoint (where they should converge)
      const midX = (venue1.centerX + venue2.centerX) / 2;
      const midY = (venue1.centerY + venue2.centerY) / 2;
      
      // Calculate movement vectors for each venue toward the midpoint
      const venue1_dx = (midX - venue1.centerX) * attractionStrength;
      const venue1_dy = (midY - venue1.centerY) * attractionStrength;
      const venue2_dx = (midX - venue2.centerX) * attractionStrength;
      const venue2_dy = (midY - venue2.centerY) * attractionStrength;
      
      console.log(`🎯 Midpoint: (${midX.toFixed(1)}, ${midY.toFixed(1)})`);
      console.log(`   Venue1 move: dx=${venue1_dx.toFixed(1)}, dy=${venue1_dy.toFixed(1)}`);
      console.log(`   Venue2 move: dx=${venue2_dx.toFixed(1)}, dy=${venue2_dy.toFixed(1)}`);
      
      // If they're touching, trigger cluster formation
      if (distance < 200) { // Use fixed distance for now
        console.log(`💥 VENUES TOUCHING - FORMING CLUSTER!`);
        console.log(`   Distance: ${distance.toFixed(1)}px < 200px threshold`);
        formClusterFromTouchingVenues([venue1, venue2], midX, midY);
      } else {
        // Apply gradual magnetic attraction
        applyMagneticAttraction(venue1, venue1_dx, venue1_dy, attractionStrength);
        applyMagneticAttraction(venue2, venue2_dx, venue2_dy, attractionStrength);
        
        // Add visual connection line for strong attractions
        if (attractionStrength >= 0.8) {
          addAttractionLine(venue1, venue2, attractionStrength);
        }
      }
    });
  }, []);

  // Apply magnetic attraction to a venue
  const applyMagneticAttraction = useCallback((venue: any, dx: number, dy: number, strength: number) => {
    const { element, venueId } = venue;
    
    // Set CSS variables for the attraction movement
    element.style.setProperty('--dx', `${dx}px`);
    element.style.setProperty('--dy', `${dy}px`);
    element.style.setProperty('--strength', strength.toString());
    
    // Apply attraction CSS class for smooth transition using CSS variables
    element.classList.add('magnetic-attraction');
    
    // 🌀 Add magnetic field visualization for strong attractions
    if (strength > 0.6) { // Only show magnetic field for strong attractions
      const mapContainer = map.current?.getDiv();
      if (mapContainer) {
        const rect = element.getBoundingClientRect();
        const mapRect = mapContainer.getBoundingClientRect();
        const elementCenterX = rect.left - mapRect.left + rect.width / 2;
        const elementCenterY = rect.top - mapRect.top + rect.height / 2;
        
        // Create magnetic field pulse effect
        const magneticField = document.createElement('div');
        magneticField.style.cssText = `
          position: absolute;
          top: ${elementCenterY}px;
          left: ${elementCenterX}px;
          width: 4px;
          height: 4px;
          margin: -2px 0 0 -2px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 900;
          animation: magneticFieldPulse 2000ms cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          will-change: transform, opacity;
        `;
        mapContainer.appendChild(magneticField);
        
        // Clean up magnetic field after a while
        setTimeout(() => {
          if (magneticField.parentElement) {
            magneticField.parentElement.removeChild(magneticField);
          }
        }, 3000);
      }
    }
    
    console.log(`🧲 Applied magnetic attraction to ${venueId}: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, strength=${strength.toFixed(2)}`);
  }, []);

  // Add visual connection line between attracting venues
  const addAttractionLine = useCallback((venue1: any, venue2: any, strength: number) => {
    const mapContainer = map.current?.getDiv();
    if (!mapContainer) return;
    
    // Create SVG line element
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNamespace, 'svg');
    const line = document.createElementNS(svgNamespace, 'line');
    
    // Position the SVG to cover the entire map
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1400;
    `;
    
    // Style the connection line based on attraction strength
    const opacity = Math.min(strength * 0.7, 0.6);
    const strokeWidth = Math.max(strength * 2, 1);
    
    line.setAttribute('x1', venue1.centerX.toString());
    line.setAttribute('y1', venue1.centerY.toString());
    line.setAttribute('x2', venue2.centerX.toString());
    line.setAttribute('y2', venue2.centerY.toString());
    line.setAttribute('stroke', `rgba(255, 56, 92, ${opacity})`);
    line.setAttribute('stroke-width', strokeWidth.toString());
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-dasharray', '5,3');
    
    // Add pulsing animation
    line.style.animation = 'attractionLinePulse 2s ease-in-out infinite';
    
    svg.appendChild(line);
    mapContainer.appendChild(svg);
    
    console.log(`🔗 Added attraction line between ${venue1.venueId} and ${venue2.venueId} (strength: ${strength.toFixed(2)})`);
    
    // Remove the line after a short time
    setTimeout(() => {
      if (svg.parentElement) {
        svg.parentElement.removeChild(svg);
      }
    }, 1200);
  }, []);

  // REMOVED: Old continuous monitoring system - replaced by smooth clustering

  // REMOVED: Old continuous monitoring cleanup - replaced by smooth clustering

  // Calculate clustering progress (0-1) based on zoom level
  const calculateClusteringProgress = useCallback((zoom: number) => {
    // Define zoom ranges for clustering
    const CLUSTER_START_ZOOM = 15; // Venues start moving towards each other
    const CLUSTER_COMPLETE_ZOOM = 12; // Venues fully clustered
    
    if (zoom >= CLUSTER_START_ZOOM) return 0; // No clustering at high zoom
    if (zoom <= CLUSTER_COMPLETE_ZOOM) return 1; // Full clustering at low zoom
    
    // Linear interpolation between start and complete zoom levels
    const progress = (CLUSTER_START_ZOOM - zoom) / (CLUSTER_START_ZOOM - CLUSTER_COMPLETE_ZOOM);
    return Math.max(0, Math.min(1, progress));
  }, []);

  // Predict which venues will cluster at current zoom level
  const predictVenueClusters = useCallback((zoom: number) => {
    const clusterDistance = getClusterDistanceForZoom(zoom);
    const venues = Array.from(markersRef.current.entries());
    const clusters = new Map();
    const processedVenues = new Set();
    
    for (let i = 0; i < venues.length; i++) {
      const [venueId1, marker1] = venues[i];
      if (processedVenues.has(venueId1)) continue;
      
      const element1 = (marker1 as any).getDiv?.();
      if (!element1) continue;
      
      const pos1 = getElementScreenPosition(element1);
      if (!pos1) continue;
      
      const clusterVenues = [{ venueId: venueId1, marker: marker1, element: element1, position: pos1 }];
      
      // Find nearby venues that will cluster with this one
      for (let j = i + 1; j < venues.length; j++) {
        const [venueId2, marker2] = venues[j];
        if (processedVenues.has(venueId2)) continue;
        
        const element2 = (marker2 as any).getDiv?.();
        if (!element2) continue;
        
        const pos2 = getElementScreenPosition(element2);
        if (!pos2) continue;
        
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        );
        
        if (distance < clusterDistance) {
          clusterVenues.push({ venueId: venueId2, marker: marker2, element: element2, position: pos2 });
          processedVenues.add(venueId2);
        }
      }
      
      // Only create cluster if more than one venue
      if (clusterVenues.length > 1) {
        const clusterCenter = calculateClusterCenter(clusterVenues);
        const clusterId = `cluster_${clusterVenues.map(v => v.venueId).sort().join('_')}`;
        
        clusters.set(clusterId, {
          venues: clusterVenues,
          center: clusterCenter,
          id: clusterId
        });
        
        clusterVenues.forEach(v => processedVenues.add(v.venueId));
      } else {
        processedVenues.add(venueId1);
      }
    }
    
    return clusters;
  }, []);

  // Get cluster distance threshold based on zoom level
  const getClusterDistanceForZoom = useCallback((zoom: number) => {
    // Closer zoom = larger distance threshold for clustering
    const minDistance = 50; // Minimum clustering distance
    const maxDistance = 200; // Maximum clustering distance
    const zoomFactor = Math.max(0, Math.min(1, (18 - zoom) / 10)); // 0-1 based on zoom 8-18
    return minDistance + (maxDistance - minDistance) * zoomFactor;
  }, []);

  // Get element screen position relative to map container
  const getElementScreenPosition = useCallback((element: HTMLElement) => {
    if (!map.current) return null;
    
    const mapContainer = map.current.getDiv();
    const mapRect = mapContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    return {
      x: elementRect.left - mapRect.left + elementRect.width / 2,
      y: elementRect.top - mapRect.top + elementRect.height / 2
    };
  }, []);

  // Calculate cluster center from multiple venues
  const calculateClusterCenter = useCallback((venues: any[]) => {
    const totalX = venues.reduce((sum, venue) => sum + venue.position.x, 0);
    const totalY = venues.reduce((sum, venue) => sum + venue.position.y, 0);
    
    return {
      x: totalX / venues.length,
      y: totalY / venues.length
    };
  }, []);

  // Linear interpolation function
  const lerp = useCallback((start: number, end: number, t: number) => {
    return start + (end - start) * t;
  }, []);

  // Easing function for natural movement
  const easeOutCubic = useCallback((t: number) => {
    return 1 - Math.pow(1 - t, 3);
  }, []);

  // Update venue positions smoothly based on clustering progress
  const updateSmoothVenuePositions = useCallback((zoom: number) => {
    const progress = calculateClusteringProgress(zoom);
    clusteringProgress.current = progress;
    
    if (progress === 0) {
      // No clustering - reset all venues to original positions
      markersRef.current.forEach((marker, venueId) => {
        const element = (marker as any).getDiv?.();
        if (element) {
          element.style.transition = 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          element.style.transform = '';
          element.style.opacity = '';
          venueAnimationStates.current.delete(venueId);
        }
      });
      return;
    }
    
    // Predict clusters and apply smooth transitions
    const clusters = predictVenueClusters(zoom);
    predictedClusters.current = clusters;
    
    clusters.forEach((cluster) => {
      cluster.venues.forEach((venue: any) => {
        const { venueId, element, position } = venue;
        if (!element) return;
        
        // Calculate target position (cluster center)
        const targetX = cluster.center.x;
        const targetY = cluster.center.y;
        
        // Get original position (store on first use)
        let originalPos = venueAnimationStates.current.get(venueId);
        if (!originalPos) {
          originalPos = { x: position.x, y: position.y };
          venueAnimationStates.current.set(venueId, originalPos);
        }
        
        // Apply easing to progress
        const easedProgress = easeOutCubic(progress);
        
        // Calculate interpolated position
        const currentX = lerp(originalPos.x, targetX, easedProgress);
        const currentY = lerp(originalPos.y, targetY, easedProgress);
        
        // Calculate movement delta from original position
        const deltaX = currentX - originalPos.x;
        const deltaY = currentY - originalPos.y;
        
        // Calculate scale reduction as venues converge
        const scale = lerp(1, 0.85, easedProgress);
        
        // Calculate opacity fade as venues approach cluster
        const opacity = lerp(1, 0.7, easedProgress * 0.8); // Don't fade too much
        
        // Apply smooth transforms
        element.style.transition = 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 200ms ease-out';
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale3d(${scale}, ${scale}, 1)`;
        element.style.opacity = opacity.toString();
        element.style.willChange = 'transform, opacity';
        
        // Add subtle glow effect during animation
        if (progress > 0.3) {
          element.style.filter = `drop-shadow(0 0 ${progress * 8}px rgba(255, 56, 92, ${progress * 0.4}))`;
        } else {
          element.style.filter = '';
        }
      });
    });
    
    console.log(`✨ Updated ${clusters.size} clusters with progress ${progress.toFixed(2)}`);
  }, [calculateClusteringProgress, predictVenueClusters, lerp, easeOutCubic]);

  // Calculate magnetic attraction force between venues
  const calculateMagneticAttraction = useCallback((venuePos: any, clusterCenter: any, zoom: number) => {
    const distance = Math.sqrt(
      Math.pow(venuePos.x - clusterCenter.x, 2) + Math.pow(venuePos.y - clusterCenter.y, 2)
    );
    
    const maxDistance = getClusterDistanceForZoom(zoom);
    
    if (distance > maxDistance) {
      return { x: 0, y: 0, strength: 0 };
    }
    
    // Calculate attraction strength (stronger as venues get closer)
    const strength = Math.max(0, 1 - (distance / maxDistance));
    const pullStrength = easeOutCubic(strength);
    
    // Calculate direction vector
    const dx = clusterCenter.x - venuePos.x;
    const dy = clusterCenter.y - venuePos.y;
    
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: 0, y: 0, strength: pullStrength };
    
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    
    // Apply magnetic pull with maximum distance
    const maxPull = 30; // Maximum pixels to pull
    
    return {
      x: normalizedDx * pullStrength * maxPull,
      y: normalizedDy * pullStrength * maxPull,
      strength: pullStrength
    };
  }, [getClusterDistanceForZoom, easeOutCubic]);

  // Real-time smooth clustering system
  const startSmoothClustering = useCallback(() => {
    if (smoothClusteringId.current || markersRef.current.size === 0) {
      return; // Already running or no markers
    }
    
    console.log(`🌟 === STARTING SMOOTH CLUSTERING SYSTEM ===`);
    let previousZoomValue = map.current?.getZoom() || 11;
    
    const smoothClusterFrame = () => {
      if (!map.current || markersRef.current.size === 0) {
        console.log(`⏹️ Stopping smooth clustering - no map or markers`);
        smoothClusteringId.current = null;
        return;
      }
      
      const currentZoomValue = map.current.getZoom();
      if (currentZoomValue === undefined) {
        smoothClusteringId.current = requestAnimationFrame(smoothClusterFrame);
        return;
      }
      
      // Check if zoom has changed significantly (threshold to avoid micro-movements)
      const zoomDelta = Math.abs(currentZoomValue - previousZoomValue);
      
      if (zoomDelta > 0.001) { // Only update if zoom actually changed
        // Update smooth venue positions based on current zoom
        updateSmoothVenuePositions(currentZoomValue);
        previousZoomValue = currentZoomValue;
        
        console.log(`🌟 Smooth clustering at zoom ${currentZoomValue.toFixed(2)} (progress: ${clusteringProgress.current.toFixed(2)})`);
      }
      
      // Continue monitoring
      smoothClusteringId.current = requestAnimationFrame(smoothClusterFrame);
    };
    
    smoothClusteringId.current = requestAnimationFrame(smoothClusterFrame);
  }, [updateSmoothVenuePositions]);

  // Stop smooth clustering system
  const stopSmoothClustering = useCallback(() => {
    if (smoothClusteringId.current) {
      cancelAnimationFrame(smoothClusteringId.current);
      smoothClusteringId.current = null;
      console.log(`⏹️ Stopped smooth clustering system`);
    }
  }, []);

  // Reset all venue animations
  const resetVenueAnimations = useCallback(() => {
    markersRef.current.forEach((marker, venueId) => {
      const element = (marker as any).getDiv?.();
      if (element) {
        element.style.transition = 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms ease-out, filter 300ms ease-out';
        element.style.transform = '';
        element.style.opacity = '';
        element.style.filter = '';
        element.style.willChange = 'auto';
      }
    });
    
    // Clear animation states
    venueAnimationStates.current.clear();
    predictedClusters.current.clear();
    clusteringProgress.current = 0;
    
    console.log(`🔄 Reset all venue animations`);
  }, []);

  // TEST: Force clustering between first two venues regardless of distance
  const testForceClustering = useCallback(() => {
    console.log(`🧪 === TESTING FORCED CLUSTERING ===`);
    
    const markers = Array.from(markersRef.current.values());
    if (markers.length < 2) {
      console.log(`⚠️ Need at least 2 markers for test clustering (found ${markers.length})`);
      return;
    }
    
    // Take first two markers
    const marker1 = markers[0];
    const marker2 = markers[1];
    
    const element1 = (marker1 as any).getDiv?.();
    const element2 = (marker2 as any).getDiv?.();
    
    if (!element1 || !element2) {
      console.log(`⚠️ Test clustering failed - no DOM elements`);
      return;
    }
    
    const mapContainer = map.current?.getDiv();
    if (!mapContainer) return;
    
    const mapRect = mapContainer.getBoundingClientRect();
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    
    const centerX1 = rect1.left - mapRect.left + rect1.width / 2;
    const centerY1 = rect1.top - mapRect.top + rect1.height / 2;
    const centerX2 = rect2.left - mapRect.left + rect2.width / 2;
    const centerY2 = rect2.top - mapRect.top + rect2.height / 2;
    
    const midX = (centerX1 + centerX2) / 2;
    const midY = (centerY1 + centerY2) / 2;
    
    console.log(`🧪 Forcing cluster formation at (${midX.toFixed(1)}, ${midY.toFixed(1)})`);
    
    // Create fake venue objects for cluster formation
    const venue1 = { element: element1, venueId: 'test-1', centerX: centerX1, centerY: centerY1 };
    const venue2 = { element: element2, venueId: 'test-2', centerX: centerX2, centerY: centerY2 };
    
    formClusterFromTouchingVenues([venue1, venue2], midX, midY);
  }, []);

  // Fallback clustering method using marker positions instead of DOM elements
  const testFallbackClustering = useCallback(() => {
    console.log(`🧪 === TESTING FALLBACK CLUSTERING (NO DOM) ===`);
    
    const markers = Array.from(markersRef.current.entries());
    if (markers.length < 2) {
      console.log(`⚠️ Need at least 2 markers for fallback clustering (found ${markers.length})`);
      return;
    }
    
    // Take first two markers with their IDs
    const [venueId1, marker1] = markers[0];
    const [venueId2, marker2] = markers[1];
    
    if (!marker1 || !marker2) {
      console.log(`⚠️ Fallback clustering failed - no markers`);
      return;
    }
    
    // Get marker positions directly from Google Maps
    const pos1 = marker1.getPosition();
    const pos2 = marker2.getPosition();
    
    if (!pos1 || !pos2) {
      console.log(`⚠️ Fallback clustering failed - no positions`);
      return;
    }
    
    // Project positions to screen coordinates
    const projection = map.current?.getProjection();
    if (!projection) {
      console.log(`⚠️ Fallback clustering failed - no projection`);
      return;
    }
    
    // Simple animation without DOM element manipulation
    console.log(`🧪 Triggering cluster explosion animation`);
    
    const mapContainer = map.current?.getDiv();
    if (mapContainer) {
      const mapRect = mapContainer.getBoundingClientRect();
      const centerX = mapRect.width / 2;
      const centerY = mapRect.height / 2;
      
      // Just trigger the explosion effect at map center
      setTimeout(() => {
        createTouchExplosionEffect(centerX, centerY, 2);
      }, 100);
    }
  }, []);

  // Form cluster when venues touch each other
  const formClusterFromTouchingVenues = useCallback((venues: any[], centerX: number, centerY: number) => {
    console.log(`🎪 === FORMING CLUSTER FROM ${venues.length} TOUCHING VENUES ===`);
    
    // 🌊 Create pulsing energy waves before collision
    const mapContainer = map.current?.getDiv();
    if (mapContainer) {
      console.log(`🌊 Creating pulsing energy waves at collision point (${centerX}, ${centerY})`);
      
      // Create 3 pulsing energy waves with different timings
      for (let wave = 0; wave < 3; wave++) {
        const energyWave = document.createElement('div');
        energyWave.style.cssText = `
          position: absolute;
          top: ${centerY}px;
          left: ${centerX}px;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          border: 2px solid rgba(255, 56, 92, ${0.8 - wave * 0.2});
          pointer-events: none;
          z-index: 950;
          opacity: 0;
          animation: clusterRippleWave ${800 + wave * 200}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${wave * 150}ms forwards;
          will-change: transform, opacity;
        `;
        mapContainer.appendChild(energyWave);
        
        // Clean up energy wave
        setTimeout(() => {
          if (energyWave.parentElement) {
            energyWave.parentElement.removeChild(energyWave);
          }
        }, 1200 + wave * 200 + wave * 150);
      }
      
      // Create central energy pulse
      const centralPulse = document.createElement('div');
      centralPulse.style.cssText = `
        position: absolute;
        top: ${centerY}px;
        left: ${centerX}px;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,56,92,0.6) 50%, transparent 100%);
        pointer-events: none;
        z-index: 960;
        opacity: 0;
        animation: magneticFieldPulse 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms forwards;
        will-change: transform, opacity;
      `;
      mapContainer.appendChild(centralPulse);
      
      // Clean up central pulse
      setTimeout(() => {
        if (centralPulse.parentElement) {
          centralPulse.parentElement.removeChild(centralPulse);
        }
      }, 1400);
    }
    
    venues.forEach((venue, index) => {
      const { element, venueId } = venue;
      
      // Final convergence animation to exact center
      const finalDx = centerX - venue.centerX;
      const finalDy = centerY - venue.centerY;
      
      element.style.setProperty('--dx', `${finalDx}px`);
      element.style.setProperty('--dy', `${finalDy}px`);
      element.classList.add('clustering');
      element.style.zIndex = '3000';
      
      setTimeout(() => {
        element.style.animation = `venueConvergeToCluster 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
        console.log(`✨ Final convergence: ${venueId} → center`);
      }, index * 50);
      
      // Cleanup
      setTimeout(() => {
        element.style.animation = '';
        element.style.transition = '';
        element.style.transform = '';
        element.classList.remove('clustering', 'magnetic-attraction');
        element.style.removeProperty('--dx');
        element.style.removeProperty('--dy');
        element.style.removeProperty('--strength');
        element.style.zIndex = '';
      }, 500 + (index * 50));
    });
    
    // Create explosion effect at touch point
    setTimeout(() => {
      createTouchExplosionEffect(centerX, centerY, venues.length);
    }, 300);
  }, []);

  // Create epic multi-layered explosion effect when venues touch
  const createTouchExplosionEffect = useCallback((centerX: number, centerY: number, venueCount: number) => {
    console.log(`🎆 === CREATING EPIC CLUSTER EXPLOSION ===`);
    console.log(`💥 Position: (${centerX}, ${centerY}) for ${venueCount} venues`);
    
    const mapContainer = map.current?.getDiv();
    if (!mapContainer) return;
    
    // 🌪️ LAYER 0: Dramatic camera shake effect
    console.log(`🌪️ Applying dramatic camera shake effect`);
    mapContainer.style.animation = 'clusterCameraShake 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    // Clean up camera shake
    setTimeout(() => {
      mapContainer.style.animation = '';
    }, 400);
    
    // Create multiple effect layers for spectacular animation
    
    // Layer 1: Energy burst effect (largest, behind everything)
    const energyBurst = document.createElement('div');
    energyBurst.style.cssText = `
      position: absolute;
      top: ${centerY}px;
      left: ${centerX}px;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,56,92,0.8) 0%, rgba(255,156,92,0.4) 50%, transparent 100%);
      pointer-events: none;
      z-index: 1000;
      animation: clusterEnergyBurst 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      will-change: transform, opacity, filter;
    `;
    mapContainer.appendChild(energyBurst);
    
    // Layer 2: Multiple ripple waves (concentric expanding rings)
    for (let i = 0; i < 3; i++) {
      const rippleWave = document.createElement('div');
      rippleWave.style.cssText = `
        position: absolute;
        top: ${centerY}px;
        left: ${centerX}px;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        background: transparent;
        pointer-events: none;
        z-index: 1100;
        animation: clusterRippleWave ${800 + i * 200}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 150}ms forwards;
        will-change: transform, opacity, border;
      `;
      mapContainer.appendChild(rippleWave);
      
      // Clean up ripple after animation
      setTimeout(() => {
        if (rippleWave.parentElement) {
          rippleWave.parentElement.removeChild(rippleWave);
        }
      }, 1200 + (i * 200) + (i * 150));
    }
    
    // Layer 3: Find and animate the main cluster marker with epic formation
    setTimeout(() => {
      const clusterElements = mapContainer.querySelectorAll('img[src*="data:image/png"]:not([data-venue-id])');
      
      clusterElements.forEach((img: any) => {
        const imgRect = img.getBoundingClientRect();
        const mapRect = mapContainer.getBoundingClientRect();
        
        const imgCenterX = imgRect.left - mapRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top - mapRect.top + imgRect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(imgCenterX - centerX, 2) + 
          Math.pow(imgCenterY - centerY, 2)
        );
        
        if (distance < 60) {
          console.log(`✨ Animating EPIC cluster formation effect`);
          
          // Set initial state for dramatic entrance
          img.style.transform = 'scale3d(0.02, 0.02, 1) rotate(0deg)';
          img.style.opacity = '0';
          img.style.zIndex = '2000';
          img.style.willChange = 'transform, opacity, filter, box-shadow';
          
          // Start epic formation animation
          setTimeout(() => {
            img.style.animation = `clusterEpicFormation 1000ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
          }, 200); // Small delay after energy effects start
          
          // Clean up animation
          setTimeout(() => {
            img.style.animation = '';
            img.style.willChange = 'auto';
            img.style.zIndex = '';
            console.log(`🎉 Epic cluster formation complete!`);
          }, 1250);
        }
      });
    }, 100);
    
    // Layer 4: Additional particle effects (sparkles)
    for (let i = 0; i < 6; i++) {
      const sparkle = document.createElement('div');
      const angle = (360 / 6) * i;
      const sparkleDistance = 40 + Math.random() * 20;
      const sparkleX = centerX + Math.cos(angle * Math.PI / 180) * sparkleDistance;
      const sparkleY = centerY + Math.sin(angle * Math.PI / 180) * sparkleDistance;
      
      sparkle.style.cssText = `
        position: absolute;
        top: ${sparkleY}px;
        left: ${sparkleX}px;
        width: 4px;
        height: 4px;
        margin: -2px 0 0 -2px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,56,92,0.8) 50%, transparent 100%);
        pointer-events: none;
        z-index: 1200;
        opacity: 0;
        animation: clusterEnergyBurst ${600 + Math.random() * 400}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 80}ms forwards;
        will-change: transform, opacity;
      `;
      mapContainer.appendChild(sparkle);
      
      // Clean up sparkle
      setTimeout(() => {
        if (sparkle.parentElement) {
          sparkle.parentElement.removeChild(sparkle);
        }
      }, 800 + Math.random() * 400 + (i * 80));
    }
    
    // Layer 5: Advanced floating particles with different movement patterns
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      const angle = (360 / 12) * i + Math.random() * 30;
      const distance = 25 + Math.random() * 35;
      const particleX = centerX + Math.cos(angle * Math.PI / 180) * distance;
      const particleY = centerY + Math.sin(angle * Math.PI / 180) * distance;
      const size = 2 + Math.random() * 3;
      
      // Different particle types for variety
      const particleType = i % 4;
      let particleColor, animationDuration, animationDelay;
      
      switch (particleType) {
        case 0: // Bright white sparkles
          particleColor = 'rgba(255,255,255,0.9)';
          animationDuration = 800;
          animationDelay = i * 60;
          break;
        case 1: // Pink glow particles
          particleColor = 'rgba(255,56,92,0.7)';
          animationDuration = 1000;
          animationDelay = i * 80;
          break;
        case 2: // Orange energy particles
          particleColor = 'rgba(255,156,92,0.6)';
          animationDuration = 1200;
          animationDelay = i * 70;
          break;
        case 3: // Golden trails
          particleColor = 'rgba(255,200,92,0.5)';
          animationDuration = 900;
          animationDelay = i * 90;
          break;
      }
      
      particle.style.cssText = `
        position: absolute;
        top: ${particleY}px;
        left: ${particleX}px;
        width: ${size}px;
        height: ${size}px;
        margin: -${size/2}px 0 0 -${size/2}px;
        border-radius: 50%;
        background: radial-gradient(circle, ${particleColor} 0%, transparent 70%);
        pointer-events: none;
        z-index: 1100;
        opacity: 0;
        transform: translate3d(0, 0, 0) scale3d(0.1, 0.1, 1);
        animation: clusterParticleFloat ${animationDuration}ms cubic-bezier(0.23, 1, 0.320, 1) ${animationDelay}ms forwards;
        will-change: transform, opacity;
      `;
      mapContainer.appendChild(particle);
      
      // Clean up particle
      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, animationDuration + animationDelay + 200);
    }
    
    // Layer 6: Spiral vortex particles for dramatic cluster formation
    for (let i = 0; i < 8; i++) {
      const vortexParticle = document.createElement('div');
      const spiralAngle = (360 / 8) * i;
      const spiralRadius = 15 + (i * 3);
      const vortexX = centerX + Math.cos(spiralAngle * Math.PI / 180) * spiralRadius;
      const vortexY = centerY + Math.sin(spiralAngle * Math.PI / 180) * spiralRadius;
      
      // Different vortex particle colors for variety
      const vortexColors = [
        'rgba(255,255,255,0.9)',
        'rgba(255,56,92,0.8)',
        'rgba(255,156,92,0.7)',
        'rgba(255,200,92,0.6)'
      ];
      const vortexColor = vortexColors[i % 4];
      
      vortexParticle.style.cssText = `
        position: absolute;
        top: ${vortexY}px;
        left: ${vortexX}px;
        width: 3px;
        height: 3px;
        margin: -1.5px 0 0 -1.5px;
        border-radius: 50%;
        background: radial-gradient(circle, ${vortexColor} 0%, transparent 70%);
        box-shadow: 0 0 10px ${vortexColor};
        pointer-events: none;
        z-index: 1150;
        opacity: 0;
        animation: spiralVortex ${1100 + (i * 50)}ms cubic-bezier(0.68, -0.55, 0.265, 1.55) ${i * 60}ms forwards;
        will-change: transform, opacity;
      `;
      mapContainer.appendChild(vortexParticle);
      
      // Clean up vortex particle
      setTimeout(() => {
        if (vortexParticle.parentElement) {
          vortexParticle.parentElement.removeChild(vortexParticle);
        }
      }, 1200 + (i * 50) + (i * 60));
    }
    
    // Clean up main energy burst
    setTimeout(() => {
      if (energyBurst.parentElement) {
        energyBurst.parentElement.removeChild(energyBurst);
      }
    }, 1250);
    
    console.log(`🎆 Epic explosion sequence initiated with ${3} ripples, ${6} sparkles, and main cluster formation`);
  }, []);

  // Function to detect and animate venues BEFORE they get clustered
  const animateVenueConvergenceBeforeClustering = useCallback((currentZoom: number, previousZoom: number) => {
    if (!map.current) return;
    
    console.log(`🎪 === DETECTING VENUES TO CLUSTER ===`);
    console.log(`📊 Analyzing zoom transition: ${previousZoom} → ${currentZoom}`);
    
    // Get all current visible venue markers
    const currentMarkers = Array.from(markersRef.current.values());
    console.log(`📍 Found ${currentMarkers.length} venue markers`);
    
    // Calculate which venues will cluster at this zoom level
    const projection = map.current.getProjection();
    if (!projection) return;
    
    const scale = Math.pow(2, currentZoom);
    const clusterThreshold = 60; // pixels - venues closer than this will cluster
    
    const processedMarkers = new Set<google.maps.Marker>();
    const clusterGroups: google.maps.Marker[][] = [];
    
    // Group markers that are close enough to cluster
    currentMarkers.forEach(marker => {
      if (processedMarkers.has(marker)) return;
      
      const markerPos = marker.getPosition();
      if (!markerPos) return;
      
      const clusterGroup = [marker];
      processedMarkers.add(marker);
      
      // Find other markers within clustering distance
      currentMarkers.forEach(otherMarker => {
        if (processedMarkers.has(otherMarker) || marker === otherMarker) return;
        
        const otherPos = otherMarker.getPosition();
        if (!otherPos) return;
        
        // Calculate pixel distance at current zoom
        const point1 = projection.fromLatLngToPoint(markerPos);
        const point2 = projection.fromLatLngToPoint(otherPos);
        
        const pixelDistance = Math.sqrt(
          Math.pow((point1.x - point2.x) * scale * 256, 2) + 
          Math.pow((point1.y - point2.y) * scale * 256, 2)
        );
        
        if (pixelDistance < clusterThreshold) {
          clusterGroup.push(otherMarker);
          processedMarkers.add(otherMarker);
        }
      });
      
      // Only consider groups with 2+ markers as clusters
      if (clusterGroup.length >= 2) {
        clusterGroups.push(clusterGroup);
      }
    });
    
    console.log(`🎯 Found ${clusterGroups.length} clusters to animate`);
    
    if (clusterGroups.length === 0) {
      console.log(`⏭️ No clustering needed at zoom ${currentZoom}`);
      return;
    }
    
    // Animate each cluster group
    clusterGroups.forEach((clusterGroup, groupIndex) => {
      console.log(`🎪 Animating cluster group ${groupIndex} with ${clusterGroup.length} venues`);
      
      // Calculate center point for this cluster
      let centerLat = 0, centerLng = 0;
      clusterGroup.forEach(marker => {
        const pos = marker.getPosition();
        if (pos) {
          centerLat += pos.lat();
          centerLng += pos.lng();
        }
      });
      centerLat /= clusterGroup.length;
      centerLng /= clusterGroup.length;
      
      const convergencePoint = new google.maps.LatLng(centerLat, centerLng);
      const convergenceScreenPos = projection.fromLatLngToPoint(convergencePoint);
      
      console.log(`🎯 Cluster ${groupIndex} convergence point:`, convergencePoint.toJSON());
      
      const baseDelay = groupIndex * 100;
      const convergingMarkers: Array<{marker: google.maps.Marker, element: HTMLElement, venueId: string}> = [];
      
      // Prepare each marker in this cluster for animation
      clusterGroup.forEach((marker, markerIndex) => {
        const markerPos = marker.getPosition();
        if (!markerPos) return;
        
        // Get marker element
        const markerElement = (marker as any).getDiv?.();
        if (!markerElement) return;
        
        // Get actual DOM element positions for accurate pixel calculations
        const mapContainer = map.current.getDiv();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Get marker's current screen position
        const markerRect = markerElement.getBoundingClientRect();
        const markerCenterX = markerRect.left - mapRect.left + markerRect.width / 2;
        const markerCenterY = markerRect.top - mapRect.top + markerRect.height / 2;
        
        // Get convergence point screen position
        const convergenceScreenPoint = projection.fromLatLngToDivPixel(convergencePoint);
        if (!convergenceScreenPoint) return;
        
        // Calculate actual pixel movement needed
        const dx = convergenceScreenPoint.x - markerCenterX;
        const dy = convergenceScreenPoint.y - markerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        console.log(`📏 Marker DOM center: (${markerCenterX.toFixed(1)}, ${markerCenterY.toFixed(1)})`);
        console.log(`🎯 Convergence screen point: (${convergenceScreenPoint.x}, ${convergenceScreenPoint.y})`);
        console.log(`➡️ Movement needed: dx=${dx.toFixed(1)}px, dy=${dy.toFixed(1)}px, distance=${distance.toFixed(1)}px`);
        
        if (distance > 20) { // Only animate if meaningful movement
          // Find venue ID
          let venueId: string | null = null;
          for (const [id, venueMarker] of markersRef.current.entries()) {
            if (venueMarker === marker) {
              venueId = id;
              break;
            }
          }
          
          if (venueId) {
            convergingMarkers.push({ marker, element: markerElement, venueId });
            
            // Set up animation
            markerElement.style.setProperty('--dx', `${dx}px`);
            markerElement.style.setProperty('--dy', `${dy}px`);
            markerElement.classList.add('clustering');
            markerElement.style.zIndex = '2000';
            
            console.log(`🏃‍♂️ Venue ${venueId} will converge: dx=${dx.toFixed(1)}px, dy=${dy.toFixed(1)}px, distance=${distance.toFixed(1)}px`);
          }
        }
      });
      
      if (convergingMarkers.length === 0) return;
      
      // Start convergence animations
      convergingMarkers.forEach(({ element, venueId }, index) => {
        const markerDelay = baseDelay + (index * 75);
        
        setTimeout(() => {
          element.style.animation = `venueConvergeToCluster 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
          console.log(`✨ Started convergence animation for venue ${venueId}`);
        }, markerDelay);
        
        // Cleanup after animation
        setTimeout(() => {
          element.style.animation = '';
          element.style.removeProperty('--dx');
          element.style.removeProperty('--dy');
          element.classList.remove('clustering');
          element.style.zIndex = '';
          console.log(`🧹 Cleaned up venue ${venueId}`);
        }, markerDelay + 750);
      });
      
      // Create cluster explosion effect at convergence point
      setTimeout(() => {
        createClusterExplosionEffect(convergencePoint, clusterGroup.length);
      }, baseDelay + (convergingMarkers.length * 40) + 500);
    });
  }, []);

  // Create explosion effect at cluster formation point
  const createClusterExplosionEffect = useCallback((position: google.maps.LatLng, venueCount: number) => {
    if (!map.current) return;
    
    console.log(`💥 Creating cluster explosion effect for ${venueCount} venues`);
    
    // Find cluster markers at this position and animate them
    setTimeout(() => {
      const mapContainer = map.current!.getDiv();
      const clusterImages = mapContainer.querySelectorAll('img[src*="data:image/png"]');
      
      clusterImages.forEach((img: any) => {
        // Skip venue markers (they have data-venue-id)
        if (img.hasAttribute('data-venue-id')) return;
        
        // Check if this cluster marker is at our position (approximate)
        const imgRect = img.getBoundingClientRect();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Simple position check - if it's a cluster marker, animate it
        const textContent = img.alt || '';
        if (textContent.includes('cluster') || img.src.includes('cluster')) {
          console.log(`✨ Animating cluster formation effect`);
          
          img.style.animation = `clusterCollisionForm 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
          
          setTimeout(() => {
            img.style.animation = '';
          }, 650);
        }
      });
    }, 100);
  }, []);

  // Smart cluster renderer with selective animation - only affects clustering venues
  const clusterRenderer = useCallback(() => {
    return {
      render: ({ count, position, markers }: { count: number; position: google.maps.LatLng; markers: google.maps.Marker[] }) => {
        // Determine cluster size based on count for modern design
        let size: 'small' | 'medium' | 'large' = 'small';
        if (count >= 20) size = 'large';
        else if (count >= 10) size = 'medium';

        const clusterIcon = createModernClusterIcon(count, size);
        if (!clusterIcon) return null;

        const clusterMarker = new google.maps.Marker({
          position,
          icon: clusterIcon,
          map: map.current,
          zIndex: 100,
          optimized: false,
        });

        // Smart selective animation - only animate venues forming THIS cluster
        const animateClusterFormation = () => {
          requestAnimationFrame(() => {
            const clusterElement = clusterMarker.getDiv?.();
            if (!clusterElement) return;

            // Get the cluster's screen position
            const projection = map.current?.getProjection();
            if (!projection) return;

            const clusterScreenPosition = projection.fromLatLngToPoint(position);
            const zoom = map.current?.getZoom() || 11;
            const scale = Math.pow(2, zoom);

            // Identify ONLY the markers that form this specific cluster
            const clusteringMarkerIds = new Set<string>();
            
            markers.forEach(marker => {
              // Find the venue ID for this marker
              for (const [venueId, venueMarker] of markersRef.current.entries()) {
                if (venueMarker === marker) {
                  clusteringMarkerIds.add(venueId);
                  break;
                }
              }
            });

            // Apply smooth convergence animation ONLY to clustering venues
            let animationDelay = 0;
            clusteringMarkerIds.forEach(venueId => {
              const venueMarker = markersRef.current.get(venueId);
              if (!venueMarker) return;

              const venueElement = venueMarker.getDiv?.();
              if (!venueElement) return;

              const venuePosition = venueMarker.getPosition();
              if (!venuePosition) return;

              // Calculate precise movement vector
              const venueScreenPosition = projection.fromLatLngToPoint(venuePosition);
              const dx = (clusterScreenPosition.x - venueScreenPosition.x) * scale * 256;
              const dy = (clusterScreenPosition.y - venueScreenPosition.y) * scale * 256;

              // Only animate if there's meaningful movement
              if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                // Mark this venue as clustering to prevent other animations
                activeClusterAnimations.current.add(venueId);
                
                // Set CSS variables and apply modern animation
                venueElement.style.setProperty('--dx', `${dx}px`);
                venueElement.style.setProperty('--dy', `${dy}px`);
                venueElement.classList.add('clustering');
                
                setTimeout(() => {
                  venueElement.style.animation = `venueConvergeToCluster 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
                }, animationDelay);

                animationDelay += 75; // Increased stagger for better visual effect

                // Cleanup after animation completes
                setTimeout(() => {
                  venueElement.style.animation = '';
                  venueElement.style.removeProperty('--dx');
                  venueElement.style.removeProperty('--dy');
                  venueElement.classList.remove('clustering');
                  activeClusterAnimations.current.delete(venueId);
                }, 650 + animationDelay);
              }
            });

            // Animate cluster formation AFTER venues have converged (collision effect)
            const clusterFormationDelay = Math.max(400, (animationDelay * 0.7)); // Wait for venues to reach ~70% convergence
            setTimeout(() => {
              clusterElement.classList.add('cluster-marker');
              clusterElement.style.animation = `clusterCollisionForm 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
              
              // Cleanup cluster animation
              setTimeout(() => {
                clusterElement.style.animation = '';
                clusterElement.classList.remove('cluster-marker');
              }, 550);
            }, clusterFormationDelay);
          });
        };

        // Only animate if we're in a zoom-out scenario that creates clusters
        const currentZoom = map.current?.getZoom() || 11;
        if (currentZoom < 14 && count >= 2) {
          animateClusterFormation();
        }

        // Clean hover effects
        clusterMarker.addListener('mouseover', () => {
          const element = clusterMarker.getDiv?.();
          if (element) {
            element.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.transform = 'scale(1.1)';
          }
        });
        
        clusterMarker.addListener('mouseout', () => {
          const element = clusterMarker.getDiv?.();
          if (element) {
            element.style.transform = 'scale(1)';
          }
        });

        // Create cluster info object for tracking
        const clusterInfo = {
          marker: clusterMarker,
          markers: markers,
          count: count,
          size: size,
          position: position
        };

        // Map each venue in this cluster to the cluster info (only if there are multiple markers)
        if (markers.length > 1) {
          markers.forEach(marker => {
            for (const [venueId, venueMarker] of markersRef.current.entries()) {
              if (venueMarker === marker) {
                venueToClusterMap.current.set(venueId, clusterInfo);
                break;
              }
            }
          });
        }

        return clusterMarker;
      }
    };
  }, []);

  // Create HTML content for the popup
  const createPopupContent = useCallback((venue: Venue, currentLanguage: string) => {
    // Get venue images
    const venueImages = venue.images && venue.images.length > 0 
      ? venue.images 
      : ["https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800"];
    
    // Get price using the stored calculated price from VenueMarker component
    const storedPrice = venuePrices.current.get(venue.id);
    const price = storedPrice || (typeof venue.price === 'number' && venue.price > 0 ? venue.price : 25);
    
    // Get working hours
    const todaySchedule = getTodaySchedule(venue.working_hours);
    const workingHoursText = !todaySchedule ? "24/7" : 
      todaySchedule.closed ? "Closed Today" : 
      `${todaySchedule.open} - ${todaySchedule.close}`;
    
    // Get venue services from stored data
    const services = venueServices.current.get(venue.id);
    let servicesHTML = '';
    
    // Get discount information
    const discountInfo = getVenueDiscountInfo(services || []);
    
    // Dark mode colors
    console.log('AirbnbStyleMap: Creating popup content, isDarkMode:', isDarkMode);
    const bgColor = isDarkMode ? '#1f2937' : 'white';
    const borderColor = isDarkMode ? '#374151' : '#e5e7eb';
    const textColor = isDarkMode ? '#f9fafb' : '#111827';
    const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';
    const serviceTagBg = isDarkMode ? '#1e3a8a' : '#dbeafe';
    const serviceTagColor = isDarkMode ? '#93c5fd' : '#1d4ed8';
    const serviceTagBorder = isDarkMode ? '#1e40af' : '#bfdbfe';
    const priceOverlayBg = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    
    // Create discount badge HTML
    let discountBadgeHTML = '';
    if (discountInfo.hasDiscount) {
      const discountIcon = discountInfo.bestDiscount?.type === 'overall' ? '%' :
                          discountInfo.bestDiscount?.type === 'group' ? '👥' :
                          discountInfo.bestDiscount?.type === 'timeslot' ? '🕐' :
                          discountInfo.bestDiscount?.type === 'freeHours' ? '🎁' : '%';
      
      discountBadgeHTML = `
        <div style="
          position: absolute;
          top: 8px;
          right: 8px;
        ">
          <div style="
            background: #059669;
            color: white;
            border-radius: 9999px;
            padding: 2px 6px;
            display: flex;
            align-items: center;
            gap: 2px;
            backdrop-filter: blur(4px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            animation: pulse 2s infinite;
          ">
            <span style="font-size: 9px;">${discountIcon}</span>
            <span style="font-size: 9px; font-weight: 600;">${discountInfo.bestDiscount?.label}</span>
          </div>
        </div>
      `;
    }
    
    if (services && services.length > 0) {
      // Always show only 1 service in map popups for better spacing
      const maxServices = 1;
      
      let serviceTags = services.slice(0, maxServices).map(service => {
        const translatedName = getTranslatedServiceName({
          name: service.services?.name || 'Unknown Service',
          name_en: service.services?.name_en,
          name_ka: service.services?.name_ka
        }, currentLanguage);
        
        return `<span style="
          background: ${serviceTagBg};
          color: ${serviceTagColor};
          border: 1px solid ${serviceTagBorder};
          border-radius: 9999px;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: 500;
          display: inline-block;
          margin-right: 4px;
        ">${translatedName}</span>`;
      }).join('');
      
      if (services.length > maxServices) {
        const counterBg = isDarkMode ? '#374151' : '#f3f4f6';
        const counterColor = isDarkMode ? '#d1d5db' : '#6b7280';
        const counterBorder = isDarkMode ? '#4b5563' : '#d1d5db';
        
        serviceTags += `<span style="
          background: ${counterBg};
          color: ${counterColor};
          border: 1px solid ${counterBorder};
          border-radius: 9999px;
          padding: 2px 4px;
          font-size: 9px;
          font-weight: 500;
          display: inline-block;
          margin-right: 4px;
        ">+${services.length - maxServices}</span>`;
      }
      
      servicesHTML = `${serviceTags}`;
    } else {
      servicesHTML = `<span style="
        background: ${serviceTagBg};
        color: ${serviceTagColor};
        border: 1px solid ${serviceTagBorder};
        border-radius: 9999px;
        padding: 2px 6px;
        font-size: 9px;
        font-weight: 500;
      ">Gaming</span>`;
    }

    return `
      <div class="airbnb-popup" style="
        background: ${bgColor};
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, ${isDarkMode ? '0.5' : '0.1'}), 0 10px 10px -5px rgba(0, 0, 0, ${isDarkMode ? '0.4' : '0.04'});
        border: 1px solid ${borderColor};
        overflow: hidden;
        max-width: 280px;
        min-height: 280px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <!-- Image Section -->
        <div style="position: relative;">
                      <div style="
              position: relative;
              overflow: hidden;
              aspect-ratio: 3/2;
            ">
            <img src="${venueImages[0]}" alt="${venue.name}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            " onerror="this.src='https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800';">
            


            <!-- Star Rating Badge -->
            <div style="
              position: absolute;
              top: 8px;
              left: 8px;
            ">
              <div style="
                background: #2563eb;
                color: white;
                border-radius: 9999px;
                padding: 4px 8px;
                display: flex;
                align-items: center;
                gap: 4px;
                backdrop-filter: blur(4px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              ">
                <span style="font-size: 12px;">★</span>
                <span style="font-size: 12px; font-weight: 600;">${venue.rating || 0}</span>
              </div>
            </div>
            
            <!-- Discount Badge -->
            ${discountBadgeHTML}
            
            <!-- Price Overlay -->
            <div style="
              position: absolute;
              bottom: 6px;
              right: 6px;
            ">
              <div style="
                background: ${priceOverlayBg};
                backdrop-filter: blur(4px);
                border-radius: 4px;
                padding: 4px 6px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              ">
                <div style="display: flex; align-items: baseline; gap: 2px;">
                  <span style="font-size: 12px; font-weight: 600; color: #2563eb;">
                    ${price} ${t('booking.currency')}
                  </span>
                  <span style="font-size: 10px; color: ${secondaryTextColor};">/${t('common.hourShort')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Section -->
        <div style="padding: 10px; space-y: 6px;">
          <!-- Venue Name -->
          <h3 style="
            font-weight: 700;
            color: ${textColor};
            font-size: 13px;
            line-height: 1.2;
            margin: 0 0 6px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${venue.name}</h3>
          
          <!-- Location Row -->
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 6px;
          ">
            <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
              <span style="font-size: 11px; margin-right: 4px;">📍</span>
              <span style="font-size: 11px; font-weight: 500; color: ${textColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${venue.location}
              </span>
            </div>
          </div>
          
          <!-- Service Tags and Availability Time Row -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          ">
            <div style="display: flex; align-items: center; flex: 1; min-width: 0; margin-right: 12px;">
              ${servicesHTML}
            </div>
            <div style="display: flex; align-items: center; margin-left: 8px; flex-shrink: 0;">
              <span style="font-size: 9px; margin-right: 2px; color: #9ca3af;">🕐</span>
              <span style="font-size: 10px; font-weight: 500; color: ${secondaryTextColor};">${workingHoursText}</span>
            </div>
          </div>

          <!-- View Details Button -->
          <button onclick="window.viewVenue && window.viewVenue('${venue.id}')" style="
            width: 100%;
            background: #2563eb;
            color: white;
            font-weight: 600;
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          " onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
            View Details
            <span style="font-size: 10px;">→</span>
          </button>
        </div>
      </div>
    `;
  }, [i18n.language, isDarkMode, t]);

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
    if (!mapRef.current || !googleMapsApiKey) return;

    if (!window.google || !window.google.maps) return;

    console.log('AirbnbStyleMap: Initializing map with', venuesWithCoords.length, 'venues');

    const mapOptions: google.maps.MapOptions = {
      center: { lat: 41.7151, lng: 44.8271 }, // Tbilisi, Georgia
      zoom: 11,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      gestureHandling: 'greedy', // Enable single-finger navigation on mobile
      
      // Use Google's native dark mode color scheme
      colorScheme: isDarkMode ? google.maps.ColorScheme.DARK : google.maps.ColorScheme.LIGHT,
      
      // Disable all default UI controls for a completely clean map
      disableDefaultUI: true,
      
      // Enable smooth zoom functionality
      zoomControl: false, // We disable UI but keep functionality
      scrollwheel: true, // Enable mouse wheel zoom
      disableDoubleClickZoom: false, // Allow double-click zoom
      
      // Zoom range and behavior settings for smooth zooming
      minZoom: 8, // Minimum zoom level (wider area view)
      maxZoom: 20, // Maximum zoom level (street level detail)
      
      // Enable smooth fractional zoom levels instead of discrete steps
      isFractionalZoomEnabled: true,
      
      // Optimize for mobile performance
      clickableIcons: false, // Disable clicking on POI icons to prevent interference
      
      // Map type control settings
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      
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

      // Wait for map to be fully loaded before creating markers
      google.maps.event.addListenerOnce(map.current, 'tilesloaded', () => {
        console.log('AirbnbStyleMap: Map tiles loaded, setting map ready');
        setIsMapReady(true);
        
        // Fit map to show all venues after map is loaded (configurable)
        if (fitToVenuesOnLoad && venuesWithCoords.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          venuesWithCoords.forEach(({ coordinates }) => {
            bounds.extend(coordinates);
          });
          
          // Fit the map to show all venues with some padding
          map.current!.fitBounds(bounds, {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          });
          
          console.log('AirbnbStyleMap: Map fitted to show all venues');
        }
      });

      map.current.addListener('bounds_changed', () => {
        if (map.current) {
          const bounds = map.current.getBounds();
          if (bounds) {
            debouncedBoundsChange(bounds);
          }
        }
      });

      map.current.addListener('dragstart', () => {
        isUserInteracting.current = true;
        // Close info window when dragging
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }
      });

      map.current.addListener('dragend', () => {
        setTimeout(() => {
          isUserInteracting.current = false;
        }, 100);
      });
      
      // REMOVED: Redundant zoom listener - consolidated into single efficient system below

      // Enhanced zoom change handler with venue convergence animations
      let previousZoom = map.current.getZoom() || 11;
      lastZoom.current = previousZoom;
      
      // REMOVED: Redundant drag listeners - already handled above
      
      // CONSOLIDATED: Single efficient zoom handler with all functionality
      map.current.addListener('zoom_changed', () => {
        isUserInteracting.current = true;
        
        // Close info window when zooming
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }
        
        const currentZoom = map.current?.getZoom() || 11;
      // Avoid React re-renders on every zoom tick to keep interactions smooth
      // setCurrentZoom(currentZoom);
        
        // Debounced marker size updates for performance
        if (zoomUpdateTimeoutRef.current) {
          clearTimeout(zoomUpdateTimeoutRef.current);
        }
        zoomUpdateTimeoutRef.current = setTimeout(() => {
          updateMarkerSizes(currentZoom);
        }, 100); // Optimized delay
        
        // Start smooth clustering system if markers are available (replaces old monitoring)
        if (markersRef.current.size > 0) {
          startSmoothClustering();
          console.log(`🌟 Smooth clustering activated for zoom ${currentZoom.toFixed(1)}`);
        }
        
        previousZoom = currentZoom;
        
        // Reset interaction flag after zoom completes
        setTimeout(() => {
          isUserInteracting.current = false;
        }, 300);
      });

    } catch (error) {
      console.error('AirbnbStyleMap: Error initializing map:', error);
    }

    return () => {
      // Cleanup timeouts
      if (boundsChangeTimeout.current) {
        clearTimeout(boundsChangeTimeout.current);
      }
      if (zoomUpdateTimeoutRef.current) {
        clearTimeout(zoomUpdateTimeoutRef.current);
      }
      
      setIsMapReady(false);
      
      // Cleanup user location marker
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
        userLocationMarkerRef.current = null;
      }
      
      // Cleanup info window
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }

      // Cleanup marker clusterer and cluster highlighting
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }
      
      // Remove any cluster highlighting
      removeClusterHighlight();

      // Clear venue to cluster mapping
      venueToClusterMap.current.clear();

      // Cleanup individual markers and reset animations
      markersRef.current.forEach(marker => {
        const markerElement = marker.getDiv?.();
        if (markerElement) {
          // Reset all animation properties for performance
          markerElement.style.animation = '';
          markerElement.style.willChange = 'auto';
          markerElement.style.transform = '';
          markerElement.style.opacity = '';
          markerElement.style.filter = '';
          markerElement.classList.remove('clustering');
          markerElement.style.removeProperty('--dx');
          markerElement.style.removeProperty('--dy');
        }
        marker.setMap(null);
      });
      markersRef.current.clear();
      
      // Stop smooth clustering on cleanup
      stopSmoothClustering();

      // Remove custom CSS styles to prevent memory leaks
      const styleElement = document.getElementById('modern-cluster-animations');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [googleMapsApiKey, debouncedBoundsChange, venuesWithCoords, isDarkMode]);

  // Handle venue click with InfoWindow
  const handleVenueClick = useCallback((venue: Venue) => {
    console.log('AirbnbStyleMap: Venue clicked:', venue.name, 'isDarkMode:', isDarkMode);
    
    // Set selected marker ID for visual feedback (always do this)
    setSelectedMarkerId(venue.id);
    
    // Call the venue click handler first (for mobile venue card updates)
    onVenueClick?.(venue);
    
    // If popups are disabled, don't show InfoWindow popup
    if (!showPopups) {
      console.log('AirbnbStyleMap: Popups disabled - skipping InfoWindow');
      return;
    }
    
    // If no onVenueClick handler is provided, don't show popup
    if (!onVenueClick) {
      console.log('AirbnbStyleMap: No venue click handler - skipping popup');
      return;
    }
    
    // Close any existing info window first
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }
    
    // Get coordinates for the venue
    const coordinates = stableCoordinates.current.get(venue.id) || getVenueCoordinates(venue);
    
    // Set up global functions for the popup
    (window as { closePopup?: () => void; viewVenue?: (venueId: string) => void }).closePopup = () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      setSelectedMarkerId(null);
    };
    
    (window as { closePopup?: () => void; viewVenue?: (venueId: string) => void }).viewVenue = (venueId: string) => {
      window.location.href = `/venue/${venueId}`;
    };
    
    // Create and open the InfoWindow with current dark mode state
    const infoWindow = new google.maps.InfoWindow({
      content: createPopupContent(venue, i18n.language),
      maxWidth: 280,
      pixelOffset: new google.maps.Size(0, -10), // Offset above the marker
      disableAutoPan: false // Allow auto-pan to keep popup visible
    });
    
    infoWindow.open(map.current);
    infoWindow.setPosition(coordinates);
    activeInfoWindowRef.current = infoWindow;
  }, [onVenueClick, showPopups, createPopupContent, isDarkMode]);

  // Initialize MarkerClusterer and create venue markers - optimized for smooth zoom
  useEffect(() => {
    if (!isMapReady || !map.current || !window.google || !venuesWithCoords.length) {
      return;
    }

    console.log('AirbnbStyleMap: Initializing MarkerClusterer with', venuesWithCoords.length, 'venues');

    // Only clear markers if venues have changed significantly
    const existingVenueIds = Array.from(markersRef.current.keys());
    const newVenueIds = venuesWithCoords.map(({ venue }) => venue.id);
    const venuesChanged = existingVenueIds.length !== newVenueIds.length || 
                         !existingVenueIds.every(id => newVenueIds.includes(id));
    
    if (venuesChanged) {
      // Clear existing markers and clusterer only when venues actually change
      console.log('AirbnbStyleMap: Venues changed, recreating markers');
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }
      
      // Remove any cluster highlighting
      removeClusterHighlight();

      // Clear venue to cluster mapping
      venueToClusterMap.current.clear();

      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
    } else {
      // Just update existing markers if venues haven't changed
      console.log('AirbnbStyleMap: Venues unchanged, updating markers only');
      updateMarkerSizes(currentZoom);
      return;
    }

    // Create individual markers
    const markers: google.maps.Marker[] = [];
    
    venuesWithCoords.forEach(({ venue, coordinates }) => {
      // Calculate price for this venue using loaded services data
      let price = venuePrices.current.get(venue.id) || getVenuePriceFallback(venue);

      const isSelected = selectedMarkerId === venue.id || selectedVenue?.id === venue.id || hoveredVenue?.id === venue.id;
      const isOpen = isVenueBookableNow(venue.working_hours);
      const markerIcon = createMarkerIcon(price, isSelected, isOpen);
      
      if (!markerIcon) {
        console.error('Failed to create marker icon for venue:', venue.name, 'price:', price);
        // Use a fallback simple marker if icon creation fails
        const fallbackIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#475569" stroke="white" stroke-width="2"/>
              <text x="20" y="25" text-anchor="middle" fill="white" font-size="10" font-family="Arial">${price}₾</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
          origin: new google.maps.Point(0, 0)
        };
        
        const marker = new google.maps.Marker({
          position: coordinates,
          title: venue.name,
          icon: fallbackIcon,
          clickable: onVenueClick ? true : false,
          draggable: false,
          zIndex: 1
        });

        markers.push(marker);
        markersRef.current.set(venue.id, marker);
        return;
      }

      const marker = new google.maps.Marker({
        position: coordinates,
        title: venue.name,
        icon: markerIcon,
        clickable: true,
        draggable: false,
        zIndex: isSelected ? 10 : 1,
        optimized: false
      });

      // Add click listener
      marker.addListener('click', () => {
        console.log('Marker clicked for venue:', venue.name);
        handleVenueClick(venue);
      });

      markers.push(marker);
      markersRef.current.set(venue.id, marker);
    });

    // Clear any stale venue-to-cluster mappings before creating new clusterer
    venueToClusterMap.current.clear();
    
    // Create MarkerClusterer with enhanced animation configuration
    const clusterer = new MarkerClusterer({
      map: map.current,
      markers,
      renderer: clusterRenderer(),
      algorithmOptions: {
        maxZoom: 15, // Don't cluster at zoom levels higher than 15
        gridSize: 50, // Slightly smaller grid for better clustering
        minimumClusterSize: 2, // Minimum markers needed to form a cluster
      },
      onClusterClick: (event, cluster, map) => {
        // Gentle zoom to show cluster markers
        const bounds = new google.maps.LatLngBounds();
        cluster.markers.forEach(marker => {
          bounds.extend(marker.getPosition()!);
        });
        
        // Smooth, gentle zoom with comfortable padding
        map.fitBounds(bounds, { 
          padding: 80,
          maxZoom: 16 // Prevent over-zooming
        });
        
        return true; // Allow default smooth behavior
      },
    });

    markerClustererRef.current = clusterer;
    console.log('AirbnbStyleMap: MarkerClusterer initialized with', markers.length, 'markers');

  }, [isMapReady, venuesWithCoords, handleVenueClick, clusterRenderer]); // Removed zoom-related dependencies
  
  // Separate effect for updating marker appearance on selection/hover changes
  useEffect(() => {
    if (markersRef.current.size === 0) return;
    
    console.log('AirbnbStyleMap: Updating marker selection states');
    updateMarkerSizes(currentZoom);
  }, [selectedMarkerId, selectedVenue?.id, hoveredVenue?.id, currentZoom, updateMarkerSizes]);

  // Update marker selection states
  useEffect(() => {
    if (!isMapReady || !markersRef.current.size) return;

    markersRef.current.forEach((marker, venueId) => {
      const venue = venues.find(v => v.id === venueId);
      if (!venue) return;

      const isSelected = selectedMarkerId === venueId || selectedVenue?.id === venueId || hoveredVenue?.id === venueId;
      
      // Get price for marker using loaded services data
      let price = venuePrices.current.get(venueId) || getVenuePriceFallback(venue);

      const isOpen = isVenueBookableNow(venue.working_hours);
      const markerIcon = createMarkerIcon(price, isSelected, isOpen);
      if (markerIcon) {
        marker.setIcon(markerIcon);
        marker.setZIndex(isSelected ? 10 : 1);
      }
    });

  }, [isMapReady, selectedMarkerId, selectedVenue, hoveredVenue, venues]);

  // Handle hoveredVenue changes - highlight cluster if hovered venue is part of one
  useEffect(() => {
    if (!isMapReady || !markerClustererRef.current) return;

    // Remove any existing cluster highlighting
    removeClusterHighlight();

    if (hoveredVenue) {
      console.log('AirbnbStyleMap: Checking if hovered venue is in a cluster:', hoveredVenue.name);
      
      // Find which cluster contains this venue
      const containingCluster = findClusterContainingVenue(hoveredVenue.id);
      
      if (containingCluster) {
        console.log('AirbnbStyleMap: Found cluster containing hovered venue, highlighting it');
        highlightCluster(containingCluster);
      } else {
        console.log('AirbnbStyleMap: Hovered venue is not in a cluster (showing individually)');
      }
    }
  }, [hoveredVenue, isMapReady, findClusterContainingVenue, highlightCluster, removeClusterHighlight]);

  // Handle mapCenter changes - center map on user's location or venue selection
  useEffect(() => {
    if (!map.current || !mapCenter) return;

    console.log(`AirbnbStyleMap: Centering map (${centeringType}):`, mapCenter);
    
    if (centeringType === 'user') {
      // Remove existing user location marker if it exists
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
        userLocationMarkerRef.current = null;
      }
      
      // Create user location marker
      const newUserMarker = new google.maps.Marker({
        position: mapCenter,
        map: map.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: 1000,
      });
      
      userLocationMarkerRef.current = newUserMarker;
      
      // Smoothly animate to user's location
      map.current.panTo(mapCenter);
      map.current.setZoom(14); // Zoom in to a reasonable level for user location
    } else if (centeringType === 'venue') {
      // For venue selection, just pan to the venue without changing zoom dramatically
      const currentZoom = map.current.getZoom();
      
      // Smoothly pan to the venue
      map.current.panTo(mapCenter);
      
      // Only adjust zoom if we're too far out (less than 12) or too close (more than 16)
      if (currentZoom < 12) {
        map.current.setZoom(13); // Zoom in to show venue details
      } else if (currentZoom > 16) {
        map.current.setZoom(15); // Zoom out slightly for better context
      }
      
      console.log(`🎯 Centered map on venue at zoom ${currentZoom} → keeping contextual zoom`);
    }
  }, [mapCenter, centeringType]);


  // Handle hovered venue - only highlight marker, don't show popup when hovering over venue cards
  useEffect(() => {
    if (!map.current || !hoveredVenue) {
      // Close popup when no venue is hovered
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      setSelectedMarkerId(null);
      return;
    }

    console.log('AirbnbStyleMap: Venue hovered:', hoveredVenue.name);
    
    // Just update the selected marker ID to highlight it, but don't open a popup
    // The marker color change is handled by other effects that watch hoveredVenue
    setSelectedMarkerId(hoveredVenue.id);
    
  }, [hoveredVenue]);

  // Handle dark mode changes - close and reopen popup if it's open
  useEffect(() => {
    if (activeInfoWindowRef.current && selectedMarkerId) {
      console.log('AirbnbStyleMap: Dark mode changed, closing and reopening popup');
      
      // Find the venue that has the popup open
      const venue = venues.find(v => v.id === selectedMarkerId);
      if (venue) {
        // Close the current popup
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
        
        // Reopen with new dark mode styling
        const coordinates = stableCoordinates.current.get(venue.id) || getVenueCoordinates(venue);
        
        const infoWindow = new google.maps.InfoWindow({
          content: createPopupContent(venue, i18n.language),
          maxWidth: 280,
          pixelOffset: new google.maps.Size(0, -10),
          disableAutoPan: false
        });
        
        infoWindow.open(map.current);
        infoWindow.setPosition(coordinates);
        activeInfoWindowRef.current = infoWindow;
      }
    }
  }, [isDarkMode, selectedMarkerId, venues, createPopupContent, i18n.language]);

  // Handle map reset
  useEffect(() => {
    if (!map.current || resetTrigger === undefined) return;

    console.log('AirbnbStyleMap: Resetting map...');
    
    // Close any open info windows
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }
    
    // Reset selected marker
    setSelectedMarkerId(null);
    
    // Reset map to default view (Tbilisi center)
    const defaultCenter = { lat: 41.7151, lng: 44.8271 };
    const defaultZoom = 11;
    
    map.current.setCenter(defaultCenter);
    map.current.setZoom(defaultZoom);
    
    // Clear user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
      userLocationMarkerRef.current = null;
    }
    
  }, [resetTrigger]);

  // Close info window when clicking on map
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      setSelectedMarkerId(null);
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
      {/* Markers are now managed by MarkerClusterer in useEffect */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  // This prevents unnecessary re-renders when props haven't meaningfully changed
  
  // Compare venues array efficiently - most critical optimization
  if (prevProps.venues.length !== nextProps.venues.length) {
    return false;
  }
  
  // Quick ID-based comparison for venues (assumes same order for efficiency)
  for (let i = 0; i < prevProps.venues.length; i++) {
    if (prevProps.venues[i].id !== nextProps.venues[i].id) {
      return false;
    }
  }
  
  // Compare other important props that affect map behavior
  const propsEqual = (
    prevProps.selectedVenue?.id === nextProps.selectedVenue?.id &&
    prevProps.hoveredVenue?.id === nextProps.hoveredVenue?.id &&
    prevProps.mapCenter?.lat === nextProps.mapCenter?.lat &&
    prevProps.mapCenter?.lng === nextProps.mapCenter?.lng &&
    prevProps.centeringType === nextProps.centeringType &&
    prevProps.resetTrigger === nextProps.resetTrigger &&
    prevProps.googleMapsApiKey === nextProps.googleMapsApiKey &&
    prevProps.className === nextProps.className &&
    prevProps.showPopups === nextProps.showPopups &&
    prevProps.fitToVenuesOnLoad === nextProps.fitToVenuesOnLoad &&
    prevProps.onVenueClick === nextProps.onVenueClick &&
    prevProps.onBoundsChange === nextProps.onBoundsChange
  );
  
  return propsEqual;
});

export default AirbnbStyleMap;