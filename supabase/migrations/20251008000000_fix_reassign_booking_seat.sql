-- Fix reassign_booking_seat to properly handle multi-table bookings
-- Now accepts the original seat number to update the specific table configuration

DROP FUNCTION IF EXISTS public.reassign_booking_seat(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.reassign_booking_seat(
  p_booking_service_id uuid,
  p_employee_id uuid,
  p_original_seat integer,
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
  v_elem jsonb;
  v_updated_configs jsonb;
  v_found_seat boolean;
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
  IF v_configs IS NULL OR jsonb_array_length(v_configs) = 0 THEN
    -- No existing config: set a single seat
    v_updated_configs := jsonb_build_array(jsonb_build_object('table_number', p_new_seat, 'guest_count', 1));
  ELSE
    -- Update only the specific seat that matches p_original_seat, keep others unchanged
    v_updated_configs := '[]'::jsonb;
    v_found_seat := false;
    
    FOR v_elem IN SELECT elem FROM jsonb_array_elements(v_configs) AS elem LOOP
      IF (v_elem->>'table_number')::int = p_original_seat THEN
        -- This is the seat we want to update
        v_updated_configs := v_updated_configs || jsonb_build_array(
          jsonb_build_object(
            'table_number', p_new_seat,
            'guest_count', COALESCE((v_elem->>'guest_count')::int, 1)
          )
        );
        v_found_seat := true;
      ELSE
        -- Keep this seat as-is
        v_updated_configs := v_updated_configs || jsonb_build_array(v_elem);
      END IF;
    END LOOP;
    
    -- If we didn't find the original seat, add the new one
    IF NOT v_found_seat THEN
      v_updated_configs := v_updated_configs || jsonb_build_array(
        jsonb_build_object('table_number', p_new_seat, 'guest_count', 1)
      );
    END IF;
  END IF;

  UPDATE booking_services
  SET table_configurations = v_updated_configs,
      updated_at = now()
  WHERE id = p_booking_service_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_booking_seat(uuid, uuid, integer, integer) TO authenticated, anon;

