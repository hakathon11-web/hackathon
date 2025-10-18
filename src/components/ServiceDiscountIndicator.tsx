import DiscountBadgeList from "./DiscountBadgeList";
import { VenueService } from "@/hooks/useVenues";

interface ServiceDiscountIndicatorProps {
  service: VenueService;
  className?: string;
  venueDiscounts?: {
    overall_discount_percent?: number;
    overall_discount_service_ids?: string[];
    free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
    group_discounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
    timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  };
}

const ServiceDiscountIndicator = ({ service, className = "", venueDiscounts }: ServiceDiscountIndicatorProps) => {
  return (
    <DiscountBadgeList
      discountData={{
        // Service-level discounts
        overallDiscountPercent: service.overall_discount_percent,
        groupDiscounts: service.group_discounts,
        timeslotDiscounts: service.timeslot_discounts,
        freeHourDiscounts: service.free_hour_discounts,
        // Venue-level discounts (filtered by service ID)
        ...(venueDiscounts && {
          venueOverallDiscountPercent: venueDiscounts.overall_discount_percent,
          venueOverallDiscountServiceIds: venueDiscounts.overall_discount_service_ids,
          venueGroupDiscounts: venueDiscounts.group_discounts,
          venueTimeslotDiscounts: venueDiscounts.timeslot_discounts,
          venueFreeHourDiscounts: venueDiscounts.free_hour_discounts
        })
      }}
      serviceId={service.id}
      className={className}
      size="sm"
      maxBadges={4}
    />
  );
};

export default ServiceDiscountIndicator;