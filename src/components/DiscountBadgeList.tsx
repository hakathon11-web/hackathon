import React from 'react';
import DiscountBadge, { DiscountType } from './DiscountBadge';

interface DiscountData {
  overallDiscountPercent?: number;
  groupDiscounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
  timeslotDiscounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  freeHourDiscounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  // Venue-level discounts
  venueOverallDiscountPercent?: number;
  venueOverallDiscountServiceIds?: string[];
  venueGroupDiscounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
  venueTimeslotDiscounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  venueFreeHourDiscounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
}

interface DiscountBadgeListProps {
  discountData: DiscountData;
  serviceId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  maxBadges?: number;
}

const DiscountBadgeList: React.FC<DiscountBadgeListProps> = ({
  discountData,
  serviceId,
  className = '',
  size = 'sm',
  maxBadges = 4
}) => {
  const badges: Array<{ type: DiscountType; value?: string; priority: number }> = [];

  // Overall discount (service-level or venue-level)
  let overallDiscount = discountData.overallDiscountPercent || 0;
  
  // Check venue-level overall discount
  if (discountData.venueOverallDiscountPercent && discountData.venueOverallDiscountPercent > 0) {
    const venueOverallDiscountApplies = !discountData.venueOverallDiscountServiceIds || 
      discountData.venueOverallDiscountServiceIds.length === 0 || 
      (serviceId && discountData.venueOverallDiscountServiceIds.includes(serviceId));
    
    if (venueOverallDiscountApplies && discountData.venueOverallDiscountPercent > overallDiscount) {
      overallDiscount = discountData.venueOverallDiscountPercent;
    }
  }
  
  if (overallDiscount > 0) {
    badges.push({
      type: 'overall',
      value: `${overallDiscount}`,
      priority: 1
    });
  }

  // Group discounts (service-level and venue-level)
  let allGroupDiscounts = [...(discountData.groupDiscounts || [])];
  
  if (discountData.venueGroupDiscounts && discountData.venueGroupDiscounts.length > 0) {
    const applicableVenueGroupDiscounts = discountData.venueGroupDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    allGroupDiscounts = [...allGroupDiscounts, ...applicableVenueGroupDiscounts];
  }
  
  if (allGroupDiscounts.length > 0) {
    const applicableGroupDiscounts = allGroupDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    
    if (applicableGroupDiscounts.length > 0) {
      const minGuests = Math.min(...applicableGroupDiscounts.map(d => d.minGuests));
      badges.push({
        type: 'group',
        value: `${minGuests}+`,
        priority: 2
      });
    }
  }

  // Timeslot discounts (service-level and venue-level)
  let allTimeslotDiscounts = [...(discountData.timeslotDiscounts || [])];
  
  if (discountData.venueTimeslotDiscounts && discountData.venueTimeslotDiscounts.length > 0) {
    const applicableVenueTimeslotDiscounts = discountData.venueTimeslotDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    allTimeslotDiscounts = [...allTimeslotDiscounts, ...applicableVenueTimeslotDiscounts];
  }
  
  if (allTimeslotDiscounts.length > 0) {
    const applicableTimeslotDiscounts = allTimeslotDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    
    if (applicableTimeslotDiscounts.length > 0) {
      const maxDiscount = Math.max(...applicableTimeslotDiscounts.map(d => d.discountPercent));
      badges.push({
        type: 'timeslot',
        value: `${maxDiscount}% off`,
        priority: 3
      });
    }
  }

  // Free hour discounts (service-level and venue-level)
  let allFreeHourDiscounts = [...(discountData.freeHourDiscounts || [])];
  
  if (discountData.venueFreeHourDiscounts && discountData.venueFreeHourDiscounts.length > 0) {
    const applicableVenueFreeHourDiscounts = discountData.venueFreeHourDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    allFreeHourDiscounts = [...allFreeHourDiscounts, ...applicableVenueFreeHourDiscounts];
  }
  
  if (allFreeHourDiscounts.length > 0) {
    const applicableFreeHourDiscounts = allFreeHourDiscounts.filter(discount => 
      !serviceId || !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
    );
    
    if (applicableFreeHourDiscounts.length > 0) {
      const bestOffer = applicableFreeHourDiscounts.reduce((best, current) => 
        (current.freeHours / current.thresholdHours) > (best.freeHours / best.thresholdHours) ? current : best
      );
      badges.push({
        type: 'free_hour',
        value: `${bestOffer.thresholdHours}h → ${bestOffer.freeHours}h free`,
        priority: 4
      });
    }
  }

  // Sort by priority and limit number of badges
  const sortedBadges = badges
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxBadges);


  if (sortedBadges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-1 items-end pr-1 ${className}`}>
      {sortedBadges.map((badge, index) => (
        <DiscountBadge
          key={`${badge.type}-${index}`}
          type={badge.type}
          value={badge.value}
          size={size}
        />
      ))}
    </div>
  );
};

export default DiscountBadgeList;
