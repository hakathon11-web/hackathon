import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GuestPricingManager } from "@/components/GuestPricingManager";
import { isPerTableService } from "@/constants/services";
import { getTableLabel, getGuestLabel } from "@/utils/pricingLabels";

interface ServicePricingFormProps {
  service: {
    pricing_model: string;
    price: number | null;
    guest_pricing_rules: Array<{ maxGuests: number; price: number | null }>;
    table_label?: string;
    guest_label?: string;
    table_label_ka?: string;
    guest_label_ka?: string;
  };
  onServiceUpdate: (field: string, value: any) => void;
}

export const ServicePricingForm = ({ service, onServiceUpdate }: ServicePricingFormProps) => {
  const { t, i18n } = useTranslation();

  // Get current language
  const currentLanguage = i18n.language as 'en' | 'ka';

  // Get custom labels with fallbacks
  const tableLabel = getTableLabel(service, t('pricing.table'), currentLanguage);
  const guestLabel = getGuestLabel(service, t('pricing.guest'), currentLanguage);

  // Debug logging to see what pricing_model we're getting
  console.log('ServicePricingForm - service pricing_model:', service.pricing_model);
  console.log('ServicePricingForm - isPerTableService result:', isPerTableService(service.pricing_model));

  if (isPerTableService(service.pricing_model)) {
    // Table-wise pricing: show table price input
    return (
      <div className="space-y-2">
        <Label>{t('partner.editVenue.pricePerTable', { table: tableLabel })}</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={service.price ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onServiceUpdate('price', null);
            } else {
              const parsed = parseFloat(raw);
              onServiceUpdate('price', Number.isNaN(parsed) ? null : parsed);
            }
          }}
          className="w-40"
        />
      </div>
    );
  } else {
    // Guest-wise pricing: show guest pricing rules
    return (
      <div className="space-y-2">
        <GuestPricingManager
          rules={service.guest_pricing_rules}
          onRulesChange={(rules) => onServiceUpdate('guest_pricing_rules', rules)}
          guestLabel={guestLabel}
          tableLabel={tableLabel}
        />
      </div>
    );
  }
};