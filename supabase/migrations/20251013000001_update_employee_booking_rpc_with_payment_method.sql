-- Update employee booking RPC functions to include payment_method parameter

-- Update create_employee_booking function to include payment_method
CREATE OR REPLACE FUNCTION public.create_employee_booking(
  p_employee_id uuid,
  p_venue_id uuid,
  p_venue_service_id uuid,
  p_booking_date date,
  p_total_price numeric,
  p_color text,
  p_is_open_duration boolean,
  p_event_status text,
  p_special_requests text,
  p_payment_method text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;
  IF p_venue_id IS NULL THEN
    RAISE EXCEPTION 'venue_id is required';
  END IF;
  IF p_venue_service_id IS NULL THEN
    RAISE EXCEPTION 'venue_service_id is required';
  END IF;
  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'booking_date is required';
  END IF;
  IF p_total_price IS NULL THEN
    RAISE EXCEPTION 'total_price is required';
  END IF;

  INSERT INTO public.bookings (
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
    actual_end_time,
    payment_method
  ) VALUES (
    NULL,
    p_employee_id,
    p_venue_id,
    p_venue_service_id,
    'employee',
    p_booking_date,
    p_total_price,
    'confirmed',
    p_special_requests,
    TRUE,
    COALESCE(p_color, '#3b82f6'),
    COALESCE(p_is_open_duration, FALSE),
    p_event_status,
    NULL,
    NULL,
    p_payment_method
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- Update the grant statement to include the new parameter
GRANT EXECUTE ON FUNCTION public.create_employee_booking(
  uuid, uuid, uuid, date, numeric, text, boolean, text, text, text
) TO authenticated, anon;

-- Update update_employee_booking function to include payment_method
CREATE OR REPLACE FUNCTION public.update_employee_booking(
  p_booking_id uuid,
  p_booking_date date,
  p_total_price numeric,
  p_special_requests text,
  p_color text,
  p_is_open_duration boolean,
  p_event_status text,
  p_actual_start_time timestamptz,
  p_actual_end_time timestamptz,
  p_payment_method text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.bookings;
BEGIN
  IF p_booking_id IS NULL THEN RAISE EXCEPTION 'booking_id is required'; END IF;

  UPDATE public.bookings b
  SET booking_date = COALESCE(p_booking_date, b.booking_date),
      total_price = COALESCE(p_total_price, b.total_price),
      special_requests = p_special_requests,
      color = COALESCE(p_color, b.color),
      is_open_duration = COALESCE(p_is_open_duration, b.is_open_duration),
      event_status = p_event_status,
      actual_start_time = p_actual_start_time,
      actual_end_time = p_actual_end_time,
      payment_method = p_payment_method,
      updated_at = NOW()
  WHERE b.id = p_booking_id
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'No booking found for id %', p_booking_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Update the grant statement to include the new parameter
GRANT EXECUTE ON FUNCTION public.update_employee_booking(
  uuid, date, numeric, text, text, boolean, text, timestamptz, timestamptz, text
) TO authenticated, anon;

