-- Create table to store Web Push subscriptions for partners
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.web_push_subscriptions enable row level security;

-- RLS: users can manage their own subscriptions
create policy "Allow own select" on public.web_push_subscriptions
  for select using (auth.uid() = user_id);

create policy "Allow own insert" on public.web_push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Allow own delete" on public.web_push_subscriptions
  for delete using (auth.uid() = user_id);

-- Update trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger trg_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function public.set_updated_at();

