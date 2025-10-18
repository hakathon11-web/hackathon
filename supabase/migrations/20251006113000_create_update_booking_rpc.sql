-- SECURITY DEFINER function to update bookings safely for employee events

create or replace function public.update_employee_booking(
  p_booking_id uuid,
  p_booking_date date,
  p_total_price numeric,
  p_special_requests text,
  p_color text,
  p_is_open_duration boolean,
  p_event_status text,
  p_actual_start_time timestamptz,
  p_actual_end_time timestamptz
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.bookings;
begin
  if p_booking_id is null then raise exception 'booking_id is required'; end if;

  update public.bookings b
  set booking_date = coalesce(p_booking_date, b.booking_date),
      total_price = coalesce(p_total_price, b.total_price),
      special_requests = p_special_requests,
      color = coalesce(p_color, b.color),
      is_open_duration = coalesce(p_is_open_duration, b.is_open_duration),
      event_status = p_event_status,
      actual_start_time = p_actual_start_time,
      actual_end_time = p_actual_end_time,
      updated_at = now()
  where b.id = p_booking_id
  returning * into v_row;

  if v_row is null then
    raise exception 'No booking found for id %', p_booking_id;
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_employee_booking(
  uuid, date, numeric, text, text, boolean, text, timestamptz, timestamptz
) to authenticated, anon;


