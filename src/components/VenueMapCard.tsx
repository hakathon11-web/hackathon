import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Star, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Venue } from "@/hooks/useVenues";
import { TBILISI_DISTRICT_EN } from "@/constants/districts";

interface VenueMapCardProps {
  venue: Venue;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

const VenueMapCard = ({ venue, onClose, userLocation }: VenueMapCardProps) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  // Get translated district name
  const getLocationLabel = (location: string | null | undefined, district: string | null | undefined): string => {
    if (location) return location;
    if (!district) return '';
    
    // Check if current language is English
    const isEnglish = (t as any).i18n?.language === 'en';
    return isEnglish 
      ? TBILISI_DISTRICT_EN[district as keyof typeof TBILISI_DISTRICT_EN] || district
      : district;
  };

  // Calculate distance if user location is available
  const calculateDistance = () => {
    if (!userLocation || !venue.latitude || !venue.longitude) return null;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (venue.latitude - userLocation.lat) * Math.PI / 180;
    const dLon = (venue.longitude - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(venue.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000; // Convert to meters
    
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    } else {
      return `${(distance / 1000).toFixed(1)} km`;
    }
  };

  const distance = calculateDistance();
  const venueImage = venue.images && venue.images.length > 0 ? venue.images[0] : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between p-4">
        {/* Venue Image */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          {venueImage && !imageError ? (
            <img
              src={venueImage}
              alt={venue.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Venue Details */}
        <div className="flex-1 ml-4 min-w-0">
          {/* Venue Name */}
          <h3 className="font-bold text-lg text-foreground truncate">
            {venue.name}
          </h3>
          
          {/* Location/District */}
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-600 truncate">
              {getLocationLabel(venue.location, venue.district)}
            </p>
          </div>

          {/* Distance and Rating Row */}
          <div className="flex items-center gap-4 mt-2">
            {/* Distance */}
            {distance && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{distance}</span>
              </div>
            )}
            
            {/* Rating */}
            {venue.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-700">
                  {venue.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-3">
          {/* Navigate Button */}
          {venue.latitude && venue.longitude && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-full border-2"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
                window.open(url, '_blank');
              }}
              title={t('venue.navigate', 'Get directions')}
            >
              <Navigation className="w-4 h-4" />
            </Button>
          )}
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
            onClick={onClose}
            title={t('venue.close', 'Close')}
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>
      
      {/* Bottom handle for visual indication */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
    </div>
  );
};

export default VenueMapCard;