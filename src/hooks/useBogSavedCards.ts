import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface BogSavedCard {
  id: string;
  bog_order_id: string;
  card_brand: string;
  card_last4: string;
  card_mask: string;
  card_exp_month: number;
  card_exp_year: number;
  saved_type: 'recurrent' | 'subscription';
  created_at: string;
  updated_at: string;
}

export const useBogSavedCards = () => {
  const [savedCards, setSavedCards] = useState<BogSavedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSavedCards = async (force = false) => {
    if (!user?.id || (hasFetched && !force) || loading) {
      console.log('useBogSavedCards - Skipping fetch:', { 
        hasUser: !!user?.id, 
        hasFetched, 
        force, 
        loading 
      });
      return;
    }

    console.log('useBogSavedCards - Starting fetch for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bog-get-saved-cards');

      if (error) throw error;

      setSavedCards(data?.savedCards || []);
      setHasFetched(true);
    } catch (error: any) {
      console.error('Error fetching BOG saved cards:', error);
      toast({
        title: "Error",
        description: "Failed to load saved payment methods.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedCard = async (savedCardId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('bog-delete-saved-card', {
        body: {
          savedCardId,
          idempotencyKey: crypto.randomUUID()
        }
      });

      if (error) throw error;

      // Refresh the saved cards list
      await fetchSavedCards(true);

      toast({
        title: "Success",
        description: "Payment method deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting BOG saved card:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id && !hasFetched && !loading) {
      console.log('useBogSavedCards - Fetching saved cards for user:', user.id);
      fetchSavedCards();
    }
  }, [user?.id, hasFetched, loading]);

  return {
    savedCards,
    loading,
    deleteSavedCard,
    refreshSavedCards: () => fetchSavedCards(true),
  };
};
