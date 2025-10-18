import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GuestBooking {
  id: string;
  booking_date: string;
  status: string;
  total_price: number;
  user_email: string | null;
  venues?: {
    name?: string;
    location?: string | null;
    images?: any;
  } | null;
  booking_services?: Array<{
    id: string;
    service_id: string;
    arrival_datetime: string | null;
    departure_datetime: string | null;
    guest_count: number | null;
    table_configurations: any;
    price_per_hour: number | null;
    duration_hours: number | null;
    subtotal: number | null;
    discounted_subtotal: number | null;
    venue_services?: {
      services?: {
        name?: string;
        pricing_model?: string | null;
        table_label?: string | null;
        guest_label?: string | null;
        table_label_ka?: string | null;
        guest_label_ka?: string | null;
      } | null;
    } | null;
  }>;
}

export const useGuestEmail = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const email = localStorage.getItem("guestEmail");
    return email && email.includes("@") ? email : null;
  } catch {
    return null;
  }
};

export const useGuestBookings = () => {
  const email = useGuestEmail();

  return useQuery({
    queryKey: ["guest-bookings", email],
    queryFn: async () => {
      if (!email) return [] as GuestBooking[];

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          venues (
            name,
            location,
            images
          ),
          booking_services(
            id,
            service_id,
            arrival_datetime,
            departure_datetime,
            guest_count,
            table_configurations,
            price_per_hour,
            duration_hours,
            subtotal,
            discounted_subtotal,
            venue_services(
              services (
                name,
                pricing_model,
                table_label,
                guest_label,
                table_label_ka,
                guest_label_ka
              )
            )
          )
        `)
        .eq("user_email", email)
        .is("user_id", null)
        .eq("hidden_from_widget", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((booking: any) => ({
        ...booking,
        booking_services: (booking.booking_services || []).map((service: any) => ({
          ...service,
          table_configurations:
            typeof service.table_configurations === "string"
              ? JSON.parse(service.table_configurations)
              : service.table_configurations,
        })),
      })) as GuestBooking[];
    },
    enabled: !!email,
  });
};


