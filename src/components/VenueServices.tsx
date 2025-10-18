
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, DollarSign } from "lucide-react";
import { VenueService } from "@/hooks/useVenues";
import { getServicePricingSummary, getServiceDetailedPricing } from "@/utils/guestPricing";
import { useTranslation } from "react-i18next";
import { useServicePrimaryImage } from "@/hooks/useServiceImages";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import DiscountBadgeList from "./DiscountBadgeList";

interface VenueServicesProps {
  services: VenueService[];
  onServiceSelect: (service: VenueService) => void;
  selectedService?: VenueService;
  venueDiscounts?: {
    overall_discount_percent?: number;
    overall_discount_service_ids?: string[];
    free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
    group_discounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
    timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  };
}

const ServiceImage = ({ serviceId, serviceName }: { serviceId: string; serviceName: string }) => {
  const { data: primaryImage } = useServicePrimaryImage(serviceId);
  
  if (!primaryImage) {
    return null;
  }

  return (
    <div className="w-24 h-24 flex-shrink-0">
      <img
        src={primaryImage.image_url}
        alt={primaryImage.alt_text || serviceName}
        className="w-full h-full object-cover rounded-l-lg"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
};

const VenueServices = ({ 
  services, 
  onServiceSelect, 
  selectedService,
  venueDiscounts
}: VenueServicesProps) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Available Services</h3>
      <div className="grid gap-4">
        {services.map((service) => (
          <Card 
            key={service.id}
            className={`cursor-pointer transition-all border-white/10 bg-card/50 hover:bg-card/70 ${
              selectedService?.id === service.id 
                ? 'ring-2 ring-primary border-primary/50' 
                : ''
            }`}
            onClick={() => onServiceSelect(service)}
          >
            <div className="flex gap-4">
              {/* Service Image */}
              <ServiceImage 
                serviceId={service.service_id} 
                serviceName={service.services?.name || 'Service'} 
              />
              
              <div className="flex-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {translateService({
                          name: service.services?.name || 'Unknown Service',
                          name_en: service.services?.name_en,
                          name_ka: service.services?.name_ka
                        })}
                      </CardTitle>
                      {/* Service-level and venue-level discount badges */}
                      <div className="mt-2">
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
                          size="sm"
                          maxBadges={4}
                        />
                      </div>
                    </div>
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <Badge variant="secondary" className="bg-primary/10 text-primary cursor-help">
                             {getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'))}
                           </Badge>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>{getServiceDetailedPricing(service, i18n.language as 'en' | 'ka')}</p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </div>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">
                          {translateService({
                            name: service.services?.name || 'Unknown',
                            name_en: service.services?.name_en,
                            name_ka: service.services?.name_ka
                          })}
                        </span>
                      </div>
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <div className="flex items-center gap-1 cursor-help">
                               <DollarSign className="h-4 w-4" />
                               {getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'))}
                             </div>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>{getServiceDetailedPricing(service, i18n.language as 'en' | 'ka')}</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                    </div>
                  <Button 
                    variant={selectedService?.id === service.id ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {selectedService?.id === service.id ? "Selected" : "Select Service"}
                  </Button>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VenueServices;
