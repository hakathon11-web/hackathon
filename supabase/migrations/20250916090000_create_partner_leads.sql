create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

comment on table public.partner_leads is 'Inbound requests from Become Partner form';

-- Minimal RLS policy (keep private to service role by default unless later opened)
alter table public.partner_leads enable row level security;


