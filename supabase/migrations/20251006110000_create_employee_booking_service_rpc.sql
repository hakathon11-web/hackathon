-- Create a SECURITY DEFINER function to insert booking_services safely

create or replace function public.create_employee_booking_service(
  p_booking_id uuid,
  p_service_id uuid,
  p_arrival_datetime timestamptz,
  p_departure_datetime timestamptz,
  p_guest_count int,
  p_price_per_hour numeric,
  p_duration_hours numeric,
  p_subtotal numeric,
  p_table_configurations jsonb
)
returns public.booking_services
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.booking_services;
begin
  if p_booking_id is null then raise exception 'booking_id is required'; end if;
  if p_service_id is null then raise exception 'service_id is required'; end if;

  insert into public.booking_services (
    booking_id,
    service_id,
    arrival_datetime,
    departure_datetime,
    guest_count,
    price_per_hour,
    duration_hours,
    subtotal,
    table_configurations
  ) values (
    p_booking_id,
    p_service_id,
    p_arrival_datetime,
    p_departure_datetime,
    coalesce(p_guest_count, 1),
    coalesce(p_price_per_hour, 0),
    p_duration_hours,
    coalesce(p_subtotal, 0),
    coalesce(p_table_configurations, '[]'::jsonb)
  ) returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_employee_booking_service(
  uuid, uuid, timestamptz, timestamptz, int, numeric, numeric, numeric, jsonb
) to authenticated, anon;


