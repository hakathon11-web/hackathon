
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_services: {
        Row: {
          arrival_datetime: string
          booking_id: string
          created_at: string
          departure_datetime: string
          duration_hours: number
          guest_count: number
          id: string
          price_per_hour: number
          service_id: string
          subtotal: number
          table_configurations: Json | null
          updated_at: string
        }
        Insert: {
          arrival_datetime: string
          booking_id: string
          created_at?: string
          departure_datetime: string
          duration_hours?: number
          guest_count?: number
          id?: string
          price_per_hour?: number
          service_id: string
          subtotal?: number
          table_configurations?: Json | null
          updated_at?: string
        }
        Update: {
          arrival_datetime?: string
          booking_id?: string
          created_at?: string
          departure_datetime?: string
          duration_hours?: number
          guest_count?: number
          id?: string
          price_per_hour?: number
          service_id?: string
          subtotal?: number
          table_configurations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "venue_services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string | null
          hidden_from_widget: boolean
          id: string
          rejection_message: string | null
          service_id: string | null
          special_requests: string | null
          status: string | null
          status_updated_at: string | null
          total_price: number
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          booking_date: string
          created_at?: string | null
          hidden_from_widget?: boolean
          id?: string
          rejection_message?: string | null
          service_id?: string | null
          special_requests?: string | null
          status?: string | null
          status_updated_at?: string | null
          total_price: number
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          booking_date?: string
          created_at?: string | null
          hidden_from_widget?: boolean
          id?: string
          rejection_message?: string | null
          service_id?: string | null
          special_requests?: string | null
          status?: string | null
          status_updated_at?: string | null
          total_price?: number
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "venue_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_payment_methods: {
        Row: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          created_at: string
          id: string
          is_default: boolean
          stripe_payment_method_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          created_at?: string
          id?: string
          is_default?: boolean
          stripe_payment_method_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string
          card_exp_month?: number
          card_exp_year?: number
          card_last4?: string
          created_at?: string
          id?: string
          is_default?: boolean
          stripe_payment_method_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          service_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          service_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          service_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration: string
          id: string
          is_visible: boolean
          name: string
          pricing_model: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_visible?: boolean
          name: string
          pricing_model?: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          is_visible?: boolean
          name?: string
          pricing_model?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          allow_guest_bookings: boolean
          auto_approval_enabled: boolean
          booking_timeout_minutes: number
          pre_arrival_reminder_hours: number
          min_advance_booking_hours_for_reminder: number
          partner_booking_request_emails_enabled: boolean
          created_at: string
          default_commission_rate: number
          email_notifications_enabled: boolean
          id: string
          maintenance_mode: boolean
          max_advance_booking_days: number
          minimum_booking_amount: number
          require_email_verification: boolean
          review_moderation_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_guest_bookings?: boolean
          auto_approval_enabled?: boolean
          booking_timeout_minutes?: number
          pre_arrival_reminder_hours?: number
          min_advance_booking_hours_for_reminder?: number
          created_at?: string
          default_commission_rate?: number
          email_notifications_enabled?: boolean
          id?: string
          maintenance_mode?: boolean
          max_advance_booking_days?: number
          minimum_booking_amount?: number
          require_email_verification?: boolean
          review_moderation_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_guest_bookings?: boolean
          auto_approval_enabled?: boolean
          booking_timeout_minutes?: number
          pre_arrival_reminder_hours?: number
          min_advance_booking_hours_for_reminder?: number
          created_at?: string
          default_commission_rate?: number
          email_notifications_enabled?: boolean
          id?: string
          maintenance_mode?: boolean
          max_advance_booking_days?: number
          minimum_booking_amount?: number
          require_email_verification?: boolean
          review_moderation_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      venue_order: {
        Row: {
          created_at: string
          display_order: number
          id: string
          scope_id: string | null
          scope_type: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          scope_id?: string | null
          scope_type: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_order_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_services: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string
          free_hour_discounts: Json | null
          group_discounts: Json | null
          guest_pricing_rules: Json | null
          id: string
          max_tables: number
          name: string
          overall_discount_enabled: boolean | null
          overall_discount_percent: number | null
          price: number
          pricing_model: string | null
          service_id: string
          service_type: string | null
          timeslot_discounts: Json | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string
          free_hour_discounts?: Json | null
          group_discounts?: Json | null
          guest_pricing_rules?: Json | null
          id?: string
          max_tables?: number
          name: string
          overall_discount_enabled?: boolean | null
          overall_discount_percent?: number | null
          price: number
          pricing_model?: string | null
          service_id: string
          service_type?: string | null
          timeslot_discounts?: Json | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string
          free_hour_discounts?: Json | null
          group_discounts?: Json | null
          guest_pricing_rules?: Json | null
          id?: string
          max_tables?: number
          name?: string
          overall_discount_enabled?: boolean | null
          overall_discount_percent?: number | null
          price?: number
          pricing_model?: string | null
          service_id?: string
          service_type?: string | null
          timeslot_discounts?: Json | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_services_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          amenities: string[] | null
          approval_status: string
          created_at: string | null
          description: string | null
          district: string | null
          free_hour_discounts: Json | null
          group_discounts: Json | null
          id: string
          is_visible: boolean
          latitude: number | null
          location: string
          longitude: number | null
          main_category: string
          max_booking_days_in_advance: number | null
          name: string
          overall_discount_percent: number | null
          overall_discount_service_ids: string[] | null
          partner_id: string | null
          price: number
          rating: number | null
          rejected_reason: string | null
          review_count: number | null
          timeslot_discounts: Json | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          amenities?: string[] | null
          approval_status?: string
          created_at?: string | null
          description?: string | null
          district?: string | null
          free_hour_discounts?: Json | null
          group_discounts?: Json | null
          id?: string
          is_visible?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          main_category?: string
          max_booking_days_in_advance?: number | null
          name: string
          overall_discount_percent?: number | null
          overall_discount_service_ids?: string[] | null
          partner_id?: string | null
          price?: number
          rating?: number | null
          rejected_reason?: string | null
          review_count?: number | null
          timeslot_discounts?: Json | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          amenities?: string[] | null
          approval_status?: string
          created_at?: string | null
          description?: string | null
          district?: string | null
          free_hour_discounts?: Json | null
          group_discounts?: Json | null
          id?: string
          is_visible?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          main_category?: string
          max_booking_days_in_advance?: number | null
          name?: string
          overall_discount_percent?: number | null
          overall_discount_service_ids?: string[] | null
          partner_id?: string | null
          price?: number
          rating?: number | null
          rejected_reason?: string | null
          review_count?: number | null
          timeslot_discounts?: Json | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          username: string
          password_hash: string
          venue_id: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          venue_id: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          venue_id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employees_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      venue_products: {
        Row: {
          id: string
          venue_id: string
          name: string
          price: number
          images: string[]
          is_available: boolean
          stock_quantity: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          name: string
          price: number
          images?: string[]
          is_available?: boolean
          stock_quantity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          name?: string
          price?: number
          images?: string[]
          is_available?: boolean
          stock_quantity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_products_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_system_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          allow_guest_bookings: boolean
          auto_approval_enabled: boolean
          booking_timeout_minutes: number
          pre_arrival_reminder_hours: number
          min_advance_booking_hours_for_reminder: number
          partner_booking_request_emails_enabled: boolean
          created_at: string
          default_commission_rate: number
      get_system_settings_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          allow_guest_bookings: boolean
          auto_approval_enabled: boolean
          booking_timeout_minutes: number
          pre_arrival_reminder_hours: number
          min_advance_booking_hours_for_reminder: number
          created_at: string
          default_commission_rate: number
          email_notifications_enabled: boolean
          maintenance_mode: boolean
          max_advance_booking_days: number
          minimum_booking_amount: number
          require_email_verification: boolean
          review_moderation_enabled: boolean
          updated_at: string
          id: string
        }[]
      }
          email_notifications_enabled: boolean
          id: string
          maintenance_mode: boolean
          max_advance_booking_days: number
          minimum_booking_amount: number
          require_email_verification: boolean
          review_moderation_enabled: boolean
          updated_at: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      sync_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_expired_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
