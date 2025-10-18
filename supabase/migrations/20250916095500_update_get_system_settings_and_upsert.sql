-- Create a new v2 function to avoid changing the existing function signature
set check_function_bodies = off;

create or replace function public.get_system_settings_v2()
returns table(
  id uuid,
  booking_timeout_minutes integer,
  pre_arrival_reminder_hours integer,
  min_advance_booking_hours_for_reminder integer,
  partner_booking_request_emails_enabled boolean,
  auto_approval_enabled boolean,
  email_notifications_enabled boolean,
  review_moderation_enabled boolean,
  require_email_verification boolean,
  allow_guest_bookings boolean,
  default_commission_rate numeric,
  minimum_booking_amount numeric,
  max_advance_booking_days integer,
  maintenance_mode boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    ss.id,
    ss.booking_timeout_minutes,
    coalesce(ss.pre_arrival_reminder_hours, 24) as pre_arrival_reminder_hours,
    coalesce(ss.min_advance_booking_hours_for_reminder, 6) as min_advance_booking_hours_for_reminder,
    coalesce(ss.partner_booking_request_emails_enabled, false) as partner_booking_request_emails_enabled,
    ss.auto_approval_enabled,
    ss.email_notifications_enabled,
    ss.review_moderation_enabled,
    ss.require_email_verification,
    ss.allow_guest_bookings,
    ss.default_commission_rate,
    ss.minimum_booking_amount,
    ss.max_advance_booking_days,
    ss.maintenance_mode,
    ss.created_at,
    ss.updated_at
  from public.system_settings ss
  order by ss.created_at desc
  limit 1;
end;
$$;

-- Upsert function to create/update settings via SECURITY DEFINER (bypasses RLS)
create or replace function public.upsert_system_settings(p_settings jsonb)
returns public.system_settings
language plpgsql
security definer
as $$
declare
  v_existing public.system_settings;
  v_result public.system_settings;
begin
  select * into v_existing from public.system_settings order by created_at desc limit 1;

  if v_existing.id is null then
    insert into public.system_settings (
      booking_timeout_minutes,
      pre_arrival_reminder_hours,
      min_advance_booking_hours_for_reminder,
      partner_booking_request_emails_enabled,
      auto_approval_enabled,
      email_notifications_enabled,
      review_moderation_enabled,
      require_email_verification,
      allow_guest_bookings,
      default_commission_rate,
      minimum_booking_amount,
      max_advance_booking_days,
      maintenance_mode
    ) values (
      coalesce((p_settings->>'booking_timeout_minutes')::int, 5),
      coalesce((p_settings->>'pre_arrival_reminder_hours')::int, 24),
      coalesce((p_settings->>'min_advance_booking_hours_for_reminder')::int, 6),
      coalesce((p_settings->>'partner_booking_request_emails_enabled')::boolean, false),
      coalesce((p_settings->>'auto_approval_enabled')::boolean, false),
      coalesce((p_settings->>'email_notifications_enabled')::boolean, true),
      coalesce((p_settings->>'review_moderation_enabled')::boolean, true),
      coalesce((p_settings->>'require_email_verification')::boolean, true),
      coalesce((p_settings->>'allow_guest_bookings')::boolean, false),
      coalesce((p_settings->>'default_commission_rate')::numeric, 15),
      coalesce((p_settings->>'minimum_booking_amount')::numeric, 25),
      coalesce((p_settings->>'max_advance_booking_days')::int, 90),
      coalesce((p_settings->>'maintenance_mode')::boolean, false)
    ) returning * into v_result;
  else
    update public.system_settings set
      booking_timeout_minutes = coalesce((p_settings->>'booking_timeout_minutes')::int, booking_timeout_minutes),
      pre_arrival_reminder_hours = coalesce((p_settings->>'pre_arrival_reminder_hours')::int, pre_arrival_reminder_hours),
      min_advance_booking_hours_for_reminder = coalesce((p_settings->>'min_advance_booking_hours_for_reminder')::int, min_advance_booking_hours_for_reminder),
      partner_booking_request_emails_enabled = coalesce((p_settings->>'partner_booking_request_emails_enabled')::boolean, partner_booking_request_emails_enabled),
      auto_approval_enabled = coalesce((p_settings->>'auto_approval_enabled')::boolean, auto_approval_enabled),
      email_notifications_enabled = coalesce((p_settings->>'email_notifications_enabled')::boolean, email_notifications_enabled),
      review_moderation_enabled = coalesce((p_settings->>'review_moderation_enabled')::boolean, review_moderation_enabled),
      require_email_verification = coalesce((p_settings->>'require_email_verification')::boolean, require_email_verification),
      allow_guest_bookings = coalesce((p_settings->>'allow_guest_bookings')::boolean, allow_guest_bookings),
      default_commission_rate = coalesce((p_settings->>'default_commission_rate')::numeric, default_commission_rate),
      minimum_booking_amount = coalesce((p_settings->>'minimum_booking_amount')::numeric, minimum_booking_amount),
      max_advance_booking_days = coalesce((p_settings->>'max_advance_booking_days')::int, max_advance_booking_days),
      maintenance_mode = coalesce((p_settings->>'maintenance_mode')::boolean, maintenance_mode),
      updated_at = now()
    where id = v_existing.id
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

