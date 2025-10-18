-- Create table to store Web Push subscriptions for employees (non-auth users)
-- Employees authenticate via app-level session; we associate by employee_id
create table if not exists public.employee_web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, endpoint)
);

alter table public.employee_web_push_subscriptions enable row level security;

-- RLS: allow public access only via a dedicated RPC or service role; deny by default
drop policy if exists "allow_any_select" on public.employee_web_push_subscriptions;
drop policy if exists "allow_any_insert" on public.employee_web_push_subscriptions;
drop policy if exists "allow_any_delete" on public.employee_web_push_subscriptions;

-- For safety, no row-level policies are created here. Access should be via service role only.

-- Trigger to keep updated_at current
create or replace function public.set_employee_web_push_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_employee_web_push_updated_at on public.employee_web_push_subscriptions;
create trigger trg_employee_web_push_updated_at
before update on public.employee_web_push_subscriptions
for each row execute function public.set_employee_web_push_updated_at();


