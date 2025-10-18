import { isPerTableService } from "@/constants/services";
import { getTableLabel, getGuestLabel } from "@/utils/pricingLabels";

export interface GuestPricingRule {
  maxGuests: number;
  price: number;
}

export interface ServiceWithGuestPricing {
  id: string;
  name?: string;
  service_type?: string;
  pricing_model?: string;
  price: number; // Legacy field - base price (per table for certain services)
  guest_pricing_rules?: GuestPricingRule[];
  table_label?: string;
  guest_label?: string;
}

/**
 * Calculate price for a service based on pricing model
 * Table-wise: price = hours * tables (ignores guest count)
 * Guest-wise: price = total price per table based on guest count * hours
 */
export const calculateGuestPrice = (
  service: ServiceWithGuestPricing,
  guestCount: number,
  tableCount: number = 1,
  hours: number = 1
): number | null => {
  console.log(`🔍 calculateGuestPrice - Service: ${service.name}, Pricing model: ${service.pricing_model}, Guest count: ${guestCount}, Table count: ${tableCount}, Hours: ${hours}`);
  
  // Table-wise pricing: price = service_price * tables * hours (ignore guest count)
  if (isPerTableService(service.pricing_model)) {
    const price = service.price * tableCount * hours;
    console.log(`💰 Table-wise pricing: ${service.price} * ${tableCount} * ${hours} = ${price}`);
    return price;
  }

  // Guest-wise pricing: calculate total price per table based on guest count and pricing rules
  let pricePerTable: number;
  
  if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
    // Use guest pricing rules to determine total price for the table
    const applicableRule = service.guest_pricing_rules.find(rule => guestCount <= rule.maxGuests);
    
    if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
      pricePerTable = applicableRule.price;
      console.log(`💰 Guest-wise pricing with rules: ${guestCount} guests <= ${applicableRule.maxGuests} max guests, total price for table: ${pricePerTable}`);
    } else {
      // Fallback to base price if no applicable rule found
      pricePerTable = service.price * guestCount;
      console.log(`💰 Guest-wise pricing fallback: no applicable rule found, using base price * guest count: ${service.price} * ${guestCount} = ${pricePerTable}`);
    }
  } else {
    // Use base price * guest count if no guest pricing rules are defined
    pricePerTable = service.price * guestCount;
    console.log(`💰 Guest-wise pricing with base price: ${service.price} * ${guestCount} = ${pricePerTable}`);
  }
  
  const totalPrice = pricePerTable * hours;
  console.log(`💰 Guest-wise total: ${pricePerTable} * ${hours} = ${totalPrice}`);
  return totalPrice;
};

/**
 * Get the maximum guest count supported by a service
 */
export const getMaxGuestCount = (service: ServiceWithGuestPricing): number | null => {
  if (isPerTableService(service.pricing_model)) return null; // Not applicable

  if (!service.guest_pricing_rules || service.guest_pricing_rules.length === 0) {
    return null; // No limit with legacy pricing
  }

  const maxRule = service.guest_pricing_rules.reduce((max, rule) =>
    rule.maxGuests > max.maxGuests ? rule : max
  );
  
  return maxRule.maxGuests;
};

/**
 * Check if a guest count is valid for a service
 */
export const isValidGuestCount = (
  service: ServiceWithGuestPricing,
  guestCount: number
): boolean => {
  if (isPerTableService(service.pricing_model)) return true; // Always valid
  const price = calculateGuestPrice(service, guestCount);
  return price !== null;
};

/**
 * Get the total price for a table with a specific guest count based on pricing rules
 */
export const getPricePerTable = (service: ServiceWithGuestPricing, guestCount: number): number => {
  if (isPerTableService(service.pricing_model)) {
    return service.price; // For table-wise, return base price per table
  }

  if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
    // Find the applicable rule for this guest count
    const applicableRule = service.guest_pricing_rules.find(rule => guestCount <= rule.maxGuests);
    
    if (applicableRule && applicableRule.price !== null && applicableRule.price !== undefined) {
      return applicableRule.price; // Total price for the table
    }
  }
  
  // Fallback to base price * guest count
  return service.price * guestCount;
};

/**
 * Get a simplified display price for a service
 */
