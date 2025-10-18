import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Venue, useVenueServices } from '@/hooks/useVenues';
import { useTranslation } from 'react-i18next';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';
import { getVenueDiscountInfo } from '@/utils/venuePricing';
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { Button } from '@/components/ui/button';
import VenueCardBookingDialog from '@/components/VenueCardBookingDialog';

interface MobileVenueCardProps {
  venues: Venue[];
  currentVenueIndex: number;
  userLocation?: { latitude: number; longitude: number } | null;
  onVenueChange?: (index: number) => void;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
};

// Generate stable coordinates for venues (same logic as in SearchResults)
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

const MobileVenueCard: React.FC<MobileVenueCardProps> = ({
  venues,
  currentVenueIndex,
  userLocation,
  onVenueChange
}) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const chipsContainerRef = useRef<HTMLDivElement | null>(null);

  // Get current venue
  const currentVenue = venues[currentVenueIndex];
  const { data: services } = useVenueServices(currentVenue?.id || '');

  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);

  // Handle venue changes with transition effect
  useEffect(() => {
    if (currentVenue) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentVenue]);

  if (!currentVenue || venues.length === 0) {
    return null;
  }

  // Calculate distance if user location is available
  const getDistanceText = () => {
    if (!userLocation) return null;
    
    const venueCoords = getVenueCoordinates(currentVenue);
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      venueCoords.lat,
      venueCoords.lng
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else {
      return `${distance.toFixed(1)} km`;
    }
  };

  // Handle touch events for swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance && currentVenueIndex < venues.length - 1) {
      // Swiped left - next venue
      onVenueChange?.(currentVenueIndex + 1);
    } else if (distance < -minSwipeDistance && currentVenueIndex > 0) {
      // Swiped right - previous venue
      onVenueChange?.(currentVenueIndex - 1);
    }
  };

  // Get venue image
  const venueImage = currentVenue.images && currentVenue.images.length > 0 
    ? currentVenue.images[0] 
    : "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800";

  const distanceText = getDistanceText();


  // Get price information
  const getPriceInfo = () => {
    if (services && services.length > 0) {
      const prices = services.map(service => {
        const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'));
        return extractNumericPrice(displayPrice) || service.price;
      });
      const minPrice = Math.min(...prices);
      return minPrice > 0 ? `${minPrice} ${t('booking.currency')}` : `0 ${t('booking.currency')}`;
    }
    return currentVenue.price > 0 ? `${currentVenue.price} ${t('booking.currency')}` : `0 ${t('booking.currency')}`;
  };

  // Get working hours
  const getWorkingHours = () => {
    const todaySchedule = getTodaySchedule(currentVenue.working_hours);
    if (!todaySchedule) return "24/7";
    if (todaySchedule.closed) return t('common.closedToday');
    return `${todaySchedule.open} - ${todaySchedule.close}`;
  };

  // Check if venue is currently closed (for mobile styling) - not bookable due to time constraints
  const isCurrentlyClosed = !isVenueBookableNow(currentVenue.working_hours);

  // Prepare service chip labels
  const chipLabels: string[] = services && services.length > 0
    ? services.map(service => translateService({
        name: service.services?.name || 'Gaming',
        name_en: service.services?.name_en,
        name_ka: service.services?.name_ka
      }))
    : ['Gaming'];

  // Simplified chip rendering: show up to 2 chips + counter
  const MAX_VISIBLE_CHIPS = 2;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-6 left-4 right-4 z-30"
    >
      <motion.div
        className={`bg-card rounded-2xl shadow-xl overflow-hidden border border-border/60 ${
          isCurrentlyClosed ? 'opacity-80' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        animate={{ 
          scale: isTransitioning ? 0.98 : 1,
          boxShadow: isTransitioning 
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
            : "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link to={`/venue/${currentVenue.id}`} className="block">
          <AnimatePresence mode="wait">
            <motion.div
              key={`venue-${currentVenue.id}`}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex p-3"
            >
              {/* Venue Image */}
              <motion.div 
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-3"
                animate={{ 
                  scale: isTransitioning ? 0.95 : 1,
                  borderRadius: isTransitioning ? "8px" : "12px"
                }}
                transition={{ duration: 0.3 }}
              >
                <motion.img
                  key={`img-${currentVenue.id}`}
                  src={venueImage}
                  alt={currentVenue.name}
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.div>
              
              {/* Venue Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0 pr-2 flex flex-col gap-1.5">
                    {/* Row 1: Name + Rating */}
                    <motion.div 
                      key={`name-rating-${currentVenue.id}`}
                      className="flex items-center justify-between"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <h3 className="font-semibold text-card-foreground text-[15px] leading-tight truncate">
                        {currentVenue.name}
                      </h3>
                      <span className="ml-3 shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                          isCurrentlyClosed ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          <Star className="w-3 h-3 fill-current mr-1" />
                          <span className="text-[11px] font-semibold">{currentVenue.rating || '0'}</span>
                        </span>
                      </span>
                    </motion.div>

                    {/* Row 2: Meta (price and distance) */}
                    <motion.div 
                      key={`meta-${currentVenue.id}`}
                      className="flex items-center gap-1.5 text-muted-foreground"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      <span className="text-[13px] font-semibold text-foreground">
                        {getPriceInfo()}/{t('common.hourShort')}
                      </span>
                      {distanceText && (
                        <span className="text-[11px]">{distanceText} {t('common.away')}</span>
                      )}
                    </motion.div>

                    {/* Row 3: Compact chips (max 2) */}
                    <motion.div 
                      key={`chips-${currentVenue.id}`}
                      className="flex items-center gap-1.5 overflow-hidden"
                      ref={chipsContainerRef}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      {chipLabels.slice(0, MAX_VISIBLE_CHIPS).map((label, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            isCurrentlyClosed ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                      {chipLabels.length > MAX_VISIBLE_CHIPS && (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full whitespace-nowrap">
                          +{chipLabels.length - MAX_VISIBLE_CHIPS}
                        </span>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Rating and Book Now (right column) removed */}
                  </div>
                </div>
            </motion.div>
          </AnimatePresence>
          {/* Divider */}
          <div className="px-3">
            <div className="h-px bg-border/60" />
          </div>

          {/* Swipe Indicator */}
          {venues.length > 1 && (
            <div className="flex justify-center pt-2 pb-3">
              <div className="flex space-x-1">
                {venues.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      index === currentVenueIndex 
                        ? (isCurrentlyClosed ? 'max-lg:bg-gray-400' : 'bg-blue-600')
                        : 'bg-gray-300'
                    }`}
                    animate={{ 
                      scale: index === currentVenueIndex ? 1.3 : 1,
                      backgroundColor: index === currentVenueIndex 
                        ? (isCurrentlyClosed ? '#9ca3af' : '#2563eb')
                        : '#d1d5db'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Book Now Button */}
          <div className="px-3 pb-3 pt-1">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsBookingDialogOpen(true);
              }}
              size="sm"
              className="w-full text-[13px] py-2 h-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors"
            >
              {t('common.bookNow')}
            </Button>
          </div>
        </Link>
      </motion.div>
      
      {/* Booking Dialog */}
      <VenueCardBookingDialog
        venue={currentVenue}
        services={services}
        isOpen={isBookingDialogOpen}
        onClose={() => setIsBookingDialogOpen(false)}
        onBookingSuccess={() => setIsBookingDialogOpen(false)}
      />
    </motion.div>
  );
};

export default MobileVenueCard;