import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useSavedPaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPaymentMethods = async (force = false) => {
    if (!user?.id || (hasFetched && !force) || loading) {
      console.log('useSavedPaymentMethods - Skipping fetch:', { 
        hasUser: !!user?.id, 
        hasFetched, 
        force, 
        loading 
      });
      return;
    }

    console.log('useSavedPaymentMethods - Starting fetch for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPaymentMethods(data || []);
      setHasFetched(true);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load saved payment methods.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePaymentMethod = async (paymentMethodId: string, isDefault: boolean = false) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('save-payment-method', {
        body: {
          paymentMethodId,
          isDefault,
        },
      });

      if (error) throw error;

      // Refresh the payment methods list
      await fetchPaymentMethods(true);

      toast({
        title: "Success",
        description: "Payment method saved successfully.",
      });

      return data.paymentMethod;
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save payment method.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_payment_methods')
        .delete()
        .eq('id', paymentMethodId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh the payment methods list
      await fetchPaymentMethods(true);

      toast({
        title: "Success",
        description: "Payment method deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method.",
        variant: "destructive",
      });
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!user) return;

    try {
      // First, remove default status from all payment methods
      await supabase
        .from('saved_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected payment method as default
      const { error } = await supabase
        .from('saved_payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh the payment methods list
      await fetchPaymentMethods(true);

      toast({
        title: "Success",
        description: "Default payment method updated.",
      });
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method.",
        variant: "destructive",
      });
    }
  };

  const createSetupIntent = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('create-setup-intent');

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment method setup.",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    if (user?.id && !hasFetched && !loading) {
      console.log('useSavedPaymentMethods - Fetching payment methods for user:', user.id);
      fetchPaymentMethods();
    }
  }, [user?.id, hasFetched, loading]); // Include hasFetched and loading in dependencies

  return {
    paymentMethods,
    loading,
    savePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    createSetupIntent,
    refreshPaymentMethods: () => fetchPaymentMethods(true),
  };
};