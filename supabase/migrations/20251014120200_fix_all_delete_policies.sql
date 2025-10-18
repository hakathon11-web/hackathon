-- Fix DELETE policies for booking_services and booking_products to use safe_current_employee_id()
-- This fixes the UUID casting error when employees try to delete events

-- 1. Fix booking_services DELETE policy
DROP POLICY IF EXISTS "Employees can delete booking services" ON public.booking_services;

CREATE POLICY "Employees can delete booking services"
ON public.booking_services
AS PERMISSIVE
FOR DELETE
TO authenticated, anon
USING (
  -- Allow employees to delete booking services for employee-created bookings
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = public.safe_current_employee_id()
  ))
  OR
  -- Fallback: Allow if booking has employee_id and employee exists with venue access
  (EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.id = bookings.employee_id
    WHERE bookings.id = booking_services.booking_id
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
    AND employees.venue_id = bookings.venue_id
    AND employees.is_active = true
  ))
);

COMMENT ON POLICY "Employees can delete booking services" ON public.booking_services 
IS 'Allows employees to delete booking services for bookings in their venue. Uses safe_current_employee_id() to avoid UUID casting errors.';

-- 2. Fix booking_products DELETE policy
DROP POLICY IF EXISTS "booking_products_delete_policy" ON public.booking_products;

CREATE POLICY "booking_products_delete_policy" ON public.booking_products
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.venues v ON b.venue_id = v.id
        WHERE b.id = booking_products.booking_id
        AND (
            v.partner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.employees e
                WHERE e.venue_id = v.id 
                AND e.id = public.safe_current_employee_id()
            )
        )
    )
);

COMMENT ON POLICY "booking_products_delete_policy" ON public.booking_products 
IS 'Allows venue partners and employees to delete booking products. Uses safe_current_employee_id() to avoid UUID casting errors.';

