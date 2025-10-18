import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Percent, Tag, Clock, Zap } from "lucide-react";
import { VenueService } from "@/hooks/useVenues";


interface ServiceDiscountBannerProps {
  services: VenueService[];
  selectedService?: VenueService;
  className?: string;
}

const ServiceDiscountBanner = ({ 
  services, 
  selectedService,
  className = "" 
}: ServiceDiscountBannerProps) => {
  // Determine whether a service actually has any discount configured
  const hasServiceDiscount = (service: VenueService): boolean => {
    const hasOverall = !!service.overall_discount_percent && service.overall_discount_percent > 0;
    const hasGroup = Array.isArray(service.group_discounts)
      && service.group_discounts.some(d => (d?.discountPercent || 0) > 0);
    const hasTimeslot = Array.isArray(service.timeslot_discounts)
      && service.timeslot_discounts.some(d => (d?.discountPercent || 0) > 0);
    const hasFreeHours = Array.isArray(service.free_hour_discounts)
      && service.free_hour_discounts.some(d => (d?.freeHours || 0) > 0);
    return hasOverall || hasGroup || hasTimeslot || hasFreeHours;
  };

  const servicesWithDiscounts = (services || []).filter(hasServiceDiscount);

  // If no services or no services with real discounts, don't show banner
  if (!services || services.length === 0 || servicesWithDiscounts.length === 0) {
    return null;
  }

  const hasActiveDiscounts = servicesWithDiscounts.length > 0;
  if (!hasActiveDiscounts) return null;

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              <Tag className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Special Offers Available</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {servicesWithDiscounts.slice(0, 3).map((service) => {
              // Show a concise label for the strongest discount type
              const labels: string[] = [];
              if (service.overall_discount_percent && service.overall_discount_percent > 0) {
                labels.push(`${service.overall_discount_percent}% off`);
              }
              if (Array.isArray(service.group_discounts) && service.group_discounts.length > 0) {
                const maxGroup = Math.max(...service.group_discounts.map(d => d.discountPercent || 0));
                if (maxGroup > 0) labels.push(`Up to ${maxGroup}% group`);
              }
              if (Array.isArray(service.timeslot_discounts) && service.timeslot_discounts.length > 0) {
                const maxSlot = Math.max(...service.timeslot_discounts.map(d => d.discountPercent || 0));
                if (maxSlot > 0) labels.push(`${maxSlot}% timeslot`);
              }
              if (Array.isArray(service.free_hour_discounts) && service.free_hour_discounts.length > 0) {
                const maxFree = Math.max(...service.free_hour_discounts.map(d => d.freeHours || 0));
                if (maxFree > 0) labels.push(`${maxFree} free hour${maxFree > 1 ? 's' : ''}`);
              }

              const label = labels[0] || 'Special offer';

              return (
                <Badge 
                  key={service.id} 
                  variant="secondary" 
                  className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Percent className="h-3 w-3 mr-1" />
                  {service.name} · {label}
                </Badge>
              );
            })}

            {servicesWithDiscounts.length > 3 && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                +{servicesWithDiscounts.length - 3} more
              </Badge>
            )}
          </div>
          
          {selectedService && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Selected: {selectedService.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceDiscountBanner;