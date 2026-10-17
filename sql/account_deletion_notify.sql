-- Admins are emailed when a candidate asks to delete their account.
-- The app pings /api/account-deletions/notify right away; the daily cron
-- re-sends for any pending request that was never notified (notified_at null).
-- Run in the Supabase SQL Editor after account_deletion.sql.

begin;

alter table public.account_deletion_requests
  add column if not exists notified_at timestamptz;

create or replace view api.account_deletion_requests as
select user_id,
       email,
       requested_at,
       delete_after,
       status,
       cancelled_at,
       completed_at,
       last_error,
       notified_at
from public.account_deletion_requests;

revoke all on api.account_deletion_requests from anon, authenticated;
grant select, update on api.account_deletion_requests to service_role;

commit;

notify pgrst, 'reload schema';
