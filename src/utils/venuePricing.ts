import { Venue, useVenueServices } from '@/hooks/useVenues';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';

/**
 * Custom hook to get venue price with proper pricing logic
 * This handles the case where venue services data is available
 */
export const useVenuePrice = (venueId: string, t?: any) => {
  const { data: services } = useVenueServices(venueId);

  const getPrice = () => {
    if (services && services.length > 0) {
      const prices = services.map(service => {
        const displayPrice = getServicePricingSummary(service, t);
        return extractNumericPrice(displayPrice) || service.price;
      });
      return Math.min(...prices);
    }
    return null; // No services data available
  };

  return { price: getPrice(), services };
};

/**
 * Fallback function to get venue price when services data is not available
 * This is used in map components that don't have access to venue services
 */
export const getVenuePriceFallback = (venue: Venue): number => {
  // If venue has a valid price, use it
  if (typeof venue.price === 'number' && venue.price > 0) {
    return venue.price;
  }
  
  // Fallback to 25 if no price is available
  return 25;
};

export interface VenueDiscountInfo {
  hasDiscount: boolean;
  bestDiscount: {
    type: 'overall' | 'group' | 'timeslot' | 'freeHours';
    value: number;
    label: string;
    description: string;
  } | null;
  discountCount: number;
}

export const getVenueDiscountInfo = (services: VenueService[]): VenueDiscountInfo => {
  if (!services || services.length === 0) {
    return {
      hasDiscount: false,
      bestDiscount: null,
      discountCount: 0
    };
  }

  const allDiscounts: Array<{
    type: 'overall' | 'group' | 'timeslot' | 'freeHours';
    value: number;
    label: string;
    description: string;
    serviceName: string;
  }> = [];

  services.forEach(service => {
    // Check overall discount
    if (service.overall_discount_percent && service.overall_discount_percent > 0) {
      allDiscounts.push({
        type: 'overall',
        value: service.overall_discount_percent,
        label: `${service.overall_discount_percent}% off`,
        description: `${service.overall_discount_percent}% discount on all bookings`,
        serviceName: service.service_type
      });
    }

    // Check group discounts
    if (service.group_discounts && Array.isArray(service.group_discounts) && service.group_discounts.length > 0) {
      const maxGroupDiscount = Math.max(...service.group_discounts.map(d => d.discountPercent || 0));
      const minGuests = Math.min(...service.group_discounts.map(d => d.minGuests || 0));
      
      if (maxGroupDiscount > 0) {
        allDiscounts.push({
          type: 'group',
          value: maxGroupDiscount,
          label: `Up to ${maxGroupDiscount}% off`,
          description: `Group discounts starting from ${minGuests} guests`,
          serviceName: service.service_type
        });
      }
    }

    // Check timeslot discounts
    if (service.timeslot_discounts && Array.isArray(service.timeslot_discounts) && service.timeslot_discounts.length > 0) {
      const maxTimeslotDiscount = Math.max(...service.timeslot_discounts.map(d => d.discountPercent || 0));
      
      if (maxTimeslotDiscount > 0) {
        allDiscounts.push({
          type: 'timeslot',
          value: maxTimeslotDiscount,
          label: `${maxTimeslotDiscount}% off`,
          description: 'Time-based discounts available',
          serviceName: service.service_type
        });
      }
    }

    // Check free hour discounts
    if (service.free_hour_discounts && Array.isArray(service.free_hour_discounts) && service.free_hour_discounts.length > 0) {
      const maxFreeHours = Math.max(...service.free_hour_discounts.map(d => d.freeHours || 0));
      
      if (maxFreeHours > 0) {
        allDiscounts.push({
          type: 'freeHours',
          value: maxFreeHours,
          label: `${maxFreeHours} free hour${maxFreeHours > 1 ? 's' : ''}`,
          description: 'Free hours with extended bookings',
          serviceName: service.service_type
        });
      }
    }
  });

  if (allDiscounts.length === 0) {
    return {
      hasDiscount: false,
      bestDiscount: null,
      discountCount: 0
    };
  }

  // Find the best discount (highest value)
  const bestDiscount = allDiscounts.reduce((best, current) => {
    // Prioritize percentage discounts over free hours for display
    if (current.type === 'freeHours' && best.type !== 'freeHours') {
      return best;
    }
    if (best.type === 'freeHours' && current.type !== 'freeHours') {
      return current;
    }
    return current.value > best.value ? current : best;
  });

  return {
    hasDiscount: true,
    bestDiscount: {
      type: bestDiscount.type,
      value: bestDiscount.value,
      label: bestDiscount.label,
      description: bestDiscount.description
    },
    discountCount: allDiscounts.length
  };
};
