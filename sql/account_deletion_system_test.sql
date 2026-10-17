-- Database system test for account deletion.
-- Run once in the Supabase SQL Editor. After that, `npm test` calls the function.
--
-- api.run_account_deletion_system_test() inserts fixtures, checks them, then
-- rolls those writes back before it returns. A failed check raises and rolls
-- back too. Nothing is kept.
--
-- api.cleanup_account_deletion_system_fixture() removes only rows whose email
-- is systemtest.<id>@example.com. The web system test uses it in a finally
-- block. It refuses every other account, including the protected people.

begin;

create or replace function api.run_account_deletion_system_test()
returns text
language plpgsql
security definer
set search_path = public, api, auth
as $$
declare
  v_regular  uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_pending  uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_test     uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  v_review   uuid := 'aaaaaaaa-0000-4000-8000-000000000004';
  v_before   bigint;
  v_after    bigint;
  v_count    bigint;
  v_i        int;
  v_raised   boolean;
  v_protected uuid[] := array[
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ];
begin
  begin
    select count(*) into v_before from public.candidate_profiles;

    insert into public.candidate_profiles (
      user_id, display_name, email, phone, office_level, office_name,
      state_code, city_name, cycle, approval_status
    )
    values
      (v_regular, 'Live Test Regular',  'livetest.regular@example.com', '555-0101', 'LOCAL', 'City Council', 'CA', 'Fremont',  2026, 'approved'),
      (v_pending, 'Live Test Pending',  'livetest.pending@example.com', '555-0102', 'LOCAL', 'School Board', 'CA', 'Fremont',  2026, 'pending'),
      (v_test,    'Live Test Dummy',    'naqviasyed+test@gmail.com',    '555-0103', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved'),
      (v_review,  'Live Test Reviewer', 'NaqviAsyed+AppleReview@gmail.com', '555-0104', 'STATE', 'State Assembly', 'CA', null, 2026, 'approved');

    for v_i in 1..4 loop
      v_raised := false;
      begin
        perform api.archive_and_remove_account_rows(v_protected[v_i]);
      exception when others then
        v_raised := sqlerrm like '%protected account%';
      end;
      if not v_raised then
        raise exception 'FAIL 1: protected id #% was not refused', v_i;
      end if;
    end loop;

    perform api.archive_and_remove_account_rows(v_regular);
    select count(*) into v_count from public.candidate_archive
     where former_user_id = v_regular and reason = 'account_deleted'
       and display_name = 'Live Test Regular' and office_name = 'City Council'
       and city_name = 'Fremont' and state_code = 'CA' and cycle = '2026';
    if v_count <> 1 then raise exception 'FAIL 2: regular candidate not archived correctly'; end if;
    if exists (select 1 from public.candidate_profiles where user_id = v_regular) then
      raise exception 'FAIL 2: regular candidate profile still present';
    end if;
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'candidate_archive'
                  and column_name in ('email', 'phone', 'photo_url', 'bio')) then
      raise exception 'FAIL 2: candidate_archive must not carry email/phone/photo/bio columns';
    end if;

    perform api.archive_and_remove_account_rows(v_pending);
    if exists (select 1 from public.candidate_archive where former_user_id = v_pending) then
      raise exception 'FAIL 3: pending candidate must not be archived';
    end if;
    if exists (select 1 from public.candidate_profiles where user_id = v_pending) then
      raise exception 'FAIL 3: pending candidate profile still present';
    end if;

    insert into api.app_users (id, email, persona_requested)
    values (v_test, 'livetest.dummy.appuser@example.com', 'CANDIDATE');
    perform api.archive_and_remove_account_rows(v_test);
    perform api.archive_and_remove_account_rows(v_review);
    if exists (select 1 from public.candidate_archive where former_user_id in (v_test, v_review)) then
      raise exception 'FAIL 4: test / app-review account was archived';
    end if;
    if exists (select 1 from public.candidate_profiles where user_id in (v_test, v_review)) then
      raise exception 'FAIL 4: test / app-review profile still present';
    end if;
    if exists (select 1 from api.app_users where id = v_test) then
      raise exception 'FAIL 4: api.app_users row still present';
    end if;

    select count(*) into v_after from public.candidate_profiles;
    if v_after <> v_before then
      raise exception 'FAIL 5: candidate_profiles count changed from % to %', v_before, v_after;
    end if;

    insert into public.candidate_profiles (
      user_id, display_name, email, office_level, office_name, state_code, city_name, cycle, approval_status
    )
    values (v_test, 'Live Test Dummy', 'naqviasyed+test@gmail.com', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved');
    if exists (select 1 from api.candidates_public where user_id = v_test) then
      raise exception 'FAIL 6: candidates_public shows the +test account';
    end if;
    if exists (select 1 from api.candidates_by_city_prod where candidate_id = v_test) then
      raise exception 'FAIL 6: candidates_by_city_prod shows the +test account';
    end if;

    insert into public.account_deletion_requests (user_id, email, status)
    values (v_test, 'naqviasyed+test@gmail.com', 'pending');
    update public.account_deletion_requests
       set status = 'cancelled', cancelled_at = now()
     where user_id = v_test and status = 'pending';
    update public.account_deletion_requests
       set status = 'pending', cancelled_at = null
     where user_id = v_test and status = 'cancelled';
    perform api.archive_and_remove_account_rows(v_test);
    if (select email from public.account_deletion_requests where user_id = v_test)
         is distinct from 'naqviasyed+test@gmail.com' then
      raise exception 'FAIL 7: deletion history lost the account email';
    end if;

    raise exception 'USAMPAC_TEST_ROLLBACK';
  exception
    when others then
      if sqlerrm = 'USAMPAC_TEST_ROLLBACK' then
        return 'ALL PASS (rolled back, nothing kept)';
      end if;
      raise;
  end;
end;
$$;

revoke all on function api.run_account_deletion_system_test() from public, anon, authenticated;
grant execute on function api.run_account_deletion_system_test() to service_role;

create or replace function api.cleanup_account_deletion_system_fixture(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, api, auth
as $$
declare
  v_email text;
begin
  if p_user_id in (
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ) then
    raise exception 'protected account cannot be deleted';
  end if;

  select coalesce(
    (select email from auth.users where id = p_user_id),
    (select email from public.account_deletion_requests where user_id = p_user_id),
    (select email from public.candidate_profiles where user_id = p_user_id)
  ) into v_email;

  if v_email is null or v_email !~ '^systemtest\.[0-9a-f-]+@example\.com$' then
    raise exception 'refusing to clean a non-test account';
  end if;

  delete from public.candidate_archive where former_user_id = p_user_id;
  delete from public.account_deletion_requests where user_id = p_user_id;
  delete from public.candidate_profiles where user_id = p_user_id;
  delete from public.app_users where auth_sub = p_user_id;
  delete from api.app_users where id = p_user_id;
end;
$$;

revoke all on function api.cleanup_account_deletion_system_fixture(uuid) from public, anon, authenticated;
grant execute on function api.cleanup_account_deletion_system_fixture(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
