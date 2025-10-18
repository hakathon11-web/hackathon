-- SECURITY DEFINER function to update booking_services by booking_id safely

create or replace function public.update_employee_booking_service(
  p_booking_id uuid,
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

  update public.booking_services bs
  set arrival_datetime = p_arrival_datetime,
      departure_datetime = p_departure_datetime,
      guest_count = coalesce(p_guest_count, bs.guest_count),
      price_per_hour = coalesce(p_price_per_hour, bs.price_per_hour),
      duration_hours = p_duration_hours,
      subtotal = coalesce(p_subtotal, bs.subtotal),
      table_configurations = coalesce(p_table_configurations, bs.table_configurations),
      updated_at = now()
  where bs.booking_id = p_booking_id
  returning * into v_row;

  if v_row is null then
    raise exception 'No booking_service found for booking_id %', p_booking_id;
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_employee_booking_service(
  uuid, timestamptz, timestamptz, int, numeric, numeric, numeric, jsonb
) to authenticated, anon;


