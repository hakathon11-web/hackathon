-- Create a SECURITY DEFINER function to create employee bookings safely
-- This bypasses RLS expressions that may cast empty strings to uuid

create or replace function public.create_employee_booking(
  p_employee_id uuid,
  p_venue_id uuid,
  p_venue_service_id uuid,
  p_booking_date date,
  p_total_price numeric,
  p_color text,
  p_is_open_duration boolean,
  p_event_status text,
  p_special_requests text
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
begin
  if p_employee_id is null then
    raise exception 'employee_id is required';
  end if;
  if p_venue_id is null then
    raise exception 'venue_id is required';
  end if;
  if p_venue_service_id is null then
    raise exception 'venue_service_id is required';
  end if;
  if p_booking_date is null then
    raise exception 'booking_date is required';
  end if;
  if p_total_price is null then
    raise exception 'total_price is required';
  end if;

  insert into public.bookings (
    user_id,
    employee_id,
    venue_id,
    service_id,
    event_type,
    booking_date,
    total_price,
    status,
    special_requests,
    hidden_from_widget,
    color,
    is_open_duration,
    event_status,
    actual_start_time,
    actual_end_time
  ) values (
    null,
    p_employee_id,
    p_venue_id,
    p_venue_service_id,
    'employee',
    p_booking_date,
    p_total_price,
    'confirmed',
    p_special_requests,
    true,
    coalesce(p_color, '#3b82f6'),
    coalesce(p_is_open_duration, false),
    p_event_status,
    null,
    null
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.create_employee_booking(
  uuid, uuid, uuid, date, numeric, text, boolean, text, text
) to authenticated, anon;


