import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Venue } from './useVenues';
import { isVenueOpenNow } from '@/utils/workingHours';

interface UseVenuesInfiniteOptions {
  pageSize?: number;
  showHidden?: boolean;
}

export const useVenuesInfinite = ({ 
  pageSize = 12, 
  showHidden = false 
}: UseVenuesInfiniteOptions = {}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Consistent comparator used both per-page and for the combined list
  const compareVenues = (a: any, b: any) => {
    const aOpen = typeof a._isOpen === 'boolean' ? a._isOpen : isVenueOpenNow(a.working_hours);
    const bOpen = typeof b._isOpen === 'boolean' ? b._isOpen : isVenueOpenNow(b.working_hours);
    if (aOpen !== bOpen) {
      return aOpen ? -1 : 1; // Open venues come first
    }

    const ao = typeof a._order === 'number' ? a._order : Number.POSITIVE_INFINITY;
    const bo = typeof b._order === 'number' ? b._order : Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;

    // Final fallback by created_at desc
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  // Fetch venues with pagination
  const { data: venuesData, isLoading, error, isFetching } = useQuery({
    queryKey: ['venues-infinite', currentPage, pageSize, showHidden],
    queryFn: async () => {
      const offset = currentPage * pageSize;
      
      // Build venues query with pagination
      let venuesQuery = supabase
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
        `);

      // Only apply visibility filter when we are not showing hidden venues
      if (!showHidden) {
        venuesQuery = venuesQuery.eq('is_visible', true);
      }

      venuesQuery = venuesQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data: venuesData, error: venuesError } = await venuesQuery;

      if (venuesError) throw venuesError;

      // Fetch global order map
      const { data: orders, error: ordersError } = await supabase
        .from('venue_order')
        .select('venue_id, display_order')
        .eq('scope_type', 'global')
        .or('scope_id.is.null');

      if (ordersError) throw ordersError;

      const orderMap = new Map<string, number>((orders || []).map(o => [o.venue_id as string, Number(o.display_order)]));

      // Sort by open/closed status first, then by display_order, then fallback by created_at desc
      const withOrder = (venuesData || [])
        .map(v => ({ 
          ...v, 
          _order: orderMap.get(v.id),
          _isOpen: isVenueOpenNow(v.working_hours)
        }))
        .sort(compareVenues);

      return withOrder as Venue[];
    },
    enabled: hasMore, // Only fetch if there's more data
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update venues when new data arrives
  useEffect(() => {
    if (venuesData) {
      // Merge and ensure global sort stability across pages
      setAllVenues(prev => {
        const merged = currentPage === 0 ? [...venuesData] : [...prev, ...venuesData];
        return [...merged].sort(compareVenues);
      });

      // Check if we have more data
      setHasMore(venuesData.length === pageSize);
    }
  }, [venuesData, currentPage, pageSize]);

  // Load more function
  const loadMore = () => {
    if (!isFetching && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Reset function
  const reset = () => {
    setCurrentPage(0);
    setAllVenues([]);
    setHasMore(true);
  };

  // Memoized return values
  const venues = useMemo(() => allVenues, [allVenues]);
  const isInitialLoading = isLoading && currentPage === 0;
  const isLoadingMore = isFetching && currentPage > 0;

  return {
    venues,
    isLoading: isInitialLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    reset,
    currentPage
  };
};

export default useVenuesInfinite;
