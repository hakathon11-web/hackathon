-- Add settings for configurable pre-arrival reminders
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'pre_arrival_reminder_hours'
  ) then
    alter table public.system_settings
      add column pre_arrival_reminder_hours integer not null default 24;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'min_advance_booking_hours_for_reminder'
  ) then
    alter table public.system_settings
      add column min_advance_booking_hours_for_reminder integer not null default 6;
  end if;
end $$;

comment on column public.system_settings.pre_arrival_reminder_hours is 'Send customer reminder X hours before arrival';
comment on column public.system_settings.min_advance_booking_hours_for_reminder is 'Only send reminder if booking was made at least Y hours before arrival';

