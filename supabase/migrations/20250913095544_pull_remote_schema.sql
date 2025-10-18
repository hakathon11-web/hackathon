create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid,
    "action" text not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "entity_name" text,
    "diff" jsonb,
    "metadata" jsonb
);


alter table "public"."audit_logs" enable row level security;

create table "public"."booking_services" (
    "id" uuid not null default gen_random_uuid(),
    "booking_id" uuid not null,
    "service_id" uuid not null,
    "arrival_time" time without time zone not null,
    "departure_time" time without time zone not null,
    "guest_count" integer not null default 1,
    "price_per_hour" numeric not null default 0,
    "duration_hours" numeric not null default 1,
    "subtotal" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "table_configurations" jsonb default '[]'::jsonb
);


alter table "public"."booking_services" enable row level security;

create table "public"."bookings" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "venue_id" uuid,
    "service_id" uuid,
    "booking_date" date not null,
    "total_price" numeric(10,2) not null,
    "status" text default 'pending'::text,
    "special_requests" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "user_email" text,
    "status_updated_at" timestamp with time zone,
    "hidden_from_widget" boolean not null default false
);


alter table "public"."bookings" enable row level security;

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "icon" text,
    "sort_order" integer not null default 0,
    "is_visible" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."categories" enable row level security;

create table "public"."contact_messages" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "subject" text not null,
    "message" text not null,
    "status" text default 'new'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."contact_messages" enable row level security;

create table "public"."employees" (
    "id" uuid not null default gen_random_uuid(),
    "username" text not null,
    "password_hash" text not null,
    "venue_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default true
);


alter table "public"."employees" enable row level security;

create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "booking_id" uuid,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "read" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "scheduled_for" timestamp with time zone,
    "color" text default 'blue'::text
);


alter table "public"."notifications" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "role" text not null default 'customer'::text,
    "phone_number" text
);


alter table "public"."profiles" enable row level security;

create table "public"."reviews" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "venue_id" uuid not null,
    "rating" integer not null,
    "comment" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "booking_id" uuid
);


alter table "public"."reviews" enable row level security;

create table "public"."saved_payment_methods" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_payment_method_id" text not null,
    "card_brand" text not null,
    "card_last4" text not null,
    "card_exp_month" integer not null,
    "card_exp_year" integer not null,
    "is_default" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."saved_payment_methods" enable row level security;

create table "public"."services" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "type" text not null,
    "description" text,
    "duration" text not null default '1 hour'::text,
    "pricing_model" text not null default 'hourly'::text,
    "is_visible" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."services" enable row level security;

create table "public"."system_settings" (
    "id" uuid not null default gen_random_uuid(),
    "booking_timeout_minutes" integer not null default 5,
    "auto_approval_enabled" boolean not null default false,
    "email_notifications_enabled" boolean not null default true,
    "review_moderation_enabled" boolean not null default true,
    "require_email_verification" boolean not null default true,
    "allow_guest_bookings" boolean not null default false,
    "default_commission_rate" numeric(5,2) not null default 15.00,
    "minimum_booking_amount" numeric(10,2) not null default 25.00,
    "max_advance_booking_days" integer not null default 90,
    "maintenance_mode" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."system_settings" enable row level security;

create table "public"."venue_order" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "scope_type" text not null,
    "scope_id" text,
    "display_order" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."venue_order" enable row level security;

create table "public"."venue_services" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid,
    "name" text not null,
    "price" numeric(10,2) not null,
    "duration" text not null default '1 hour'::text,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "service_type" text,
    "images" text[] default '{}'::text[],
    "guest_pricing_rules" jsonb default '[]'::jsonb,
    "overall_discount_enabled" boolean default false,
    "overall_discount_percent" numeric default 0,
    "free_hour_discounts" jsonb default '[]'::jsonb,
    "group_discounts" jsonb default '[]'::jsonb,
    "timeslot_discounts" jsonb default '[]'::jsonb,
    "max_tables" integer not null default 1,
    "pricing_model" text default 'guest_wise'::text,
    "service_id" uuid not null
);


alter table "public"."venue_services" enable row level security;

create table "public"."venues" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "location" text not null,
    "price" numeric(10,2) not null default 0,
    "rating" numeric(3,2) default 0,
    "review_count" integer default 0,
    "images" text[] default '{}'::text[],
    "amenities" text[] default '{}'::text[],
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_visible" boolean not null default true,
    "partner_id" uuid,
    "district" text,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "approval_status" text not null default 'pending'::text,
    "rejected_reason" text,
    "working_hours" jsonb default '{"friday": {"open": "09:00", "close": "22:00", "closed": false}, "monday": {"open": "09:00", "close": "22:00", "closed": false}, "sunday": {"open": "09:00", "close": "22:00", "closed": false}, "tuesday": {"open": "09:00", "close": "22:00", "closed": false}, "saturday": {"open": "09:00", "close": "22:00", "closed": false}, "thursday": {"open": "09:00", "close": "22:00", "closed": false}, "wednesday": {"open": "09:00", "close": "22:00", "closed": false}}'::jsonb
);


