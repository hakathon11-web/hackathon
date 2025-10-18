-- Safely reassign a seat for a booking service, intended for employee use
-- Validates that the employee belongs to the same venue as the booking

CREATE OR REPLACE FUNCTION public.reassign_booking_seat(
  p_booking_service_id uuid,
  p_employee_id uuid,
  p_new_seat integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_booking_id uuid;
  v_booking_venue uuid;
  v_employee_venue uuid;
  v_configs jsonb;
  v_original_seat integer;
  v_elem jsonb;
  v_updated_configs jsonb;
BEGIN
  -- Fetch booking id and venue for the booking service
  SELECT bs.booking_id, b.venue_id
  INTO v_booking_id, v_booking_venue
  FROM booking_services bs
  JOIN bookings b ON b.id = bs.booking_id
  WHERE bs.id = p_booking_service_id;

  IF v_booking_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Fetch employee venue and validate access
  SELECT venue_id INTO v_employee_venue FROM employees WHERE id = p_employee_id;
  IF v_employee_venue IS NULL OR v_employee_venue <> v_booking_venue THEN
    RETURN FALSE;
  END IF;

  -- Get current table configurations
  SELECT table_configurations INTO v_configs FROM booking_services WHERE id = p_booking_service_id;
  IF v_configs IS NULL THEN
    v_configs := '[]'::jsonb;
  END IF;

  -- Try to detect an existing seat to replace: pick the first entry's table_number
  v_original_seat := COALESCE((SELECT (elem->>'table_number')::int FROM jsonb_array_elements(v_configs) AS elem LIMIT 1), NULL);

  IF v_original_seat IS NULL THEN
    -- No existing config: set a single seat
    v_updated_configs := jsonb_build_array(jsonb_build_object('table_number', p_new_seat, 'guest_count', 1));
  ELSE
    -- Replace matching seat number, otherwise keep others
    v_updated_configs := '[]'::jsonb;
    FOR v_elem IN SELECT elem FROM jsonb_array_elements(v_configs) AS elem LOOP
      v_updated_configs := v_updated_configs || jsonb_build_object(
        'table_number', CASE WHEN (v_elem->>'table_number')::int = v_original_seat THEN p_new_seat ELSE (v_elem->>'table_number')::int END,
        'guest_count', COALESCE((v_elem->>'guest_count')::int, 1)
      );
    END LOOP;
  END IF;

  UPDATE booking_services
  SET table_configurations = v_updated_configs,
      updated_at = now()
  WHERE id = p_booking_service_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_booking_seat(uuid, uuid, integer) TO authenticated, anon;

