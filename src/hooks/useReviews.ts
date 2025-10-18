import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Review {
  id: string;
  user_id: string;
  venue_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
    email: string;
  } | null;
  venues?: {
    name: string;
  };
}

export interface CreateReviewData {
  venue_id: string;
  booking_id: string;
  rating: number;
  comment?: string;
}

// Get reviews for a venue
export const useVenueReviews = (venueId: string) => {
  return useQuery({
    queryKey: ['venue-reviews', venueId],
    queryFn: async () => {
      try {
        // First get the reviews
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('venue_id', venueId)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          throw reviewsError;
        }

        if (!reviews || reviews.length === 0) {
          return [];
        }

        // Then get the profiles for the user IDs
        const userIds = [...new Set(reviews.map(review => review.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', userIds);

        if (profilesError) {
          throw profilesError;
        }

        // Create a map of user_id to profile data
        const profileMap = new Map();
        (profiles || []).forEach(profile => {
          profileMap.set(profile.id, profile);
        });

        // Combine reviews with profile data
        const reviewsWithProfiles = reviews.map(review => ({
          ...review,
          profiles: profileMap.get(review.user_id) || null
        }));

        return reviewsWithProfiles as Review[];
      } catch (err) {
        throw err;
      }
    },
    enabled: !!venueId,
  });
};

// Get user's review for a specific booking
export const useUserReviewForBooking = (bookingId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-review', bookingId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as Review | null;
    },
    enabled: !!user?.id && !!bookingId,
  });
};

// Get all reviews by the current user
export const useUserReviews = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          venues (
            name,
            images
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
    enabled: !!user?.id,
  });
};

// Get reviewed booking IDs for efficient checking
export const useReviewedBookingIds = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reviewed-booking-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      
      const { data, error } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Return a Set for O(1) lookup performance
      return new Set(data?.map(review => review.booking_id) || []);
    },
    enabled: !!user?.id,
  });
};

// Create a new review
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (reviewData: CreateReviewData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          ...reviewData,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['venue-reviews', data.venue_id] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewed-booking-ids'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      
      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update an existing review
export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; rating: number; comment?: string }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['venue-reviews', data.venue_id] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewed-booking-ids'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      
      toast({
        title: "Review updated!",
        description: "Your review has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update review",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Delete a review
export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      return reviewId;
    },
    onSuccess: (reviewId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['venue-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewed-booking-ids'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      
      toast({
        title: "Review deleted",
        description: "Your review has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete review",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Get completed bookings that haven't been reviewed yet
export const useUnreviewedBookings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['unreviewed-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get completed bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            name,
            images
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;
      
      // Get existing reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('user_id', user.id);

      if (reviewsError) throw reviewsError;
      
      const reviewedBookingIds = new Set(reviews.map(r => r.booking_id));
      
      // Filter out bookings that have been reviewed
      return (bookings || []).filter(booking => !reviewedBookingIds.has(booking.id));
    },
    enabled: !!user?.id,
  });
};