alter table "public"."venues" enable row level security;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX booking_services_pkey ON public.booking_services USING btree (id);

CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE INDEX contact_messages_created_at_idx ON public.contact_messages USING btree (created_at DESC);

CREATE UNIQUE INDEX contact_messages_pkey ON public.contact_messages USING btree (id);

CREATE INDEX contact_messages_status_idx ON public.contact_messages USING btree (status);

CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id);

CREATE INDEX employees_username_idx ON public.employees USING btree (username);

CREATE UNIQUE INDEX employees_username_key ON public.employees USING btree (username);

CREATE INDEX employees_venue_id_idx ON public.employees USING btree (venue_id);

CREATE INDEX idx_bookings_hidden_from_widget ON public.bookings USING btree (user_id, hidden_from_widget) WHERE (hidden_from_widget = true);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role) WHERE (role = 'admin'::text);

CREATE INDEX idx_reviews_booking_id ON public.reviews USING btree (booking_id);

CREATE INDEX idx_saved_payment_methods_default ON public.saved_payment_methods USING btree (user_id, is_default) WHERE (is_default = true);

CREATE INDEX idx_saved_payment_methods_user_id ON public.saved_payment_methods USING btree (user_id);

CREATE INDEX idx_services_visible_sort ON public.services USING btree (is_visible, sort_order);

CREATE INDEX idx_venue_services_service_id ON public.venue_services USING btree (service_id);

CREATE INDEX idx_venues_location ON public.venues USING btree (latitude, longitude);

CREATE INDEX idx_venues_partner_id ON public.venues USING btree (partner_id);

CREATE INDEX idx_venues_working_hours ON public.venues USING gin (working_hours);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX profiles_phone_number_idx ON public.profiles USING btree (phone_number);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

CREATE UNIQUE INDEX saved_payment_methods_pkey ON public.saved_payment_methods USING btree (id);

CREATE UNIQUE INDEX saved_payment_methods_stripe_payment_method_id_key ON public.saved_payment_methods USING btree (stripe_payment_method_id);

CREATE UNIQUE INDEX services_name_key ON public.services USING btree (name);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);

CREATE UNIQUE INDEX venue_order_pkey ON public.venue_order USING btree (id);

CREATE UNIQUE INDEX venue_order_scope_type_scope_id_display_order_key ON public.venue_order USING btree (scope_type, scope_id, display_order);

CREATE UNIQUE INDEX venue_order_scope_type_scope_id_venue_id_key ON public.venue_order USING btree (scope_type, scope_id, venue_id);

CREATE UNIQUE INDEX venue_order_unique_scope ON public.venue_order USING btree (scope_type, scope_id, venue_id);

CREATE UNIQUE INDEX venue_services_pkey ON public.venue_services USING btree (id);

CREATE UNIQUE INDEX venues_pkey ON public.venues USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."booking_services" add constraint "booking_services_pkey" PRIMARY KEY using index "booking_services_pkey";

alter table "public"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."contact_messages" add constraint "contact_messages_pkey" PRIMARY KEY using index "contact_messages_pkey";

alter table "public"."employees" add constraint "employees_pkey" PRIMARY KEY using index "employees_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."saved_payment_methods" add constraint "saved_payment_methods_pkey" PRIMARY KEY using index "saved_payment_methods_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."system_settings" add constraint "system_settings_pkey" PRIMARY KEY using index "system_settings_pkey";

alter table "public"."venue_order" add constraint "venue_order_pkey" PRIMARY KEY using index "venue_order_pkey";

alter table "public"."venue_services" add constraint "venue_services_pkey" PRIMARY KEY using index "venue_services_pkey";

alter table "public"."venues" add constraint "venues_pkey" PRIMARY KEY using index "venues_pkey";

alter table "public"."booking_services" add constraint "booking_services_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE not valid;

alter table "public"."booking_services" validate constraint "booking_services_booking_id_fkey";

alter table "public"."booking_services" add constraint "booking_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES venue_services(id) ON DELETE CASCADE not valid;

alter table "public"."booking_services" validate constraint "booking_services_service_id_fkey";

