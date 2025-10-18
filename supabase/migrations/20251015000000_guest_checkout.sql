-- Guest checkout support
-- 1) Add guest_email to bog_order_context
alter table if exists public.bog_order_context
  add column if not exists guest_email text;

-- 2) Ensure bookings.user_id is nullable to allow guest bookings
alter table if exists public.bookings
  alter column user_id drop not null;

-- 3) Ensure bookings.user_email exists for notifications (create if missing)
alter table if exists public.bookings
  add column if not exists user_email text;

-- 4) Optional: ensure payment_status and payment_method columns exist used by callbacks
alter table if exists public.bookings
  add column if not exists payment_status text,
  add column if not exists payment_method text,
  add column if not exists bog_order_id text,
  add column if not exists currency text;


-- 5) Helper function to claim guest bookings when user signs in with same email
create or replace function public.claim_guest_bookings(claim_email text)
returns void
language plpgsql
security definer
as $$
begin
  -- Link any guest bookings that match the email to the authenticated user
  update public.bookings b
  set user_id = auth.uid()
  where b.user_id is null
    and b.user_email is not null
    and lower(b.user_email) = lower(claim_email);
end;
$$;


