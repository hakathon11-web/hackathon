import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Amenity {
  id: string;
  name: string;
  icon?: string;
}

export const useAmenities = () => {
  return useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      // For now, return default amenities since this table doesn't exist yet
      return [
        { id: '1', name: 'WiFi', icon: '📶' },
        { id: '2', name: 'Parking', icon: '🅿️' },
        { id: '3', name: 'Air Conditioning', icon: '❄️' },
        { id: '4', name: 'Kitchen', icon: '🍽️' },
        { id: '5', name: 'Projector', icon: '📽️' }
      ] as Amenity[];
    },
  });
};