alter table "public"."bookings" add constraint "bookings_service_id_fkey" FOREIGN KEY (service_id) REFERENCES venue_services(id) ON DELETE SET NULL not valid;

alter table "public"."bookings" validate constraint "bookings_service_id_fkey";

alter table "public"."bookings" add constraint "bookings_special_requests_length_check" CHECK ((length(special_requests) <= 500)) not valid;

alter table "public"."bookings" validate constraint "bookings_special_requests_length_check";

alter table "public"."bookings" add constraint "bookings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'expired'::text, 'waiting_for_review'::text, 'reviewed'::text]))) not valid;

alter table "public"."bookings" validate constraint "bookings_status_check";

alter table "public"."bookings" add constraint "bookings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bookings" validate constraint "bookings_user_id_fkey";

alter table "public"."bookings" add constraint "bookings_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE not valid;

alter table "public"."bookings" validate constraint "bookings_venue_id_fkey";

alter table "public"."categories" add constraint "categories_name_key" UNIQUE using index "categories_name_key";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."contact_messages" add constraint "contact_messages_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text]))) not valid;

alter table "public"."contact_messages" validate constraint "contact_messages_status_check";

alter table "public"."employees" add constraint "employees_username_key" UNIQUE using index "employees_username_key";

alter table "public"."employees" add constraint "employees_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "employees_venue_id_fkey";

alter table "public"."notifications" add constraint "notifications_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."notifications" validate constraint "notifications_booking_id_fkey";

