import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueProduct {
  id: string;
  venue_id: string;
  name: string;
  price: number;
  images: string[];
  is_available: boolean;
  stock_quantity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVenueProductData {
  venue_id: string;
  name: string;
  price: number;
  images?: string[];
  is_available?: boolean;
  stock_quantity?: number;
}

export interface UpdateVenueProductData {
  name?: string;
  price?: number;
  images?: string[];
  is_available?: boolean;
  stock_quantity?: number;
}

// Fetch products for a specific venue
export const useVenueProducts = (venueId: string) => {
  return useQuery({
    queryKey: ['venue-products', venueId],
    queryFn: async (): Promise<VenueProduct[]> => {
      if (!venueId) return [];
      
      const { data, error } = await supabase
        .from('venue_products')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching venue products:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!venueId,
  });
};

// Create a new product
export const useCreateVenueProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: CreateVenueProductData): Promise<VenueProduct> => {
      const { data, error } = await supabase
        .from('venue_products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        console.error('Error creating venue product:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (newProduct) => {
      // Invalidate and refetch venue products
      queryClient.invalidateQueries({ queryKey: ['venue-products', newProduct.venue_id] });
    },
  });
};

// Update an existing product
export const useUpdateVenueProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: UpdateVenueProductData 
    }): Promise<VenueProduct> => {
      const { data, error } = await supabase
        .from('venue_products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating venue product:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (updatedProduct) => {
      // Invalidate and refetch venue products
      queryClient.invalidateQueries({ queryKey: ['venue-products', updatedProduct.venue_id] });
    },
  });
};

// Delete a product
export const useDeleteVenueProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, venueId }: { id: string; venueId: string }): Promise<void> => {
      const { error } = await supabase
        .from('venue_products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting venue product:', error);
        throw error;
      }
    },
    onSuccess: (_, { venueId }) => {
      // Invalidate and refetch venue products
      queryClient.invalidateQueries({ queryKey: ['venue-products', venueId] });
    },
  });
};

