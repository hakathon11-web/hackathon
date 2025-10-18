import DiscountBadgeList from "./DiscountBadgeList";

interface VenueDiscountData {
  overall_discount_percent?: number;
  overall_discount_service_ids?: string[];
  free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  group_discounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
  timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
}

interface VenueDiscountIndicatorProps {
  venueDiscounts: VenueDiscountData;
  serviceId?: string;
  className?: string;
}

const VenueDiscountIndicator = ({ venueDiscounts, serviceId, className = "" }: VenueDiscountIndicatorProps) => {
  // Convert venue discount data to the format expected by DiscountBadgeList
  const discountData = {
    overallDiscountPercent: venueDiscounts.overall_discount_percent,
    groupDiscounts: venueDiscounts.group_discounts,
    timeslotDiscounts: venueDiscounts.timeslot_discounts,
    freeHourDiscounts: venueDiscounts.free_hour_discounts
  };

  return (
    <DiscountBadgeList
      discountData={discountData}
      serviceId={serviceId}
      className={className}
      size="sm"
      maxBadges={4}
    />
  );
};

export default VenueDiscountIndicator;

