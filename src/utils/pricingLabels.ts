import { isPerTableService } from "@/constants/services";

/**
 * Interface for services with custom pricing labels
 */
export interface ServiceWithCustomLabels {
  table_label?: string;
  guest_label?: string;
  table_label_ka?: string;
  guest_label_ka?: string;
  pricing_model: string;
  services?: {
    table_label?: string;
    guest_label?: string;
    table_label_ka?: string;
    guest_label_ka?: string;
  };
}

/**
 * Get the appropriate label for table-wise pricing
 * @param service - Service object with custom labels
 * @param fallback - Fallback label if no custom label is set
 * @param language - Language code ('en' or 'ka')
 * @returns The table label to display
 */
export const getTableLabel = (
  service?: ServiceWithCustomLabels | null,
  fallback: string = "Table",
  language: 'en' | 'ka' = 'en'
): string => {
  // Check service-level label first (from services table), then venue-specific label
  const serviceLabel = language === 'ka' 
    ? (service?.services?.table_label_ka || service?.services?.table_label)
    : service?.services?.table_label;
  const venueLabel = language === 'ka' 
    ? (service?.table_label_ka || service?.table_label)
    : service?.table_label;
  
  const label = serviceLabel || venueLabel;
  
  if (!label) {
    return fallback;
  }
  return label.trim() || fallback;
};

/**
 * Get the appropriate label for guest-wise pricing
 * @param service - Service object with custom labels
 * @param fallback - Fallback label if no custom label is set
 * @param language - Language code ('en' or 'ka')
 * @returns The guest label to display
 */
export const getGuestLabel = (
  service?: ServiceWithCustomLabels | null,
  fallback: string = "Guest",
  language: 'en' | 'ka' = 'en'
): string => {
  // Check service-level label first (from services table), then venue-specific label
  const serviceLabel = language === 'ka' 
    ? (service?.services?.guest_label_ka || service?.services?.guest_label)
    : service?.services?.guest_label;
  const venueLabel = language === 'ka' 
    ? (service?.guest_label_ka || service?.guest_label)
    : service?.guest_label;
  
  const label = serviceLabel || venueLabel;
  
  if (!label) {
    return fallback;
  }
  return label.trim() || fallback;
};

/**
 * Get the appropriate label based on pricing model
 * @param service - Service object with custom labels
 * @param tableFallback - Fallback for table-wise pricing
 * @param guestFallback - Fallback for guest-wise pricing
 * @returns The appropriate label based on pricing model
 */
export const getPricingLabel = (
  service?: ServiceWithCustomLabels | null,
  tableFallback: string = "Table",
  guestFallback: string = "Guest",
  language: 'en' | 'ka' = 'en'
): string => {
  if (!service) {
    return tableFallback;
  }

  if (isPerTableService(service.pricing_model)) {
    return getTableLabel(service, tableFallback, language);
  } else {
    return getGuestLabel(service, guestFallback, language);
  }
};

/**
 * Get both labels for a service
 * @param service - Service object with custom labels
 * @param tableFallback - Fallback for table-wise pricing
 * @param guestFallback - Fallback for guest-wise pricing
 * @returns Object with both table and guest labels
 */
export const getPricingLabels = (
  service?: ServiceWithCustomLabels | null,
  tableFallback: string = "Table",
  guestFallback: string = "Guest",
  language: 'en' | 'ka' = 'en'
): { tableLabel: string; guestLabel: string } => {
  return {
    tableLabel: getTableLabel(service, tableFallback, language),
    guestLabel: getGuestLabel(service, guestFallback, language),
  };
};

/**
 * Format a price string with custom labels
 * @param price - The price value
 * @param service - Service object with custom labels
 * @param pricingModel - The pricing model
 * @param currency - Currency symbol (default: "GEL")
 * @param timeUnit - Time unit (default: "hour")
 * @returns Formatted price string with custom labels
 */
export const formatPriceWithCustomLabels = (
  price: number,
  service?: ServiceWithCustomLabels | null,
  pricingModel?: string,
  currency: string = "GEL",
  timeUnit: string = "hour"
): string => {
  if (!service && !pricingModel) {
    return `${price} ${currency}/table/${timeUnit}`;
  }

  const model = pricingModel || service?.pricing_model;
  
  if (isPerTableService(model)) {
    const tableLabel = getTableLabel(service);
    return `${price} ${currency}/${tableLabel.toLowerCase()}/${timeUnit}`;
  } else {
    const guestLabel = getGuestLabel(service);
    return `${price} ${currency}/${guestLabel.toLowerCase()}/${timeUnit}`;
  }
};