export const getServiceDisplayPrice = (service: ServiceWithGuestPricing, language: 'en' | 'ka' = 'en', currency: string = 'GEL', hourShort: string = 'hr'): string => {
  const tableLabel = getTableLabel(service, "Table", language).toLowerCase();
  const guestLabel = getGuestLabel(service, "Guest", language).toLowerCase();
  
  if (isPerTableService(service.pricing_model)) {
    return `${service.price} ${currency}/${tableLabel}/${hourShort}`;
  }

  // For guest-wise services with pricing rules, show a simplified pricing
  if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
    const validRules = service.guest_pricing_rules
      .filter(rule => rule.price !== null && rule.price !== undefined);
    
    if (validRules.length === 0) {
      return `${service.price} ${currency}/${guestLabel}/${hourShort}`;
    }

    // Find the most common price or show a range
    const prices = validRules.map(rule => rule.price);
    const uniquePrices = [...new Set(prices)];
    
    if (uniquePrices.length === 1) {
      // All prices are the same
      return `${uniquePrices[0]} ${currency}/${tableLabel}`;
    } else {
      // Show price range
      const minPrice = Math.min(...uniquePrices);
      const maxPrice = Math.max(...uniquePrices);
      if (minPrice === maxPrice) {
        return `${minPrice} ${currency}/${tableLabel}`;
      } else {
        return `${minPrice}-${maxPrice} ${currency}/${tableLabel}`;
      }
    }
  }

  return `${service.price} ${currency}/${guestLabel}/${hourShort}`;
};

/**
 * Get detailed pricing information for tooltips or detailed views
 */
export const getServiceDetailedPricing = (service: ServiceWithGuestPricing, language: 'en' | 'ka' = 'en'): string => {
  const tableLabel = getTableLabel(service, "Table", language).toLowerCase();
  const guestLabel = getGuestLabel(service, "Guest", language).toLowerCase();
  
  if (isPerTableService(service.pricing_model)) {
    return `${service.price} GEL per ${tableLabel} per hour`;
  }

  if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
    const validRules = service.guest_pricing_rules
      .filter(rule => rule.price !== null && rule.price !== undefined);
    
    if (validRules.length === 0) {
      return `${service.price} GEL per ${guestLabel} per hour`;
    }

    // Group rules by price to show ranges
    const priceGroups: { [key: number]: number[] } = {};
    validRules.forEach(rule => {
      if (!priceGroups[rule.price]) {
        priceGroups[rule.price] = [];
      }
      priceGroups[rule.price].push(rule.maxGuests);
    });

    const priceRanges = Object.entries(priceGroups).map(([price, guestCounts]) => {
      const minGuests = Math.min(...guestCounts);
      const maxGuests = Math.max(...guestCounts);
      
      if (minGuests === maxGuests) {
        return `${minGuests} ${guestLabel}${minGuests !== 1 ? 's' : ''}: ${price} GEL`;
      } else {
        return `${minGuests}-${maxGuests} ${guestLabel}s: ${price} GEL`;
      }
    });

    return priceRanges.join(', ');
  }

  return `${service.price} GEL per ${guestLabel} per hour`;
};

/**
 * Extract numeric price from pricing display string
 * Works with formats like "From 10 GEL", "10 GEL/table", "10-20 GEL/table", etc.
 */
export const extractNumericPrice = (pricingString: string): number => {
  // Match patterns like "From 10 GEL", "10 GEL", "10-20 GEL", etc.
  const match = pricingString.match(/(\d+)(?:\s*-\s*\d+)?\s*GEL/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Fallback: try to extract any number followed by GEL
  const fallbackMatch = pricingString.match(/(\d+)/);
  return fallbackMatch ? parseInt(fallbackMatch[1]) : 0;
};

/**
 * Get a short pricing summary for compact displays
 */
export const getServicePricingSummary = (service: ServiceWithGuestPricing, t?: any, language: 'en' | 'ka' = 'en', currency: string = 'GEL', hourShort: string = 'hr'): string => {
  const tableLabel = getTableLabel(service, "Table", language).toLowerCase();
  const guestLabel = getGuestLabel(service, "Guest", language).toLowerCase();
  
  if (isPerTableService(service.pricing_model)) {
    return `${service.price} ${currency}/${tableLabel}/${hourShort}`;
  }

  if (service.guest_pricing_rules && service.guest_pricing_rules.length > 0) {
    const validRules = service.guest_pricing_rules
      .filter(rule => rule.price !== null && rule.price !== undefined);
    
    if (validRules.length === 0) {
      return `${service.price} ${currency}/${guestLabel}/${hourShort}`;
    }

    const minPrice = Math.min(...validRules.map(rule => rule.price));
    return `${minPrice} ${currency}/${tableLabel}/${hourShort}`;
  }

  return `${service.price} ${currency}/${guestLabel}/${hourShort}`;
};