alter table "public"."notifications" add constraint "notifications_color_check" CHECK ((color = ANY (ARRAY['yellow'::text, 'green'::text, 'red'::text, 'blue'::text, 'gray'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_color_check";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['booking_request_sent'::text, 'booking_confirmation'::text, 'booking_rejected'::text, 'booking_reminder_15min'::text, 'booking_reminder_1hour'::text, 'booking_reminder_2hours'::text, 'review_request'::text, '1_hour_before'::text, '2_hours_before'::text, '10_minutes_before'::text, 'admin_message'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['customer'::text, 'partner'::text, 'admin'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."reviews" add constraint "reviews_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(id) not valid;

alter table "public"."reviews" validate constraint "reviews_booking_id_fkey";

alter table "public"."reviews" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_rating_check";

alter table "public"."reviews" add constraint "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_user_id_fkey";

alter table "public"."reviews" add constraint "reviews_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_venue_id_fkey";

alter table "public"."saved_payment_methods" add constraint "saved_payment_methods_stripe_payment_method_id_key" UNIQUE using index "saved_payment_methods_stripe_payment_method_id_key";

alter table "public"."saved_payment_methods" add constraint "saved_payment_methods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."saved_payment_methods" validate constraint "saved_payment_methods_user_id_fkey";

alter table "public"."services" add constraint "services_name_key" UNIQUE using index "services_name_key";

alter table "public"."venue_order" add constraint "venue_order_scope_type_check" CHECK ((scope_type = ANY (ARRAY['global'::text, 'category'::text, 'city'::text]))) not valid;

alter table "public"."venue_order" validate constraint "venue_order_scope_type_check";

alter table "public"."venue_order" add constraint "venue_order_scope_type_scope_id_display_order_key" UNIQUE using index "venue_order_scope_type_scope_id_display_order_key";

alter table "public"."venue_order" add constraint "venue_order_scope_type_scope_id_venue_id_key" UNIQUE using index "venue_order_scope_type_scope_id_venue_id_key";

alter table "public"."venue_order" add constraint "venue_order_unique_scope" UNIQUE using index "venue_order_unique_scope";

alter table "public"."venue_order" add constraint "venue_order_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE not valid;

alter table "public"."venue_order" validate constraint "venue_order_venue_id_fkey";

alter table "public"."venue_services" add constraint "venue_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE not valid;

alter table "public"."venue_services" validate constraint "venue_services_service_id_fkey";

alter table "public"."venue_services" add constraint "venue_services_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE not valid;

alter table "public"."venue_services" validate constraint "venue_services_venue_id_fkey";

alter table "public"."venues" add constraint "venues_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES auth.users(id) not valid;

alter table "public"."venues" validate constraint "venues_partner_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_venue_approval_control()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.approval_status := 'pending';
      NEW.is_visible := false;
      NEW.rejected_reason := NULL;
      NEW.partner_id := COALESCE(NEW.partner_id, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() THEN
      -- Partners cannot change approval-related fields
      NEW.approval_status := OLD.approval_status;
      NEW.is_visible := OLD.is_visible;
      NEW.rejected_reason := OLD.rejected_reason;
      NEW.partner_id := OLD.partner_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_system_settings()
 RETURNS TABLE(id uuid, booking_timeout_minutes integer, auto_approval_enabled boolean, email_notifications_enabled boolean, review_moderation_enabled boolean, require_email_verification boolean, allow_guest_bookings boolean, default_commission_rate numeric, minimum_booking_amount numeric, max_advance_booking_days integer, maintenance_mode boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ss."id",
        ss."booking_timeout_minutes",
        ss."auto_approval_enabled",
        ss."email_notifications_enabled",
        ss."review_moderation_enabled",
        ss."require_email_verification",
        ss."allow_guest_bookings",
        ss."default_commission_rate",
        ss."minimum_booking_amount",
        ss."max_advance_booking_days",
        ss."maintenance_mode",
        ss."created_at",
        ss."updated_at"
    FROM "public"."system_settings" ss
    ORDER BY ss."created_at" DESC
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    -- SECURITY FIX: Remove automatic admin creation
    -- All new users now get 'customer' role by default
    -- Admin privileges must be granted manually through secure processes
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Use a direct query that bypasses RLS by running as the function owner (postgres)
  -- This is safe because the function itself controls access and only returns boolean
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_venue_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_email text;
begin
  select email into actor_email from public.profiles where id = auth.uid();
  if actor_email is null then
    actor_email := auth.jwt() ->> 'email';
  end if;
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, entity_name, diff, metadata)
    values (
      auth.uid(),
      'venue.create',
      'venue',
      new.id,
      new.name,
      jsonb_build_object('after', to_jsonb(new)),
      jsonb_build_object('user_email', actor_email)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, entity_name, diff, metadata)
    values (
      auth.uid(),
      case
        when new.approval_status is distinct from old.approval_status and new.approval_status = 'approved' then 'venue.approve'
        when new.approval_status is distinct from old.approval_status and new.approval_status = 'rejected' then 'venue.reject'
        else 'venue.update'
      end,
      'venue',
      new.id,
      new.name,
      jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)),
      jsonb_build_object('user_email', actor_email)
    );
    return new;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ping()
 RETURNS text
 LANGUAGE sql
AS $function$
  SELECT 'pong'::text;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_profile()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Get current user info
  SELECT * INTO user_record FROM auth.users WHERE id = auth.uid();
  
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_record.id,
    user_record.email,
    COALESCE(user_record.raw_user_meta_data->>'full_name', 'Nika Tsereteli'),
    CASE 
      WHEN user_record.email = 'nika.tsereteli@iset.ge' THEN 'admin'
      ELSE COALESCE(user_record.raw_user_meta_data->>'role', 'customer')
    END,
    user_record.created_at,
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_booking_status_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update status_updated_at if the status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expired_bookings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP;
    updated_count INTEGER;
BEGIN
    -- Get timeout from system settings
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    LIMIT 1;
    
    -- Calculate cutoff time in Tbilisi timezone (UTC+4)
    -- Convert current time to Tbilisi timezone before calculating cutoff
    cutoff_time := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tbilisi') - INTERVAL '1 minute' * timeout_minutes;
    
    -- Update expired bookings
    UPDATE bookings 
    SET 
        status = 'expired',
        status_updated_at = NOW()
    WHERE 
        status = 'pending' 
        AND created_at < cutoff_time;
    
    -- Get count of updated bookings
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the update (optional)
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % expired bookings', updated_count;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_venue_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update venue rating and review count for the affected venue
  UPDATE venues 
  SET 
    rating = COALESCE((
      SELECT AVG(rating)::numeric(3,2)
      FROM reviews 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)::integer
      FROM reviews 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."booking_services" to "anon";

grant insert on table "public"."booking_services" to "anon";

grant references on table "public"."booking_services" to "anon";

grant select on table "public"."booking_services" to "anon";

grant trigger on table "public"."booking_services" to "anon";

grant truncate on table "public"."booking_services" to "anon";

grant update on table "public"."booking_services" to "anon";

grant delete on table "public"."booking_services" to "authenticated";

grant insert on table "public"."booking_services" to "authenticated";

grant references on table "public"."booking_services" to "authenticated";

grant select on table "public"."booking_services" to "authenticated";

grant trigger on table "public"."booking_services" to "authenticated";

grant truncate on table "public"."booking_services" to "authenticated";

grant update on table "public"."booking_services" to "authenticated";

grant delete on table "public"."booking_services" to "service_role";

grant insert on table "public"."booking_services" to "service_role";

grant references on table "public"."booking_services" to "service_role";

grant select on table "public"."booking_services" to "service_role";

grant trigger on table "public"."booking_services" to "service_role";

grant truncate on table "public"."booking_services" to "service_role";

grant update on table "public"."booking_services" to "service_role";

grant delete on table "public"."bookings" to "anon";

grant insert on table "public"."bookings" to "anon";

grant references on table "public"."bookings" to "anon";

grant select on table "public"."bookings" to "anon";

grant trigger on table "public"."bookings" to "anon";

grant truncate on table "public"."bookings" to "anon";

grant update on table "public"."bookings" to "anon";

grant delete on table "public"."bookings" to "authenticated";

grant insert on table "public"."bookings" to "authenticated";

grant references on table "public"."bookings" to "authenticated";

grant select on table "public"."bookings" to "authenticated";

grant trigger on table "public"."bookings" to "authenticated";

grant truncate on table "public"."bookings" to "authenticated";

grant update on table "public"."bookings" to "authenticated";

grant delete on table "public"."bookings" to "service_role";

grant insert on table "public"."bookings" to "service_role";

grant references on table "public"."bookings" to "service_role";

grant select on table "public"."bookings" to "service_role";

grant trigger on table "public"."bookings" to "service_role";

grant truncate on table "public"."bookings" to "service_role";

grant update on table "public"."bookings" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."contact_messages" to "anon";

grant insert on table "public"."contact_messages" to "anon";

grant references on table "public"."contact_messages" to "anon";

grant select on table "public"."contact_messages" to "anon";

grant trigger on table "public"."contact_messages" to "anon";

grant truncate on table "public"."contact_messages" to "anon";

grant update on table "public"."contact_messages" to "anon";

grant delete on table "public"."contact_messages" to "authenticated";

grant insert on table "public"."contact_messages" to "authenticated";

grant references on table "public"."contact_messages" to "authenticated";

grant select on table "public"."contact_messages" to "authenticated";

grant trigger on table "public"."contact_messages" to "authenticated";

grant truncate on table "public"."contact_messages" to "authenticated";

grant update on table "public"."contact_messages" to "authenticated";

grant delete on table "public"."contact_messages" to "service_role";

grant insert on table "public"."contact_messages" to "service_role";

grant references on table "public"."contact_messages" to "service_role";

grant select on table "public"."contact_messages" to "service_role";

grant trigger on table "public"."contact_messages" to "service_role";

grant truncate on table "public"."contact_messages" to "service_role";

grant update on table "public"."contact_messages" to "service_role";

grant delete on table "public"."employees" to "anon";

grant insert on table "public"."employees" to "anon";

grant references on table "public"."employees" to "anon";

grant select on table "public"."employees" to "anon";

grant trigger on table "public"."employees" to "anon";

grant truncate on table "public"."employees" to "anon";

grant update on table "public"."employees" to "anon";

grant delete on table "public"."employees" to "authenticated";

grant insert on table "public"."employees" to "authenticated";

grant references on table "public"."employees" to "authenticated";

grant select on table "public"."employees" to "authenticated";

grant trigger on table "public"."employees" to "authenticated";

grant truncate on table "public"."employees" to "authenticated";

grant update on table "public"."employees" to "authenticated";

grant delete on table "public"."employees" to "service_role";

grant insert on table "public"."employees" to "service_role";

grant references on table "public"."employees" to "service_role";

grant select on table "public"."employees" to "service_role";

grant trigger on table "public"."employees" to "service_role";

grant truncate on table "public"."employees" to "service_role";

grant update on table "public"."employees" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."reviews" to "anon";

grant insert on table "public"."reviews" to "anon";

grant references on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "anon";

grant trigger on table "public"."reviews" to "anon";

grant truncate on table "public"."reviews" to "anon";

grant update on table "public"."reviews" to "anon";

grant delete on table "public"."reviews" to "authenticated";

grant insert on table "public"."reviews" to "authenticated";

grant references on table "public"."reviews" to "authenticated";

grant select on table "public"."reviews" to "authenticated";

grant trigger on table "public"."reviews" to "authenticated";

grant truncate on table "public"."reviews" to "authenticated";

grant update on table "public"."reviews" to "authenticated";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

grant delete on table "public"."saved_payment_methods" to "anon";

grant insert on table "public"."saved_payment_methods" to "anon";

grant references on table "public"."saved_payment_methods" to "anon";

grant select on table "public"."saved_payment_methods" to "anon";

grant trigger on table "public"."saved_payment_methods" to "anon";

grant truncate on table "public"."saved_payment_methods" to "anon";

grant update on table "public"."saved_payment_methods" to "anon";

grant delete on table "public"."saved_payment_methods" to "authenticated";

grant insert on table "public"."saved_payment_methods" to "authenticated";

grant references on table "public"."saved_payment_methods" to "authenticated";

grant select on table "public"."saved_payment_methods" to "authenticated";

grant trigger on table "public"."saved_payment_methods" to "authenticated";

grant truncate on table "public"."saved_payment_methods" to "authenticated";

grant update on table "public"."saved_payment_methods" to "authenticated";

grant delete on table "public"."saved_payment_methods" to "service_role";

grant insert on table "public"."saved_payment_methods" to "service_role";

grant references on table "public"."saved_payment_methods" to "service_role";

grant select on table "public"."saved_payment_methods" to "service_role";

grant trigger on table "public"."saved_payment_methods" to "service_role";

grant truncate on table "public"."saved_payment_methods" to "service_role";

grant update on table "public"."saved_payment_methods" to "service_role";

grant delete on table "public"."services" to "anon";

grant insert on table "public"."services" to "anon";

grant references on table "public"."services" to "anon";

grant select on table "public"."services" to "anon";

grant trigger on table "public"."services" to "anon";

grant truncate on table "public"."services" to "anon";

grant update on table "public"."services" to "anon";

grant delete on table "public"."services" to "authenticated";

grant insert on table "public"."services" to "authenticated";

grant references on table "public"."services" to "authenticated";

grant select on table "public"."services" to "authenticated";

grant trigger on table "public"."services" to "authenticated";

grant truncate on table "public"."services" to "authenticated";

grant update on table "public"."services" to "authenticated";

grant delete on table "public"."services" to "service_role";

grant insert on table "public"."services" to "service_role";

grant references on table "public"."services" to "service_role";

grant select on table "public"."services" to "service_role";

grant trigger on table "public"."services" to "service_role";

grant truncate on table "public"."services" to "service_role";

grant update on table "public"."services" to "service_role";

grant delete on table "public"."system_settings" to "anon";

grant insert on table "public"."system_settings" to "anon";

grant references on table "public"."system_settings" to "anon";

grant select on table "public"."system_settings" to "anon";

grant trigger on table "public"."system_settings" to "anon";

grant truncate on table "public"."system_settings" to "anon";

grant update on table "public"."system_settings" to "anon";

grant delete on table "public"."system_settings" to "authenticated";

grant insert on table "public"."system_settings" to "authenticated";

grant references on table "public"."system_settings" to "authenticated";

grant select on table "public"."system_settings" to "authenticated";

grant trigger on table "public"."system_settings" to "authenticated";

grant truncate on table "public"."system_settings" to "authenticated";

grant update on table "public"."system_settings" to "authenticated";

grant delete on table "public"."system_settings" to "service_role";

grant insert on table "public"."system_settings" to "service_role";

grant references on table "public"."system_settings" to "service_role";

grant select on table "public"."system_settings" to "service_role";

grant trigger on table "public"."system_settings" to "service_role";

grant truncate on table "public"."system_settings" to "service_role";

grant update on table "public"."system_settings" to "service_role";

grant delete on table "public"."venue_order" to "anon";

grant insert on table "public"."venue_order" to "anon";

grant references on table "public"."venue_order" to "anon";

grant select on table "public"."venue_order" to "anon";

grant trigger on table "public"."venue_order" to "anon";

grant truncate on table "public"."venue_order" to "anon";

grant update on table "public"."venue_order" to "anon";

grant delete on table "public"."venue_order" to "authenticated";

grant insert on table "public"."venue_order" to "authenticated";

grant references on table "public"."venue_order" to "authenticated";

grant select on table "public"."venue_order" to "authenticated";

grant trigger on table "public"."venue_order" to "authenticated";

grant truncate on table "public"."venue_order" to "authenticated";

grant update on table "public"."venue_order" to "authenticated";

grant delete on table "public"."venue_order" to "service_role";

grant insert on table "public"."venue_order" to "service_role";

grant references on table "public"."venue_order" to "service_role";

grant select on table "public"."venue_order" to "service_role";

grant trigger on table "public"."venue_order" to "service_role";

grant truncate on table "public"."venue_order" to "service_role";

grant update on table "public"."venue_order" to "service_role";

grant delete on table "public"."venue_services" to "anon";

grant insert on table "public"."venue_services" to "anon";

grant references on table "public"."venue_services" to "anon";

grant select on table "public"."venue_services" to "anon";

grant trigger on table "public"."venue_services" to "anon";

grant truncate on table "public"."venue_services" to "anon";

grant update on table "public"."venue_services" to "anon";

grant delete on table "public"."venue_services" to "authenticated";

grant insert on table "public"."venue_services" to "authenticated";

grant references on table "public"."venue_services" to "authenticated";

grant select on table "public"."venue_services" to "authenticated";

grant trigger on table "public"."venue_services" to "authenticated";

grant truncate on table "public"."venue_services" to "authenticated";

grant update on table "public"."venue_services" to "authenticated";

grant delete on table "public"."venue_services" to "service_role";

grant insert on table "public"."venue_services" to "service_role";

grant references on table "public"."venue_services" to "service_role";

grant select on table "public"."venue_services" to "service_role";

grant trigger on table "public"."venue_services" to "service_role";

grant truncate on table "public"."venue_services" to "service_role";

grant update on table "public"."venue_services" to "service_role";

grant delete on table "public"."venues" to "anon";

grant insert on table "public"."venues" to "anon";

grant references on table "public"."venues" to "anon";

grant select on table "public"."venues" to "anon";

grant trigger on table "public"."venues" to "anon";

grant truncate on table "public"."venues" to "anon";

grant update on table "public"."venues" to "anon";

grant delete on table "public"."venues" to "authenticated";

grant insert on table "public"."venues" to "authenticated";

grant references on table "public"."venues" to "authenticated";

grant select on table "public"."venues" to "authenticated";

grant trigger on table "public"."venues" to "authenticated";

grant truncate on table "public"."venues" to "authenticated";

grant update on table "public"."venues" to "authenticated";

grant delete on table "public"."venues" to "service_role";

grant insert on table "public"."venues" to "service_role";

grant references on table "public"."venues" to "service_role";

grant select on table "public"."venues" to "service_role";

grant trigger on table "public"."venues" to "service_role";

grant truncate on table "public"."venues" to "service_role";

grant update on table "public"."venues" to "service_role";

create policy "Admins can update audit logs"
on "public"."audit_logs"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Admins can view audit logs"
on "public"."audit_logs"
as permissive
for select
to public
using (is_admin());


create policy "Service role can insert audit logs"
on "public"."audit_logs"
as permissive
for insert
to public
with check ((auth.role() = 'service_role'::text));


create policy "Admins can view all booking services"
on "public"."booking_services"
as permissive
for select
to public
using (is_admin());


create policy "Allow employee access to booking services"
on "public"."booking_services"
as permissive
for select
to public
using (true);


create policy "Partners can view booking services for their venues"
on "public"."booking_services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN venues v ON ((b.venue_id = v.id)))
  WHERE ((b.id = booking_services.booking_id) AND (v.partner_id = auth.uid())))));


create policy "Users can insert their own booking services"
on "public"."booking_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.user_id = auth.uid())))));


create policy "Users can update their own booking services"
on "public"."booking_services"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.user_id = auth.uid())))));


