import React from 'react';
import { Venue } from '@/hooks/useVenues';
import GoogleMapsWrapper from './GoogleMapsWrapper';

interface AirbnbMapProps {
  venues: Venue[];
  selectedVenue?: Venue | null;
  onVenueClick?: (venue: Venue) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
}

const AirbnbMap = ({ 
  venues, 
  selectedVenue, 
  onVenueClick, 
  onBoundsChange,
  className = "w-full h-full"
}: AirbnbMapProps) => {
  return (
    <GoogleMapsWrapper
      venues={venues}
      selectedVenue={selectedVenue}
      onVenueClick={onVenueClick}
      onBoundsChange={onBoundsChange}
      className={className}
    />
  );
};

export default AirbnbMap;