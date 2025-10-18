import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, X, Clock, Percent, Users, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Venue, useVenueServices } from '@/hooks/useVenues';
import { useTranslation } from 'react-i18next';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';
import { getVenueDiscountInfo } from '@/utils/venuePricing';
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { Button } from '@/components/ui/button';
import VenueCardBookingDialog from '@/components/VenueCardBookingDialog';

interface DesktopVenueCardProps {
  venue: Venue | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onClose?: () => void;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
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

// Generate stable coordinates for venues (same logic as in MobileVenueCard)
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

const DesktopVenueCard: React.FC<DesktopVenueCardProps> = ({
  venue,
  userLocation,
  onClose,
  position = 'bottom-left'
}) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { data: services } = useVenueServices(venue?.id || '');

  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);

  // Handle venue changes with transition effect
  useEffect(() => {
    if (venue) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [venue]);

  if (!venue) {
    return null;
  }

  // Calculate distance if user location is available
  const getDistanceText = () => {
    if (!userLocation) return null;
    
    const venueCoords = getVenueCoordinates(venue);
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

  // Get venue image
  const venueImage = venue.images && venue.images.length > 0 
    ? venue.images[0] 
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
    return venue.price > 0 ? `${venue.price} ${t('booking.currency')}` : `0 ${t('booking.currency')}`;
  };

  // Get working hours
  const getWorkingHours = () => {
    const todaySchedule = getTodaySchedule(venue.working_hours);
    if (!todaySchedule) return "24/7";
    if (todaySchedule.closed) return t('common.closedToday');
    return `${todaySchedule.open} - ${todaySchedule.close}`;
  };

  // Check if venue is currently closed (not bookable due to time constraints)
  const isCurrentlyClosed = !isVenueBookableNow(venue.working_hours);

  // Position classes based on position prop
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'absolute bottom-6 left-6';
      case 'bottom-right':
        return 'absolute bottom-6 right-6';
      case 'top-left':
        return 'absolute top-6 left-6';
      case 'top-right':
        return 'absolute top-6 right-6';
      case 'center':
        return 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'absolute bottom-6 left-6';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: position.includes('bottom') ? 50 : -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: position.includes('bottom') ? 50 : -50, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`${getPositionClasses()} z-50 max-w-xs`}
      >
        <motion.div
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${
            isCurrentlyClosed ? 'opacity-60 grayscale' : ''
          }`}
          animate={{ 
            scale: isTransitioning ? 0.98 : 1,
            boxShadow: isTransitioning 
              ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
              : "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          
          <Link to={`/venue/${venue.id}`} className="block">
            <AnimatePresence mode="wait">
              <motion.div
                key={`venue-${venue.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {/* Venue Image */}
                <motion.div 
                  className="w-full h-32 relative overflow-hidden"
                  animate={{ 
                    scale: isTransitioning ? 0.95 : 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.img
                    key={`img-${venue.id}`}
                    src={venueImage}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  
                  {/* Rating Badge */}
                  <motion.div 
                    key={`rating-${venue.id}`}
                    className="absolute top-3 left-3 flex items-center bg-blue-600 text-white backdrop-blur-sm rounded-full px-2.5 py-1.5 shadow-lg"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.3, type: "spring", stiffness: 200 }}
                  >
                    <Star className="w-3.5 h-3.5 fill-current mr-1" />
                    <span className="text-xs font-semibold">
                      {venue.rating || '0'}
                    </span>
                  </motion.div>
                  
                  {/* Discount Badge */}
                  {discountInfo.hasDiscount && (
                    <motion.div 
                      key={`discount-badge-${venue.id}`}
                      className="absolute top-3 right-3 bg-green-600 text-white rounded-full px-2.5 py-1.5 shadow-lg"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <span className="text-xs font-semibold">
                        {discountInfo.bestDiscount?.label}
                      </span>
                    </motion.div>
                  )}
                  
                  {/* Price Badge */}
                  <div className="absolute bottom-2 right-2">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-md px-2 py-1">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {getPriceInfo()}/{t('common.hourShort')}
                      </span>
                    </div>
                  </div>
                </motion.div>
                
                {/* Venue Info */}
                <div className="p-4">
                  {/* Venue Name and Opening Hours - Horizontal */}
                  <motion.div 
                    key={`name-hours-${venue.id}`}
                    className="flex items-center justify-between mb-2"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight flex-1 min-w-0 mr-2 truncate">
                      {venue.name}
                    </h3>
                    <div className="flex items-center text-gray-600 dark:text-gray-400 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {getWorkingHours()}
                      </span>
                    </div>
                  </motion.div>
                  
                  {/* Location */}
                  <motion.div 
                    key={`location-${venue.id}`}
                    className="flex items-center text-gray-600 dark:text-gray-400 mb-2"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs truncate text-gray-600 dark:text-gray-400">
                      {venue.location}
                    </span>
                  </motion.div>
                  
                  {/* Distance Row */}
                  {distanceText && (
                    <motion.div 
                      key={`distance-text-${venue.id}`}
                      className="flex items-center mb-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {distanceText} • {t('common.away')}
                      </span>
                    </motion.div>
                  )}

                  {/* Services and Working Hours Row */}
                  <motion.div 
                    key={`services-book-${venue.id}`}
                    className="flex items-center justify-between mb-3"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.22, duration: 0.3 }}
                  >
                    <div className="flex items-center gap-1">
                      {services && services.length > 0 ? (
                        services.slice(0, 1).map((service) => (
                          <div 
                            key={service.id}
                            className="text-[9px] px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium flex-shrink-0 whitespace-nowrap"
                          >
                            {translateService({
                              name: service.services?.name || 'Gaming',
                              name_en: service.services?.name_en,
                              name_ka: service.services?.name_ka
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="text-[9px] px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium flex-shrink-0">
                          Gaming
                        </div>
                      )}
                      {services && services.length > 1 && (
                        <div className="text-[9px] px-1.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex-shrink-0">
                          +{services.length - 1}
                        </div>
                      )}
                    </div>
                    
                    {/* Book Now Button */}
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBookingDialogOpen(true);
                      }}
                      size="sm"
                      className="text-[9px] px-2 py-1 h-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full flex-shrink-0 whitespace-nowrap transition-colors"
                    >
                      {t('common.bookNow')}
                    </Button>
                  </motion.div>
                  
                  {/* View Details Button */}
                  <motion.div
                    key={`button-${venue.id}`}
                    className="pt-1"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <div className={`w-full font-medium py-2.5 px-3 rounded-lg transition-colors duration-200 text-center text-sm ${
                      isCurrentlyClosed 
                        ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white'
                    }`}>
                      {isCurrentlyClosed ? t('common.closedToday', 'Closed Today') : t('common.viewDetails', 'View Details')}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Link>
          
          {/* Booking Dialog */}
          <VenueCardBookingDialog
            venue={venue}
            services={services}
            isOpen={isBookingDialogOpen}
            onClose={() => setIsBookingDialogOpen(false)}
            onBookingSuccess={() => setIsBookingDialogOpen(false)}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DesktopVenueCard;