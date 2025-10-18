import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { isVenueOpenNow } from '@/utils/workingHours';

export interface VenueOrder {
  id: string;
  venue_id: string;
  scope_type: 'global' | 'city';
  scope_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VenueWithOrder {
  id: string;
  name: string;
  location: string;
  images: string[] | null;
  is_visible: boolean;
  display_order?: number;
  city?: string;
  working_hours?: any;
}

export const useVenueOrdering = (scopeType: string = 'global', scopeId: string | null = null) => {
  return useQuery({
    queryKey: ['venue-ordering', scopeType, scopeId],
    queryFn: async () => {
      // Fetch visible venues with fields needed for strategies
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, location, images, is_visible, rating, review_count, created_at, working_hours')
        .eq('is_visible', true);

      if (venuesError) throw venuesError;

      // Fetch existing order for scope
      let orderQuery = supabase
        .from('venue_order')
        .select('venue_id, display_order, scope_type, scope_id')
        .eq('scope_type', scopeType);

      if (scopeId === null) {
        orderQuery = orderQuery.or('scope_id.is.null');
      } else {
        orderQuery = orderQuery.eq('scope_id', scopeId);
      }

      const { data: orders, error: ordersError } = await orderQuery;

      if (ordersError) throw ordersError;

      const orderMap = new Map<string, number>((orders || []).map(o => [o.venue_id as string, Number(o.display_order)]));

      const baseList: VenueWithOrder[] = (venues || []).map((venue) => ({
        ...venue,
        display_order: orderMap.get(venue.id) ?? undefined,
        city: venue.location.split(',')[0]?.trim(),
      }));

      // Sort by open/closed status first, then by display_order, then fallback by name
      const withOrder = baseList
        .filter(v => typeof v.display_order === 'number')
        .map(v => ({ 
          ...v, 
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
          return a.display_order! - b.display_order!;
        });

      const withoutOrder = baseList
        .filter(v => typeof v.display_order !== 'number')
        .map(v => ({ 
          ...v, 
          _isOpen: isVenueOpenNow(v.working_hours)
        }))
        .sort((a: any, b: any) => {
          // First, sort by open/closed status (open venues first)
          const aOpen = a._isOpen;
          const bOpen = b._isOpen;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1; // Open venues come first
          }
          
          // Within the same open/closed group, sort by name
          return a.name.localeCompare(b.name);
        });

      return [...withOrder, ...withoutOrder];
    },
  });
};

export const useUpdateVenueOrder = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      scopeType, 
      scopeId, 
      items 
    }: { 
      scopeType: string; 
      scopeId: string | null; 
      items: { venue_id: string; display_order: number }[] 
    }) => {
      const orderRecords = items.map(item => ({
        venue_id: item.venue_id,
        scope_type: scopeType,
        scope_id: scopeId,
        display_order: item.display_order
      }));

      const { error } = await supabase
        .from('venue_order')
        .upsert(orderRecords, { onConflict: 'scope_type,scope_id,venue_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-ordering'] });
      toast.success(t('notifications.venueOrder.updated'));
    },
    onError: (error) => {
      toast.error(t('notifications.venueOrder.failedUpdate', { error: error.message }));
    },
  });
};

export const useResetVenueOrder = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ scopeType, scopeId }: { scopeType: string; scopeId: string | null }) => {
      let del = supabase
        .from('venue_order')
        .delete()
        .eq('scope_type', scopeType);

      if (scopeId === null) {
        del = del.or('scope_id.is.null');
      } else {
        del = del.eq('scope_id', scopeId);
      }

      const { error } = await del;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-ordering'] });
      toast.success(t('notifications.venueOrder.reset'));
    },
    onError: (error) => {
      toast.error(t('notifications.venueOrder.failedReset', { error: error.message }));
    },
  });
};

export const useAutoSortVenues = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ 
      scopeType, 
      scopeId, 
      strategy 
    }: { 
      scopeType: string; 
      scopeId: string | null; 
      strategy: 'rating' | 'bookings' | 'newest' 
    }) => {
      const { data: venues, error } = await supabase
        .from('venues')
        .select('id, name, location, is_visible, rating, review_count, created_at, working_hours')
        .eq('is_visible', true);

      if (error) throw error;

      // Filter by scope if applicable
      let list = (venues || []).slice();
      if (scopeType === 'city' && scopeId) {
        list = list.filter(v => v.location.split(',')[0]?.trim() === scopeId);
      }

      // Add open/closed status to each venue
      const venuesWithStatus = list.map(v => ({
        ...v,
        _isOpen: isVenueOpenNow(v.working_hours)
      }));

      if (strategy === 'rating') {
        venuesWithStatus.sort((a: any, b: any) => {
          // First, sort by open/closed status (open venues first)
          const aOpen = a._isOpen;
          const bOpen = b._isOpen;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1; // Open venues come first
          }
          
          // Within the same open/closed group, sort by rating
          return (Number(b.rating || 0) - Number(a.rating || 0)) || ((b.review_count || 0) - (a.review_count || 0));
        });
      } else if (strategy === 'bookings') {
        // Proxy: use review_count when bookings data not aggregated
        venuesWithStatus.sort((a: any, b: any) => {
          // First, sort by open/closed status (open venues first)
          const aOpen = a._isOpen;
          const bOpen = b._isOpen;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1; // Open venues come first
          }
          
          // Within the same open/closed group, sort by bookings (review_count proxy)
          return (Number(b.review_count || 0) - Number(a.review_count || 0)) || (Number(b.rating || 0) - Number(a.rating || 0));
        });
      } else if (strategy === 'newest') {
        venuesWithStatus.sort((a: any, b: any) => {
          // First, sort by open/closed status (open venues first)
          const aOpen = a._isOpen;
          const bOpen = b._isOpen;
          if (aOpen !== bOpen) {
            return aOpen ? -1 : 1; // Open venues come first
          }
          
          // Within the same open/closed group, sort by newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      const orderRecords = venuesWithStatus.map((v, idx) => ({
        venue_id: v.id,
        scope_type: scopeType,
        scope_id: scopeId,
        display_order: idx + 1,
      }));

      const { error: upsertError } = await supabase
        .from('venue_order')
        .upsert(orderRecords, { onConflict: 'scope_type,scope_id,venue_id' });

      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-ordering'] });
      toast.success(t('notifications.venueOrder.autoSorted'));
    },
    onError: (error) => {
      toast.error(t('notifications.venueOrder.failedAutoSort', { error: error.message }));
    },
  });
};