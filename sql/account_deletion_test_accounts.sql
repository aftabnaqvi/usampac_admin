-- Operator test accounts are deleted outright, never archived as election history.
-- Replaces api.archive_and_remove_account_rows from account_deletion.sql (kept in sync there).
-- Same exact emails as hide_test_candidates.sql. Run in the Supabase SQL Editor.

begin;

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

  -- Operator test accounts are not election history: delete them outright.
  insert into public.candidate_archive (
    former_user_id, display_name, party, office_level, office_name,
    state_code, city_name, cycle, incumbency, reason
  )
  select cp.user_id, cp.display_name, cp.party, cp.office_level, cp.office_name,
         cp.state_code, cp.city_name, cp.cycle::text, cp.incumbency, 'account_deleted'
  from public.candidate_profiles cp
  where cp.user_id = p_user_id
    and cp.approval_status = 'approved'::approval_status
    and lower(trim(coalesce(cp.email, ''))) not in (
      'naqviasyed+test@gmail.com',
      'naqviasyed+applereview@gmail.com'
    )
  on conflict (former_user_id, reason) do nothing;

  delete from public.candidate_profiles where user_id = p_user_id;
  delete from public.app_users where auth_sub = p_user_id;
  -- api.app_users stores the login id and a unique email. Leaving the row blocks that email from registering again.
  delete from api.app_users where id = p_user_id;
end;
$$;

revoke all on function api.archive_and_remove_account_rows(uuid) from public, anon, authenticated;
grant execute on function api.archive_and_remove_account_rows(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
