-- Allow 'pre_arrival_reminder' notification type used by booking-reminders function
do $$
begin
  -- If the notifications table exists and has a type check constraint, update it to include the new value
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'notifications'
  ) then
    -- Drop existing check constraint if present
    if exists (
      select 1 from information_schema.table_constraints tc
      where tc.table_schema = 'public' and tc.table_name = 'notifications' and tc.constraint_name = 'notifications_type_check'
    ) then
      alter table public.notifications drop constraint if exists notifications_type_check;
    end if;

    -- Recreate with expanded enum list including pre_arrival_reminder
    alter table public.notifications add constraint notifications_type_check
      check (
        type = any (
          array[
            'booking_request_sent',
            'booking_confirmation',
            'booking_rejected',
            'booking_cancelled',
            'booking_expired',
            'booking_reminder_15min',
            'booking_reminder_1hour',
            'booking_reminder_2hours',
            'review_request',
            '1_hour_before',
            '2_hours_before',
            '10_minutes_before',
            'admin_message',
            'pre_arrival_reminder'
          ]
        )
      );
  end if;
end $$;


