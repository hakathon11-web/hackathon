-- Safe helper for reading employee id from GUC without raising 22P02
create or replace function public.safe_current_employee_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v text;
  out_id uuid;
begin
  v := current_setting('app.current_employee_id', true);
  if v is null or v = '' then
    return null;
  end if;
  begin
    out_id := v::uuid;
  exception when others then
    return null;
  end;
  return out_id;
end;
$$;

grant execute on function public.safe_current_employee_id() to authenticated, anon;

-- Recreate is_employee() to use the safe helper
create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = public.safe_current_employee_id()
  );
$$;

grant execute on function public.is_employee() to authenticated, anon;

-- Update RLS policies to use safe_current_employee_id()

-- Bookings policies
drop policy if exists "Users and employees can update bookings" on public.bookings;
create policy "Users and employees can update bookings"
on public.bookings
as permissive
for update
to authenticated, anon
using (
  (auth.uid() = user_id)
  or (is_employee() and employee_id = public.safe_current_employee_id())
  or (is_employee() and exists (
    select 1 from public.employees
    where employees.id = public.safe_current_employee_id()
    and employees.venue_id = bookings.venue_id
  ))
)
with check (
  (auth.uid() = user_id)
  or (is_employee() and employee_id = public.safe_current_employee_id())
  or (is_employee() and exists (
    select 1 from public.employees
    where employees.id = public.safe_current_employee_id()
    and employees.venue_id = bookings.venue_id
  ))
);

-- Booking services policies
drop policy if exists "Users and employees can view booking services" on public.booking_services;
create policy "Users and employees can view booking services"
on public.booking_services
as permissive
for select
to authenticated, anon
using (
  exists (
    select 1 from public.bookings 
    where bookings.id = booking_services.booking_id 
    and bookings.user_id = auth.uid()
  )
  or (
    is_employee() and exists (
      select 1 from public.bookings 
      join public.employees on employees.venue_id = bookings.venue_id
      where bookings.id = booking_services.booking_id
      and employees.id = public.safe_current_employee_id()
    )
  )
);

-- Also drop any older insert policy name
drop policy if exists "Users and employees can insert booking services" on public.booking_services;
drop policy if exists "Employees can create booking services" on public.booking_services;
create policy "Employees can create booking services"
on public.booking_services
as permissive
for insert
to authenticated, anon
with check (
  is_employee() and exists (
    select 1 from public.bookings 
    join public.employees on employees.venue_id = bookings.venue_id
    where bookings.id = booking_services.booking_id
    and employees.id = public.safe_current_employee_id()
  )
);

drop policy if exists "Employees can update booking services" on public.booking_services;
create policy "Employees can update booking services"
on public.booking_services
as permissive
for update
to authenticated, anon
using (
  is_employee() and exists (
    select 1 from public.bookings 
    join public.employees on employees.venue_id = bookings.venue_id
    where bookings.id = booking_services.booking_id
    and employees.id = public.safe_current_employee_id()
  )
)
with check (
  is_employee() and exists (
    select 1 from public.bookings 
    join public.employees on employees.venue_id = bookings.venue_id
    where bookings.id = booking_services.booking_id
    and employees.id = public.safe_current_employee_id()
  )
);

drop policy if exists "Employees can delete booking services" on public.booking_services;
create policy "Employees can delete booking services"
on public.booking_services
as permissive
for delete
to authenticated, anon
using (
  is_employee() and exists (
    select 1 from public.bookings 
    join public.employees on employees.venue_id = bookings.venue_id
    where bookings.id = booking_services.booking_id
    and employees.id = public.safe_current_employee_id()
  )
);

-- Booking products policies
drop policy if exists "booking_products_select_policy" on public.booking_products;
create policy "booking_products_select_policy" on public.booking_products
  for select using (
    exists (
      select 1 from public.bookings b
      join public.venues v on b.venue_id = v.id
      where b.id = booking_products.booking_id
      and (
        v.partner_id = auth.uid() or
        exists (
          select 1 from public.employees e
          where e.venue_id = v.id and e.id = public.safe_current_employee_id()
        )
      )
    )
  );

drop policy if exists "booking_products_insert_policy" on public.booking_products;
create policy "booking_products_insert_policy" on public.booking_products
  for insert with check (
    exists (
      select 1 from public.bookings b
      join public.venues v on b.venue_id = v.id
      where b.id = booking_products.booking_id
      and (
        v.partner_id = auth.uid() or
        exists (
          select 1 from public.employees e
          where e.venue_id = v.id and e.id = public.safe_current_employee_id()
        )
      )
    )
  );

drop policy if exists "booking_products_update_policy" on public.booking_products;
create policy "booking_products_update_policy" on public.booking_products
  for update using (
    exists (
      select 1 from public.bookings b
      join public.venues v on b.venue_id = v.id
      where b.id = booking_products.booking_id
      and (
        v.partner_id = auth.uid() or
        exists (
          select 1 from public.employees e
          where e.venue_id = v.id and e.id = public.safe_current_employee_id()
        )
      )
    )
  );

drop policy if exists "booking_products_delete_policy" on public.booking_products;
create policy "booking_products_delete_policy" on public.booking_products
  for delete using (
    exists (
      select 1 from public.bookings b
      join public.venues v on b.venue_id = v.id
      where b.id = booking_products.booking_id
      and (
        v.partner_id = auth.uid() or
        exists (
          select 1 from public.employees e
          where e.venue_id = v.id and e.id = public.safe_current_employee_id()
        )
      )
    )
  );

-- Venue calendar settings policies (if present)
drop policy if exists "Employees can view and update venue calendar settings" on public.venue_calendar_settings;
create policy "Employees can view and update venue calendar settings"
on public.venue_calendar_settings
as permissive
for all
to authenticated, anon
using (
  exists (
    select 1 from public.employees e
    where e.venue_id = venue_calendar_settings.venue_id
    and e.id = public.safe_current_employee_id()
  )
)
with check (
  exists (
    select 1 from public.employees e
    where e.venue_id = venue_calendar_settings.venue_id
    and e.id = public.safe_current_employee_id()
  )
);


