import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServiceData {
  id: string;
  name: string;
  name_en?: string;
  name_ka?: string;
}

// Returns a list of all available services with translation data
export const useAllServices = () => {
  return useQuery<ServiceData[]>({
    queryKey: ["all-services-list-with-translations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, name_en, name_ka")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return (data || []) as ServiceData[];
    },
  });
};

// Legacy hook that returns just service names (for backward compatibility)
export const useAllServiceNames = () => {
  return useQuery<string[]>({
    queryKey: ["all-services-names-only"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("name")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return (data || []).map(service => service.name);
    },
  });
};