create policy "Users can view their own booking services"
on "public"."booking_services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = booking_services.booking_id) AND (bookings.user_id = auth.uid())))));


create policy "Admins can update any booking"
on "public"."bookings"
as permissive
for update
to public
using (is_admin());


create policy "Admins can view all bookings"
on "public"."bookings"
as permissive
for select
to public
using (is_admin());


create policy "Allow employee access to venue bookings"
on "public"."bookings"
as permissive
for select
to public
using (true);


create policy "Partners can update bookings for their venues"
on "public"."bookings"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = bookings.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Partners can view bookings for their venues"
on "public"."bookings"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = bookings.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Users can create own bookings"
on "public"."bookings"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own bookings"
on "public"."bookings"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view own bookings"
on "public"."bookings"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can manage categories"
on "public"."categories"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "Anyone can read categories"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "Admins can read contact messages"
on "public"."contact_messages"
as permissive
for select
to public
using (is_admin());


create policy "Admins can update contact messages"
on "public"."contact_messages"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Anyone can submit contact messages"
on "public"."contact_messages"
as permissive
for insert
to public
with check (true);


create policy "allow_employee_login_query"
on "public"."employees"
as permissive
for select
to public
using (true);


create policy "partners_can_delete_employees"
on "public"."employees"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = employees.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "partners_can_insert_employees"
on "public"."employees"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = employees.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "partners_can_update_employees"
on "public"."employees"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = employees.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "partners_can_view_employees"
on "public"."employees"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = employees.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Admins can insert notifications"
on "public"."notifications"
as permissive
for insert
to public
with check (is_admin());


