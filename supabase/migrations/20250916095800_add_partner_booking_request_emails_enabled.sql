-- Add global toggle for partner booking request emails
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'partner_booking_request_emails_enabled'
  ) then
    alter table public.system_settings
      add column partner_booking_request_emails_enabled boolean not null default false;
  end if;
end $$;

