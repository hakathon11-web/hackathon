import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountCalculationResult {
  originalPrice: number;
  finalPrice: number;
  totalSavings: number;
  appliedDiscounts: string[];
  discountBreakdown: {
    overallDiscount?: number;
    freeHours?: number;
    groupDiscount?: number;
    timeslotDiscount?: number;
  };
  paidHours: number;
}

export interface DiscountConfig {
  overallDiscountPercent?: number;
  groupDiscounts?: Array<{ minGuests: number; discountPercent: number }>;
  timeslotDiscounts?: Array<{ start: string; end: string; discountPercent: number }>;
  freeHourDiscounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
}

export const useVenueDiscountCalculation = (
  venueId: string,
  basePrice: number,
  durationHours: number,
  guestCount: number,
  bookingStartTime: string,
  bookingEndTime: string,
  enabled = true,
  isTableWiseService: boolean = false
) => {
  return useQuery({
    queryKey: [
      'venue-discount-calculation',
      venueId,
      basePrice,
      durationHours,
      guestCount,
      bookingStartTime,
      bookingEndTime,
      isTableWiseService,
    ],
    queryFn: async (): Promise<DiscountCalculationResult> => {
      // Fetch venue-level discount data
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('overall_discount_percent, overall_discount_service_ids, free_hour_discounts, group_discounts, timeslot_discounts')
        .eq('id', venueId)
        .maybeSingle();

      if (venueError) {
        console.error('Error fetching venue discount data:', venueError);
        return calculateDiscountOffline(basePrice, durationHours, guestCount, {}, bookingStartTime, bookingEndTime, undefined, isTableWiseService);
      }

      // Build discount config from venue data
      const discountConfig: DiscountConfig = {
        overallDiscountPercent: 0,
        groupDiscounts: [],
        timeslotDiscounts: [],
        freeHourDiscounts: []
      };

      if (venueData) {
        // Apply venue-level overall discount
        if (venueData.overall_discount_percent && venueData.overall_discount_percent > 0) {
          discountConfig.overallDiscountPercent = Number(venueData.overall_discount_percent);
        }
        
        // Apply venue-level group discounts
        if (venueData.group_discounts && Array.isArray(venueData.group_discounts) && venueData.group_discounts.length > 0) {
          discountConfig.groupDiscounts = venueData.group_discounts as any;
        }
        
        // Apply venue-level timeslot discounts
        if (venueData.timeslot_discounts && Array.isArray(venueData.timeslot_discounts) && venueData.timeslot_discounts.length > 0) {
          discountConfig.timeslotDiscounts = venueData.timeslot_discounts as any;
        }
        
        // Apply venue-level free hour discounts
        if (venueData.free_hour_discounts && Array.isArray(venueData.free_hour_discounts) && venueData.free_hour_discounts.length > 0) {
          discountConfig.freeHourDiscounts = venueData.free_hour_discounts as any;
        }
      }

      console.log('Venue discount config:', discountConfig);

      return calculateDiscountOffline(basePrice, durationHours, guestCount, discountConfig, bookingStartTime, bookingEndTime, undefined, isTableWiseService);
    },
    enabled: enabled && !!venueId && basePrice > 0 && durationHours > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useServiceDiscountCalculation = (
  serviceId: string | undefined,
  basePrice: number,
  durationHours: number,
  guestCount: number,
  bookingStartTime: string,
  bookingEndTime: string,
  enabled = true,
  isTableWiseService: boolean = false
) => {
  return useQuery({
    queryKey: [
      'service-discount-calculation',
      serviceId,
      basePrice,
      durationHours,
      guestCount,
      bookingStartTime,
      bookingEndTime,
      isTableWiseService,
    ],
    queryFn: async (): Promise<DiscountCalculationResult> => {
      console.log('useServiceDiscountCalculation called with:', {
        serviceId,
        basePrice,
        durationHours,
        guestCount,
        bookingStartTime,
        bookingEndTime,
        isTableWiseService
      });

      if (!serviceId) {
        console.log('No serviceId provided, returning offline calculation');
        return calculateDiscountOffline(basePrice, durationHours, guestCount, {}, bookingStartTime, bookingEndTime, undefined, isTableWiseService);
      }

      // Fetch both service and venue data to get complete discount configuration
      const [serviceResult, venueResult] = await Promise.all([
        supabase
          .from('venue_services')
          .select('overall_discount_percent, group_discounts, timeslot_discounts, free_hour_discounts, venue_id')
          .eq('id', serviceId)
          .maybeSingle(),
        // We'll get venue data after we have the service data
        Promise.resolve({ data: null, error: null })
      ]);

      const serviceData = serviceResult.data;
      let venueData = null;

      // If we have service data, fetch venue discount data
      if (serviceData && serviceData.venue_id) {
        const venueResult = await supabase
          .from('venues')
          .select('overall_discount_percent, overall_discount_service_ids, free_hour_discounts, group_discounts, timeslot_discounts')
          .eq('id', serviceData.venue_id)
          .maybeSingle();
        venueData = venueResult.data;
      }

      // Build discount config combining service and venue discounts
      const discountConfig: DiscountConfig = {
        overallDiscountPercent: 0,
        groupDiscounts: [],
        timeslotDiscounts: [],
        freeHourDiscounts: []
      };

             console.log('🔍 Raw service data:', serviceData);
             console.log('🔍 Raw venue data:', venueData);
             console.log('🔍 Service ID being used:', serviceId);
             console.log('🔍 Venue ID from service:', serviceData?.venue_id);

      // Apply service-level discounts first
      if (serviceData) {
        if (serviceData.overall_discount_percent !== null && serviceData.overall_discount_percent !== undefined && serviceData.overall_discount_percent > 0) {
          discountConfig.overallDiscountPercent = Number(serviceData.overall_discount_percent);
          console.log('Applied service overall discount:', discountConfig.overallDiscountPercent);
        }
        
        if (serviceData.group_discounts && Array.isArray(serviceData.group_discounts) && serviceData.group_discounts.length > 0) {
          discountConfig.groupDiscounts = serviceData.group_discounts as any;
        }
        
        if (serviceData.timeslot_discounts && Array.isArray(serviceData.timeslot_discounts) && serviceData.timeslot_discounts.length > 0) {
          discountConfig.timeslotDiscounts = serviceData.timeslot_discounts as any;
        }
        
        if (serviceData.free_hour_discounts && Array.isArray(serviceData.free_hour_discounts) && serviceData.free_hour_discounts.length > 0) {
          discountConfig.freeHourDiscounts = serviceData.free_hour_discounts as any;
        }
      }

      // Apply venue-level discounts (these can override or supplement service discounts)
      if (venueData) {
        // Check if venue overall discount applies to this service
        // If no service IDs are specified, apply to all services
        // If service IDs are specified, only apply to those services
        const venueOverallDiscountApplies = !venueData.overall_discount_service_ids || 
          venueData.overall_discount_service_ids.length === 0 || 
          venueData.overall_discount_service_ids.includes(serviceId);

        console.log('🔍 Venue overall discount check:', {
          serviceId,
          venueServiceIds: venueData.overall_discount_service_ids,
          venueDiscountPercent: venueData.overall_discount_percent,
          applies: venueOverallDiscountApplies
        });

        if (venueOverallDiscountApplies && venueData.overall_discount_percent && venueData.overall_discount_percent > 0) {
          // Use the higher of service or venue overall discount
          const venueDiscount = Number(venueData.overall_discount_percent);
          if (venueDiscount > discountConfig.overallDiscountPercent) {
            discountConfig.overallDiscountPercent = venueDiscount;
            console.log('Applied venue overall discount:', venueDiscount);
          }
        }

        // Add venue-level group discounts
        if (venueData.group_discounts && Array.isArray(venueData.group_discounts) && venueData.group_discounts.length > 0) {
          // Filter venue group discounts that apply to this service
          const applicableVenueGroupDiscounts = venueData.group_discounts.filter((discount: any) => 
            !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
          );
          discountConfig.groupDiscounts = [...discountConfig.groupDiscounts, ...applicableVenueGroupDiscounts];
        }

        // Add venue-level timeslot discounts
        if (venueData.timeslot_discounts && Array.isArray(venueData.timeslot_discounts) && venueData.timeslot_discounts.length > 0) {
          // Filter venue timeslot discounts that apply to this service
          const applicableVenueTimeslotDiscounts = venueData.timeslot_discounts.filter((discount: any) => 
            !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
          );
          discountConfig.timeslotDiscounts = [...discountConfig.timeslotDiscounts, ...applicableVenueTimeslotDiscounts];
        }

        // Add venue-level free hour discounts
        if (venueData.free_hour_discounts && Array.isArray(venueData.free_hour_discounts) && venueData.free_hour_discounts.length > 0) {
          // Filter venue free hour discounts that apply to this service
          const applicableVenueFreeHourDiscounts = venueData.free_hour_discounts.filter((discount: any) => 
            !discount.serviceIds || discount.serviceIds.length === 0 || discount.serviceIds.includes(serviceId)
          );
          discountConfig.freeHourDiscounts = [...discountConfig.freeHourDiscounts, ...applicableVenueFreeHourDiscounts];
        }
      }

      console.log('Final combined discount config:', discountConfig);

      const result = calculateDiscountOffline(basePrice, durationHours, guestCount, discountConfig, bookingStartTime, bookingEndTime, serviceId, isTableWiseService);
      
      console.log('🔍 Discount calculation result:', {
        basePrice,
        durationHours,
        guestCount,
        bookingStartTime,
        bookingEndTime,
        discountConfig,
        result
      });
      
      return result;
    },
    enabled: (() => {
      const isEnabled = enabled && !!serviceId && basePrice > 0 && durationHours > 0;
      console.log('useServiceDiscountCalculation - Enabled condition check:', {
        enabled,
        serviceId: !!serviceId,
        basePrice: basePrice > 0,
        durationHours: durationHours > 0,
        finalEnabled: isEnabled
      });
      return isEnabled;
    })(),
    // Debug the enabled condition
    onSuccess: (data) => {
      console.log('useServiceDiscountCalculation - Query succeeded with data:', data);
    },
    onError: (error) => {
      console.error('useServiceDiscountCalculation - Query failed with error:', error);
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const calculateDiscountOffline = (
  basePrice: number,
  durationHours: number,
  guestCount: number,
  discountConfig: DiscountConfig,
  bookingStartTime?: string,
  bookingEndTime?: string,
  serviceId?: string,
  isTableWiseService: boolean = false
): DiscountCalculationResult => {
  let finalPrice = basePrice;
  const originalPrice = basePrice;
  let paidHours = durationHours;
  const appliedDiscounts: string[] = [];
  const discountBreakdown: any = {};

  // 1. Apply overall discount
  if (discountConfig.overallDiscountPercent && discountConfig.overallDiscountPercent > 0) {
    finalPrice = finalPrice * (1 - discountConfig.overallDiscountPercent / 100);
    appliedDiscounts.push('Overall Discount');
    discountBreakdown.overallDiscount = discountConfig.overallDiscountPercent;
  }

  // 2. Apply free hour discounts
  if (discountConfig.freeHourDiscounts && discountConfig.freeHourDiscounts.length > 0) {
    console.log('Applying free hour discounts:', discountConfig.freeHourDiscounts);
    console.log('Duration hours:', durationHours);
    
    for (const freeHourRule of discountConfig.freeHourDiscounts) {
      console.log('Checking free hour rule:', freeHourRule);
      
      // Check if this service is eligible for this free hour rule (if serviceIds is specified)
      const isServiceEligible = !freeHourRule.serviceIds || 
        freeHourRule.serviceIds.length === 0 || 
        (serviceId && freeHourRule.serviceIds.includes(serviceId));
      
      console.log('Service eligible for free hour rule:', isServiceEligible);
      
      if (isServiceEligible && durationHours >= (freeHourRule.thresholdHours + freeHourRule.freeHours)) {
        const blockSize = freeHourRule.thresholdHours + freeHourRule.freeHours;
        const completeBlocks = Math.floor(durationHours / blockSize);
        const remainingHours = durationHours % blockSize;
        
        console.log('Block size:', blockSize, 'Complete blocks:', completeBlocks, 'Remaining hours:', remainingHours);
        
        // Calculate paid hours: complete blocks pay only threshold hours + remaining hours
        const paidFromCompleteBlocks = completeBlocks * freeHourRule.thresholdHours;
        const chargedHours = paidFromCompleteBlocks + remainingHours;
        
        console.log('Paid from complete blocks:', paidFromCompleteBlocks, 'Total charged hours:', chargedHours);
        
        if (chargedHours < durationHours) {
          paidHours = chargedHours;
          finalPrice = finalPrice * (chargedHours / durationHours);
          appliedDiscounts.push('Free Hours');
          discountBreakdown.freeHours = durationHours - chargedHours;
          console.log('Applied free hours discount. Charged hours:', chargedHours, 'Free hours:', durationHours - chargedHours);
          break; // Only apply one free hour rule
        }
      }
    }
  }

  // 3. Apply group discount - only for guest-wise services
  if (!isTableWiseService && discountConfig.groupDiscounts && discountConfig.groupDiscounts.length > 0) {
    let groupDiscountPercent = 0;
    for (const groupRule of discountConfig.groupDiscounts) {
      // Check if this discount applies to the current service
      const appliesToService = !groupRule.serviceIds || 
        groupRule.serviceIds.length === 0 || 
        (serviceId && groupRule.serviceIds.includes(serviceId));
      
      if (appliesToService && guestCount >= groupRule.minGuests) {
        groupDiscountPercent = Math.max(groupDiscountPercent, groupRule.discountPercent);
      }
    }

    if (groupDiscountPercent > 0) {
      finalPrice = finalPrice * (1 - groupDiscountPercent / 100);
      appliedDiscounts.push('Group Discount');
      discountBreakdown.groupDiscount = groupDiscountPercent;
    }
  }

  // 4. Apply timeslot discount proportionally
  if (
    discountConfig.timeslotDiscounts &&
    discountConfig.timeslotDiscounts.length > 0 &&
    bookingStartTime &&
    bookingEndTime
  ) {
    for (const timeslotRule of discountConfig.timeslotDiscounts) {
      // Check if this discount applies to the current service
      const appliesToService = !timeslotRule.serviceIds || 
        timeslotRule.serviceIds.length === 0 || 
        (serviceId && timeslotRule.serviceIds.includes(serviceId));
      
      if (!appliesToService) continue;
      
      // Calculate overlap between booking time and discount time
      const discountStart = timeslotRule.start;
      const discountEnd = timeslotRule.end;
      
      // Find the overlap period
      const overlapStart = bookingStartTime >= discountStart ? bookingStartTime : discountStart;
      const overlapEnd = bookingEndTime <= discountEnd ? bookingEndTime : discountEnd;
      
      if (overlapStart < overlapEnd) {
        // Calculate overlap hours
        const [overlapStartHour, overlapStartMin] = overlapStart.split(':').map(Number);
        const [overlapEndHour, overlapEndMin] = overlapEnd.split(':').map(Number);
        const overlapHours = (overlapEndHour + overlapEndMin/60) - (overlapStartHour + overlapStartMin/60);
        
        if (overlapHours > 0) {
          // Apply discount proportionally to overlapping hours
          const discountAmount = (finalPrice * (overlapHours / durationHours)) * (timeslotRule.discountPercent / 100);
          finalPrice = finalPrice - discountAmount;
          
          appliedDiscounts.push('Timeslot Discount');
          discountBreakdown.timeslotDiscount = timeslotRule.discountPercent;
          console.log(`Applied timeslot discount: ${overlapHours} hours at ${timeslotRule.discountPercent}% discount`);
          break; // Only apply the first matching timeslot discount
        }
      }
    }
  }

  return {
    originalPrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    totalSavings: Math.round((originalPrice - finalPrice) * 100) / 100,
    appliedDiscounts,
    discountBreakdown,
    paidHours,
  };
};