import { useEffect } from "react";
import { useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useServiceTypes = (): UseQueryResult<{ id: string; name: string; name_en?: string; name_ka?: string; pricing_model: string; table_label?: string; guest_label?: string; table_label_ka?: string; guest_label_ka?: string }[], Error> => {
  const queryClient = useQueryClient();

  const query = useQuery<{ id: string; name: string; name_en?: string; name_ka?: string; pricing_model: string; table_label?: string; guest_label?: string; table_label_ka?: string; guest_label_ka?: string }[]>({
    queryKey: ["service-types-v2"], // Changed to force cache refresh
    queryFn: async () => {
      console.log('🔍 useServiceTypes - Fetching services from database...');
      const { data, error } = await (supabase as any)
        .from("services")
        .select("id, name, name_en, name_ka, pricing_model, is_visible, sort_order, table_label, guest_label, table_label_ka, guest_label_ka")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error('❌ useServiceTypes - Error fetching services:', error);
        throw error;
      }
      const result = (data || []).map((r: any) => ({ 
        id: r.id, 
        name: r.name,
        name_en: r.name_en,
        name_ka: r.name_ka,
        pricing_model: r.pricing_model,
        table_label: r.table_label,
        guest_label: r.guest_label,
        table_label_ka: r.table_label_ka,
        guest_label_ka: r.guest_label_ka
      }));
      console.log('✅ useServiceTypes - Raw data from DB:', data);
      console.log('✅ useServiceTypes - Mapped result:', result);
      return result;
    },
  });

  useEffect(() => {
    const channel = (supabase as any)
      .channel("services-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => queryClient.invalidateQueries({ queryKey: ["service-types-v2"] })
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
