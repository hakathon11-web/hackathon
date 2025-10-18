import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, Star, MapPin, Clock, ArrowRight, Percent, Users, Gift } from 'lucide-react';
import { Venue, useVenueServices } from '@/hooks/useVenues';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { getVenueDiscountInfo } from '@/utils/venuePricing';
import { formatWorkingHours, getTodaySchedule, getTodayScheduleDisplay, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AirbnbMapPopupProps {
  venue: Venue;
  onClose: () => void;
  embedded?: boolean; // when true, render without absolute positioning for InfoWindow
}

const AirbnbMapPopup = ({ venue, onClose, embedded = false }: AirbnbMapPopupProps) => {
  const { t, i18n } = useTranslation();
  const { data: services } = useVenueServices(venue.id);
  const { translateService } = useServiceTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isOpen = isVenueBookableNow(venue.working_hours);
  
  console.log('AirbnbMapPopup: Rendering popup for venue:', venue.name);
  console.log('AirbnbMapPopup: Services data:', services);
  console.log('AirbnbMapPopup: Venue working hours:', venue.working_hours);
  console.log('AirbnbMapPopup: Is venue open?', isOpen);
  
  // Helper function to determine max services to display
  const getMaxServicesToDisplay = () => {
    if (!services || services.length === 0) return 0;
    
    // Always show only 1 service in map popups for better spacing
    return 1;
  };
  
  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);
  
  // Get discount icon based on type
  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'overall':
        return Percent;
      case 'group':
        return Users;
      case 'timeslot':
        return Clock;
      case 'freeHours':
        return Gift;
      default:
        return Percent;
    }
  };
  
  // Get venue images
  const venueImages = venue.images && venue.images.length > 0 
    ? venue.images 
    : ["https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800"];
  
  // Reset image index when venue changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsTransitioning(false);
  }, [venue.id]);
  
  // Debounced image change to prevent rapid transitions
  const changeImageIndex = useCallback((newIndex: number) => {
    if (isTransitioning || newIndex === currentImageIndex) return;
    
    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);
    
    // Reset transition state after animation completes
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentImageIndex, isTransitioning]);
  
  const handlePrevious = useCallback(() => {
    const newIndex = currentImageIndex === 0 ? venueImages.length - 1 : currentImageIndex - 1;
    changeImageIndex(newIndex);
  }, [currentImageIndex, venueImages.length, changeImageIndex]);
  
  const handleNext = useCallback(() => {
    const newIndex = currentImageIndex === venueImages.length - 1 ? 0 : currentImageIndex + 1;
    changeImageIndex(newIndex);
  }, [currentImageIndex, venueImages.length, changeImageIndex]);

  return (
    <div className={`${embedded ? '' : 'absolute z-50 '}bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden border border-gray-200 ${
      !isOpen ? 'max-lg:opacity-60 max-lg:grayscale' : ''
    }`} style={{ minHeight: '320px' }}>
      {/* Image Section */}
      <div className="relative">
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={venueImages[currentImageIndex]}
            alt={`${venue.name} - Image ${currentImageIndex + 1}`}
            className={`w-full h-full object-cover transition-all duration-300 ${
              !isOpen ? 'max-lg:grayscale max-lg:brightness-75' : ''
            } ${isTransitioning ? 'opacity-90' : 'opacity-100'}`}
            style={{
              transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800";
            }}
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Star Rating Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <div className={`rounded-full px-2 py-1 flex items-center gap-1 shadow-lg backdrop-blur-sm ${
              !isOpen 
                ? 'max-lg:bg-gray-400 max-lg:text-white' 
                : 'bg-blue-600 text-white'
            }`}>
              <Star className="h-2.5 w-2.5 fill-current" />
              <span className="text-xs font-semibold">{venue.rating}</span>
            </div>
          </div>
          
          {/* Discount Badge - Top Left (below rating) */}
          {discountInfo.hasDiscount && (
            <div className="absolute top-10 left-3">
              <div className="bg-green-600 text-white rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-lg backdrop-blur-sm">
                {React.createElement(getDiscountIcon(discountInfo.bestDiscount?.type || 'overall'), { 
                  className: "h-2 w-2" 
                })}
                <span className="text-[10px] font-semibold">
                  {discountInfo.bestDiscount?.label}
                </span>
              </div>
            </div>
          )}
          
          
          {/* Carousel Navigation */}
          {venueImages.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                disabled={isTransitioning}
                className={`absolute top-1/2 -translate-y-1/2 left-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center w-4 h-4 ${
                  isTransitioning ? 'cursor-not-allowed opacity-50' : ''
                }`}
                style={{ minWidth: '16px', minHeight: '16px' }}
              >
                <ChevronLeft className="w-1.5 h-1.5" />
              </button>
              <button
                onClick={handleNext}
                disabled={isTransitioning}
                className={`absolute top-1/2 -translate-y-1/2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center w-4 h-4 ${
                  isTransitioning ? 'cursor-not-allowed opacity-50' : ''
                }`}
                style={{ minWidth: '16px', minHeight: '16px' }}
              >
                <ChevronRight className="w-1.5 h-1.5" />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          {venueImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
              {venueImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => changeImageIndex(index)}
                  disabled={isTransitioning}
                  className={`rounded-full transition-all duration-200 ${
                    index === currentImageIndex
                      ? 'bg-white w-2 h-2 shadow-lg'
                      : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'
                  } ${isTransitioning ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
              ))}
            </div>
          )}
          
          {/* Price Overlay - Bottom Right */}
          <div className="absolute bottom-2 right-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-1 shadow-md">
              <div className="flex items-baseline gap-0.5">
                <span className={`text-xs font-semibold ${
                  !isOpen 
                    ? 'max-lg:text-gray-500' 
                    : 'text-blue-600'
                }`}>
                  {services && services.length > 0 
                    ? (() => {
                        const prices = services.map(service => {
                          const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'));
                          return extractNumericPrice(displayPrice) || service.price;
                        });
                        return `${Math.min(...prices)} ${t('booking.currency')}`;
                      })()
                    : `${venue.price} ${t('booking.currency')}`}
                </span>
                <span className="text-[10px] text-gray-500">/{t('common.hourShort')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2.5">
        {/* Venue Name */}
        <h3 className="font-bold text-gray-900 leading-tight text-sm line-clamp-1 truncate mb-2">
          {venue.name}
        </h3>
        
        {/* Location Row */}
        <div className="flex items-center text-gray-600 mb-2">
          <div className="flex items-center flex-1 min-w-0">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0 text-gray-400" />
            <span className="text-xs text-gray-600 line-clamp-1 truncate">{venue.location}</span>
          </div>
        </div>
        
        {/* Service Tags and Availability Time Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-3">
            {services && services.length > 0 ? (
              services.slice(0, getMaxServicesToDisplay()).map((service) => (
                <div 
                  key={service.id} 
                  className="text-[9px] px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium flex-shrink-0 whitespace-nowrap inline-flex items-center"
                  style={{ lineHeight: '1.2' }}
                >
                  {translateService({
                    name: service.services?.name || service.name || 'Unknown Service',
                    name_en: service.services?.name_en,
                    name_ka: service.services?.name_ka
                  })}
                </div>
              ))
            ) : (
              <div 
                className="text-[9px] px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium flex-shrink-0 whitespace-nowrap inline-flex items-center"
                style={{ lineHeight: '1.2' }}
              >
                Gaming
              </div>
            )}
            {services && services.length > getMaxServicesToDisplay() && (
              <div className="text-[9px] px-1.5 py-1 bg-gray-100 text-gray-700 rounded-md flex-shrink-0 inline-flex items-center">
                +{services.length - getMaxServicesToDisplay()}
              </div>
            )}
          </div>
          <div className="flex items-center text-gray-500 flex-shrink-0">
            <Clock className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
            <span className="text-[10px] font-medium text-gray-600">
              {(() => {
                const todaySchedule = getTodaySchedule(venue.working_hours);
                if (!todaySchedule) return "24/7";
                if (todaySchedule.closed) return t('common.closedToday');
                return `${todaySchedule.open} - ${todaySchedule.close}`;
              })()}
            </span>
          </div>
        </div>

        {/* View Details Button */}
        <Button
          onClick={() => {
            // Navigate to venue page
            window.location.href = `/venue/${venue.id}`;
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-sm mt-2 flex items-center justify-center gap-2"
        >
          {t('common.viewDetails')}
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default AirbnbMapPopup; 