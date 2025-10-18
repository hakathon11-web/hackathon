// Pricing model constants
export const PRICING_MODELS = {
  GUEST_WISE: 'guest_wise',
  TABLE_WISE: 'table_wise',
  // Legacy models for backwards compatibility
  HOURLY: 'hourly',
  FIXED: 'fixed',
  PER_TABLE: 'per_table'
} as const;

export type PricingModel = typeof PRICING_MODELS[keyof typeof PRICING_MODELS];

// Helper function to determine if a service uses per-table pricing
export const isPerTableService = (pricingModel?: string): boolean => {
  return pricingModel === PRICING_MODELS.TABLE_WISE || 
         pricingModel === PRICING_MODELS.PER_TABLE || 
         pricingModel === PRICING_MODELS.FIXED;
};

// Helper function to determine if a service uses guest-wise pricing
export const isGuestWiseService = (pricingModel?: string): boolean => {
  return pricingModel === PRICING_MODELS.GUEST_WISE || 
         pricingModel === PRICING_MODELS.HOURLY;
};

// Get display label for pricing model
export const getPricingModelLabel = (pricingModel?: string): string => {
  switch (pricingModel) {
    case PRICING_MODELS.GUEST_WISE:
    case PRICING_MODELS.HOURLY:
      return 'Guest-wise';
    case PRICING_MODELS.TABLE_WISE:
    case PRICING_MODELS.PER_TABLE:
    case PRICING_MODELS.FIXED:
      return 'Table-wise';
    default:
      return 'Guest-wise';
  }
};
