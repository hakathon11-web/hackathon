import { useTranslation } from "react-i18next";
import { X, Star, ChevronRight, Heart, Percent, Users, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Venue, useVenueServices } from "@/hooks/useVenues";
import { getServicePricingSummary, extractNumericPrice } from "@/utils/guestPricing";
import { getVenueDiscountInfo } from "@/utils/venuePricing";
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from "@/utils/workingHours";
import { Link } from "react-router-dom";
import React from "react";

interface VenueMapPopupProps {
  venue: Venue;
  onClose: () => void;
}

const VenueMapPopup = ({ venue, onClose }: VenueMapPopupProps) => {
  const { t } = useTranslation();
  const { data: services } = useVenueServices(venue.id);

  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);
  
  // Check if venue is currently closed (not bookable due to time constraints)
  const isClosedToday = !isVenueBookableNow(venue.working_hours);
  
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

  const getMinPrice = () => {
    if (services && services.length > 0) {
      const prices = services.map(service => {
        const displayPrice = getServicePricingSummary(service, t);
        return extractNumericPrice(displayPrice) || service.price;
      });
      return Math.min(...prices);
    }
    return null;
  };

  return (
    <Card className={`w-80 bg-card shadow-xl rounded-xl overflow-hidden border border-border ${
      isClosedToday ? 'opacity-60 grayscale' : ''
    }`}>
      {/* Header with image */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-background/90 hover:bg-background rounded-full p-0.5 h-8 w-8 shadow-sm"
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={venue.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400"}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          
          {/* Heart button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 left-3 bg-background/90 hover:bg-background rounded-full p-0.5 h-8 w-8 shadow-sm"
          >
            <Heart className="h-4 w-4" />
          </Button>
          
          {/* Discount Badge - Top Right (if has discount) */}
          {discountInfo.hasDiscount && (
            <div className="absolute top-3 right-12">
              <div className="bg-green-600 text-white rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-lg backdrop-blur-sm">
                {React.createElement(getDiscountIcon(discountInfo.bestDiscount?.type || 'overall'), { 
                  className: "h-2.5 w-2.5" 
                })}
                <span className="text-[10px] font-semibold">
                  {discountInfo.bestDiscount?.label}
                </span>
              </div>
            </div>
          )}
          
          {/* Image dots if multiple images */}
          {venue.images && venue.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5">
              {Array.from({ length: Math.min(venue.images.length, 5) }, (_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full border ${
                    i === 0 
                      ? 'bg-background border-background' 
                      : 'bg-background/60 border-background/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title and Rating */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base text-card-foreground line-clamp-2 flex-1 mr-3">
            {venue.name}
          </h3>
          {venue.rating && (
            <div className="flex items-center gap-1 text-xs flex-shrink-0">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-card-foreground">{venue.rating}</span>
              {venue.review_count && (
                <span className="text-muted-foreground">({venue.review_count})</span>
              )}
            </div>
          )}
        </div>
        
        {/* Location */}
        <p className="text-muted-foreground text-sm mb-2 line-clamp-1 truncate">
          📍 {venue.location}
        </p>
        

        

        
        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <span className="font-bold text-card-foreground text-base">
              {getMinPrice() ? `${getMinPrice()} GEL` : 'Contact'}
            </span>
            <span className="text-muted-foreground text-xs">
              {getMinPrice() ? '/hour' : ''}
            </span>
          </div>
        </div>
        
        {/* View Details button */}
        <Link to={`/venue/${venue.id}`} className="block">
          <Button 
            size="sm" 
            className={`w-full h-10 text-sm font-semibold rounded-lg ${
              isClosedToday 
                ? 'bg-gray-400 hover:bg-gray-500 text-white cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-black text-white'
            }`}
            disabled={isClosedToday}
          >
            {isClosedToday ? t('common.closedToday') : t('common.viewDetails')}
            {!isClosedToday && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default VenueMapPopup;