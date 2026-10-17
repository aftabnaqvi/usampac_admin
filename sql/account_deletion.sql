-- In-app account deletion with a 30-day waiting period (App Store Guideline 5.1.1(v)).
-- Run in the Supabase SQL Editor.
--
-- Flow:
--   1. Candidate taps Settings → Delete Account → api.request_account_deletion().
--   2. They can cancel for 30 days with api.cancel_account_deletion().
--   3. The admin site's daily cron (or an admin's "Delete now") calls
--      api.archive_and_remove_account_rows(), then deletes the Auth login.
--
-- An approved listing is copied to public.candidate_archive first, so past
-- candidacies stay searchable. Email, phone, photo, bio, and the login are removed.
-- Protected people are refused here as well as in the admin site.

begin;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key,
  email text,
  requested_at timestamptz not null default now(),
  delete_after timestamptz not null default now() + interval '30 days',
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'completed')),
  cancelled_at timestamptz,
  completed_at timestamptz,
  last_error text,
  notified_at timestamptz
);

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests (status, delete_after);

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select, insert, update, delete on public.account_deletion_requests to service_role;

create table if not exists public.candidate_archive (
  id uuid primary key default gen_random_uuid(),
  former_user_id uuid not null,
  display_name text,
  party text,
  office_level text,
  office_name text,
  state_code text,
  city_name text,
  cycle text,
  incumbency boolean,
  archived_at timestamptz not null default now(),
  reason text not null default 'account_deleted'
);

create unique index if not exists candidate_archive_former_user_reason_idx
  on public.candidate_archive (former_user_id, reason);

alter table public.candidate_archive enable row level security;
revoke all on public.candidate_archive from anon, authenticated;
grant select, insert, update, delete on public.candidate_archive to service_role;

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

create or replace view api.candidate_archive as
select id,
       former_user_id,
       display_name,
       party,
       office_level,
       office_name,
       state_code,
       city_name,
       cycle,
       incumbency,
       archived_at,
       reason
from public.candidate_archive;

revoke all on api.candidate_archive from anon, authenticated;
grant select on api.candidate_archive to service_role;

create or replace function api.my_account_deletion()
returns table (status text, requested_at timestamptz, delete_after timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.status, r.requested_at, r.delete_after
  from public.account_deletion_requests r
  where r.user_id = auth.uid()
    and r.status = 'pending';
$$;

create or replace function api.request_account_deletion()
returns table (status text, requested_at timestamptz, delete_after timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.account_deletion_requests (user_id, email)
  values (v_uid, (select u.email from auth.users u where u.id = v_uid))
  on conflict (user_id) do update
    set status = 'pending',
        email = excluded.email,
        requested_at = now(),
        delete_after = now() + interval '30 days',
        cancelled_at = null,
        completed_at = null,
        last_error = null
    where public.account_deletion_requests.status <> 'pending';

  return query
    select r.status, r.requested_at, r.delete_after
    from public.account_deletion_requests r
    where r.user_id = v_uid;
end;
$$;

create or replace function api.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      cancelled_at = now()
  where user_id = auth.uid()
    and status = 'pending';
end;
$$;

create or replace function api.archive_and_remove_account_rows(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_user_id in (
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ) then
    raise exception 'protected account cannot be deleted';
  end if;

  insert into public.candidate_archive (
    former_user_id, display_name, party, office_level, office_name,
    state_code, city_name, cycle, incumbency, reason
  )
  select cp.user_id, cp.display_name, cp.party, cp.office_level, cp.office_name,
         cp.state_code, cp.city_name, cp.cycle::text, cp.incumbency, 'account_deleted'
  from public.candidate_profiles cp
  where cp.user_id = p_user_id
    and cp.approval_status = 'approved'::approval_status
  on conflict (former_user_id, reason) do nothing;

  delete from public.candidate_profiles where user_id = p_user_id;
  delete from public.app_users where auth_sub = p_user_id;
end;
$$;

revoke all on function api.my_account_deletion() from public, anon;
revoke all on function api.request_account_deletion() from public, anon;
revoke all on function api.cancel_account_deletion() from public, anon;
revoke all on function api.archive_and_remove_account_rows(uuid) from public, anon, authenticated;

grant execute on function api.my_account_deletion() to authenticated;
grant execute on function api.request_account_deletion() to authenticated;
grant execute on function api.cancel_account_deletion() to authenticated;
grant execute on function api.archive_and_remove_account_rows(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
