import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PRICING_MODELS, isPerTableService, isGuestWiseService } from "@/constants/services";

interface PricingMethodSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const PricingMethodSelector = ({ 
  value, 
  onValueChange, 
  className = "" 
}: PricingMethodSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{t('addVenue.pricingMethod')}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('addVenue.selectPricingMethod')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PRICING_MODELS.GUEST_WISE}>
            <div className="flex items-center gap-2">
              <span>{t('addVenue.guestWisePricing')}</span>
              <Badge variant="secondary" className="text-xs">
                {t('pricing.guestWise')}
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value={PRICING_MODELS.TABLE_WISE}>
            <div className="flex items-center gap-2">
              <span>{t('addVenue.tableWisePricing')}</span>
              <Badge variant="secondary" className="text-xs">
                {t('pricing.tableWise')}
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        {t('addVenue.pricingMethodDescription')}
      </p>
      
      {/* Show description based on selected method */}
      {isGuestWiseService(value) && (
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('addVenue.guestWisePricingDescription')}
          </p>
        </div>
      )}
      
      {isPerTableService(value) && (
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            {t('addVenue.tableWisePricingDescription')}
          </p>
        </div>
      )}
    </div>
  );
};