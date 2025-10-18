-- Create table to store per-venue notification recipients for different processes
create table if not exists public.venue_notification_recipients (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  process text not null check (process in ('booking', 'response')),
  email text not null check (position('@' in email) > 1),
  created_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles(id),
  unique (venue_id, process, email)
);

comment on table public.venue_notification_recipients is 'Per-venue notification recipient emails by process: booking, response';

-- Enable RLS
alter table public.venue_notification_recipients enable row level security;

-- Policies: Admins can do everything; partners can manage their venue rows; others read none
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_notification_recipients' and policyname = 'Admins full access'
  ) then
    create policy "Admins full access" on public.venue_notification_recipients
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_notification_recipients' and policyname = 'Partners manage own venues'
  ) then
    create policy "Partners manage own venues" on public.venue_notification_recipients
      using (exists (
        select 1 from public.venues v where v.id = venue_id and v.partner_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.venues v where v.id = venue_id and v.partner_id = auth.uid()
      ));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'venue_notification_recipients' and policyname = 'Only authenticated can read their venues'
  ) then
    create policy "Only authenticated can read their venues" on public.venue_notification_recipients
      for select
      using (
        exists (
          select 1 from public.venues v
          where v.id = venue_id and (v.partner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
        )
      );
  end if;
end $$;


