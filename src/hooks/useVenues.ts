
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isVenueOpenNow } from '@/utils/workingHours';

export interface Venue {
  id: string;
  name: string;
  location: string;
  district: string;
  rating: number;
  review_count: number;
  price: number;

  images: string[];
  amenities: string[];
  working_hours?: any;
  partner_id: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  // Venue-level discount fields
  overall_discount_percent?: number;
  overall_discount_service_ids?: string[];
  free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  group_discounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
  timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  // Booking advance limit
  max_booking_days_in_advance?: number;
  // Category
  main_category?: string;
}

export interface VenueService {
  id: string;
  venue_id: string;
  service_id: string;
  price: number;
  name?: string; // Optional venue-specific override
  table_label?: string;
  guest_label?: string;
  table_label_ka?: string;
  guest_label_ka?: string;

  guest_pricing_rules?: Array<{ maxGuests: number; price: number }>;
  overall_discount_percent?: number;
  group_discounts?: Array<{ minGuests: number; discountPercent: number }>;
  timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number }>;
  free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
  // Joined fields from services table (this is the source of truth for translations)
  services?: {
    name: string;
    name_en?: string;
    name_ka?: string;
    pricing_model: string;
    description?: string;
    duration: string;
    table_label?: string;
    guest_label?: string;
    table_label_ka?: string;
    guest_label_ka?: string;
  };
}

export const useVenues = (showHidden = false, category?: string) => {
  return useQuery({
    queryKey: ['venues', showHidden, category],
    queryFn: async () => {
      // Build query with optional category filter
      let query = supabase.from('venues').select(`
          id,
          name,
          location,
          district,
          rating,
          review_count,
          price,

          images,
          amenities,
          working_hours,
          partner_id,
          is_visible,
          created_at,
          updated_at,
          description,
          latitude,
          longitude,
          overall_discount_percent,
          overall_discount_service_ids,
          free_hour_discounts,
          group_discounts,
          timeslot_discounts,
          max_booking_days_in_advance,
          main_category
        `);

      // Apply category filter if provided
      if (category) {
        query = query.eq('main_category', category);
      }

      const { data: venuesData, error: venuesError } = await query;

      if (venuesError) throw venuesError;

      const visible = (venuesData || []).filter(v => showHidden ? true : v.is_visible);

      // Fetch global order map
      const { data: orders, error: ordersError } = await supabase
        .from('venue_order')
        .select('venue_id, display_order')
        .eq('scope_type', 'global')
        .or('scope_id.is.null');

      if (ordersError) throw ordersError;

      const orderMap = new Map<string, number>((orders || []).map(o => [o.venue_id as string, Number(o.display_order)]));

      // Sort by open/closed status first, then by display_order, then fallback by created_at desc
      const withOrder = visible
        .map(v => ({ 
          ...v, 
          _order: orderMap.get(v.id),
          _isOpen: isVenueOpenNow(v.working_hours)
        }))
        .sort((a: any, b: any) => {
          // First, sort by open/closed status (open venues first)
          const aOpen = a._isOpen;
          const bOpen = b._isOpen;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1; // Open venues come first
          }
          
          // Within the same open/closed group, sort by admin display_order
          const ao = a._order;
          const bo = b._order;
          if (typeof ao === 'number' && typeof bo === 'number') return ao - bo;
          if (typeof ao === 'number') return -1;
          if (typeof bo === 'number') return 1;
          
          // Final fallback by created_at desc
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      return withOrder as Venue[];
    },
  });
};

export const useVenue = (id: string) => {
  return useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('venues')
          .select(`
            id,
            name,
            location,
            district,
            rating,
            review_count,
            price,
            images,
            amenities,
            working_hours,
            partner_id,
            is_visible,
            created_at,
            updated_at,
            description,
            latitude,
            longitude,
            overall_discount_percent,
            overall_discount_service_ids,
            free_hour_discounts,
            group_discounts,
            timeslot_discounts,
            max_booking_days_in_advance
          `)
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        return data as Venue;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!id,
  });
};

export const useVenueServices = (venueId: string) => {
  return useQuery({
    queryKey: ['venue-services-v3', venueId], // Updated query key to force cache refresh
    queryFn: async () => {
      // Get venue services with joined services data
      const { data: venueServicesData, error: venueServicesError } = await supabase
        .from('venue_services')
        .select(`
          *,
          services (
            name,
            name_en,
            name_ka,
            pricing_model,
            description,
            duration,
            table_label,
            guest_label,
            table_label_ka,
            guest_label_ka
          )
        `)
        .eq('venue_id', venueId)
        .order('price', { ascending: true });

      if (venueServicesError) {
        throw venueServicesError;
      }



      const mappedServices = venueServicesData?.map(service => ({
        ...service,
        // Copy custom labels from nested services object to top level (venue can override these)
        table_label: service.table_label || service.services?.table_label,
        guest_label: service.guest_label || service.services?.guest_label,
        table_label_ka: service.table_label_ka || service.services?.table_label_ka,
        guest_label_ka: service.guest_label_ka || service.services?.guest_label_ka,
        // Note: Translation fields (name_en, name_ka) now come ONLY from services table
        // Use pricing_model from services table
        guest_pricing_rules: Array.isArray(service.guest_pricing_rules) 
          ? service.guest_pricing_rules as Array<{ maxGuests: number; price: number }>
          : [],
        group_discounts: Array.isArray(service.group_discounts) 
          ? service.group_discounts as Array<{ minGuests: number; discountPercent: number }>
          : [],
        timeslot_discounts: Array.isArray(service.timeslot_discounts) 
          ? service.timeslot_discounts as Array<{ start: string; end: string; discountPercent: number }>
          : [],
        free_hour_discounts: Array.isArray(service.free_hour_discounts) 
          ? service.free_hour_discounts as Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>
          : []
      })) as VenueService[];


      return mappedServices;
    },
    enabled: !!venueId,
  });
};
