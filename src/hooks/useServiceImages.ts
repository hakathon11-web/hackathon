import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ServiceImage {
  id: string;
  service_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithImages {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  duration: string;
  pricing_model: string;
  is_visible: boolean;
  sort_order: number;
  images: ServiceImage[];
}

// Hook to get all services with their images
export const useServiceImages = () => {
  return useQuery<ServiceWithImages[]>({
    queryKey: ['service-images'],
    queryFn: async () => {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true });

      if (servicesError) throw servicesError;

      const { data: images, error: imagesError } = await supabase
        .from('service_images')
        .select('*')
        .order('sort_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Group images by service_id
      const imagesByService = images.reduce((acc, image) => {
        if (!acc[image.service_id]) {
          acc[image.service_id] = [];
        }
        acc[image.service_id].push(image);
        return acc;
      }, {} as Record<string, ServiceImage[]>);

      // Combine services with their images
      return services.map(service => ({
        ...service,
        images: imagesByService[service.id] || []
      }));
    },
  });
};

// Hook to get images for a specific service
export const useServiceImagesByServiceId = (serviceId: string) => {
  return useQuery<ServiceImage[]>({
    queryKey: ['service-images', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_images')
        .select('*')
        .eq('service_id', serviceId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!serviceId,
  });
};

// Hook to get primary image for a service
export const useServicePrimaryImage = (serviceId: string) => {
  return useQuery<ServiceImage | null>({
    queryKey: ['service-primary-image', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_images')
        .select('*')
        .eq('service_id', serviceId)
        .eq('is_primary', true)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (error) {
        // Handle both PGRST116 (not found) and other errors gracefully
        console.warn('Service primary image query error:', error);
        return null;
      }
      return data || null;
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry failed requests
  });
};

// Hook to upload a new service image
export const useUploadServiceImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      serviceId,
      imageUrl,
      altText,
      sortOrder = 0,
      isPrimary = false
    }: {
      serviceId: string;
      imageUrl: string;
      altText?: string;
      sortOrder?: number;
      isPrimary?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('service_images')
        .insert({
          service_id: serviceId,
          image_url: imageUrl,
          alt_text: altText,
          sort_order: sortOrder,
          is_primary: isPrimary
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch service images
      queryClient.invalidateQueries({ queryKey: ['service-images'] });
      queryClient.invalidateQueries({ queryKey: ['service-images', data.service_id] });
      queryClient.invalidateQueries({ queryKey: ['service-primary-image', data.service_id] });
      
      toast({
        title: "Success",
        description: "Service image uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload service image",
        variant: "destructive"
      });
    },
  });
};

// Hook to update a service image
export const useUpdateServiceImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      imageId,
      updates
    }: {
      imageId: string;
      updates: Partial<Pick<ServiceImage, 'alt_text' | 'sort_order' | 'is_primary'>>;
    }) => {
      const { data, error } = await supabase
        .from('service_images')
        .update(updates)
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch service images
      queryClient.invalidateQueries({ queryKey: ['service-images'] });
      queryClient.invalidateQueries({ queryKey: ['service-images', data.service_id] });
      queryClient.invalidateQueries({ queryKey: ['service-primary-image', data.service_id] });
      
      toast({
        title: "Success",
        description: "Service image updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service image",
        variant: "destructive"
      });
    },
  });
};

// Hook to delete a service image
export const useDeleteServiceImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('service_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch service images
      queryClient.invalidateQueries({ queryKey: ['service-images'] });
      
      toast({
        title: "Success",
        description: "Service image deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service image",
        variant: "destructive"
      });
    },
  });
};