create policy "Service role can insert notifications"
on "public"."notifications"
as permissive
for insert
to public
with check (true);


create policy "Users can delete their own notifications"
on "public"."notifications"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own notifications"
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can delete non-admin profiles"
on "public"."profiles"
as permissive
for delete
to public
using ((is_admin() AND (role <> 'admin'::text) AND (auth.uid() <> id)));


create policy "Admins can update all profiles"
on "public"."profiles"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Admins can view all profiles"
on "public"."profiles"
as permissive
for select
to public
using (is_admin());


create policy "Service role can delete profiles"
on "public"."profiles"
as permissive
for delete
to public
using ((auth.role() = 'service_role'::text));


create policy "Service role can manage all profiles"
on "public"."profiles"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text))
with check (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


create policy "Service role can read profiles"
on "public"."profiles"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Anyone can read reviews"
on "public"."reviews"
as permissive
for select
to public
using (true);


create policy "Users can create their own reviews"
on "public"."reviews"
as permissive
for insert
to public
with check (((auth.uid() = user_id) AND ((booking_id IS NULL) OR (EXISTS ( SELECT 1
   FROM bookings
  WHERE ((bookings.id = reviews.booking_id) AND (bookings.user_id = auth.uid()) AND (bookings.venue_id = reviews.venue_id) AND (bookings.status = 'confirmed'::text)))))));


create policy "Users can delete their own reviews"
on "public"."reviews"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own reviews"
on "public"."reviews"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own payment methods"
on "public"."saved_payment_methods"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own payment methods"
on "public"."saved_payment_methods"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own payment methods"
on "public"."saved_payment_methods"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own payment methods"
on "public"."saved_payment_methods"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can manage services"
on "public"."services"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "Anyone can read services"
on "public"."services"
as permissive
for select
to public
using (true);


create policy "Services are viewable by everyone"
on "public"."services"
as permissive
for select
to public
using (true);


create policy "Admins can insert system settings"
on "public"."system_settings"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


create policy "Admins can update system settings"
on "public"."system_settings"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


create policy "Admins can view system settings"
on "public"."system_settings"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


create policy "Admins can manage venue order"
on "public"."venue_order"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "Everyone can view venue order"
on "public"."venue_order"
as permissive
for select
to public
using (true);


create policy "Admins can manage all venue services"
on "public"."venue_services"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "Anyone can read venue services"
on "public"."venue_services"
as permissive
for select
to authenticated, anon
using (true);


create policy "Partners can create services for their venues"
on "public"."venue_services"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = venue_services.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Partners can delete services for their venues"
on "public"."venue_services"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = venue_services.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Partners can update services for their venues"
on "public"."venue_services"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM venues
  WHERE ((venues.id = venue_services.venue_id) AND (venues.partner_id = auth.uid())))));


create policy "Venue services are viewable by everyone"
on "public"."venue_services"
as permissive
for select
to public
using (true);


create policy "Admins can delete venues"
on "public"."venues"
as permissive
for delete
to public
using (is_admin());


create policy "Admins can update any venue"
on "public"."venues"
as permissive
for update
to public
using (is_admin());


create policy "Anyone can read venues"
on "public"."venues"
as permissive
for select
to authenticated, anon
using (true);


create policy "Partners can delete their own venues"
on "public"."venues"
as permissive
for delete
to public
using ((auth.uid() = partner_id));


create policy "Partners can insert their own venues"
on "public"."venues"
as permissive
for insert
to public
with check ((auth.uid() = partner_id));


create policy "Partners can update their own venues"
on "public"."venues"
as permissive
for update
to public
using ((auth.uid() = partner_id));


create policy "Partners can view their own venues"
on "public"."venues"
as permissive
for select
to public
using (((auth.uid() = partner_id) OR (partner_id IS NULL)));


create policy "Venues are viewable by everyone"
on "public"."venues"
as permissive
for select
to public
using (true);


CREATE TRIGGER update_booking_services_updated_at BEFORE UPDATE ON public.booking_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_status_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_booking_status_timestamp();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_venue_rating_on_delete AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_venue_rating();

CREATE TRIGGER trigger_update_venue_rating_on_insert AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_venue_rating();

CREATE TRIGGER trigger_update_venue_rating_on_update AFTER UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_venue_rating();

CREATE TRIGGER update_saved_payment_methods_updated_at BEFORE UPDATE ON public.saved_payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_order_updated_at BEFORE UPDATE ON public.venue_order FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_venue_approval_on_insert BEFORE INSERT ON public.venues FOR EACH ROW EXECUTE FUNCTION enforce_venue_approval_control();

CREATE TRIGGER enforce_venue_approval_on_update BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION enforce_venue_approval_control();

CREATE TRIGGER log_venue_audit_on_insert AFTER INSERT ON public.venues FOR EACH ROW EXECUTE FUNCTION log_venue_audit();

CREATE TRIGGER log_venue_audit_on_update AFTER UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION log_venue_audit();

CREATE TRIGGER trg_enforce_venue_approval_control BEFORE INSERT OR UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION enforce_venue_approval_control();



