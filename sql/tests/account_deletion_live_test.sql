-- Live behavior test for api.archive_and_remove_account_rows.
-- Runs entirely inside one transaction and ROLLS BACK, so nothing is kept.
-- Paste into the Supabase SQL Editor and Run. Success shows one row:
-- "ALL PASS (rolled back, nothing kept)". Any failed assertion raises an
-- error naming the check, and the final select never runs.
--
-- Checks (the "no gap" list):
--   1. Protected admins / real candidates are refused.
--   2. A regular approved candidate is archived (no email/phone/photo) and removed.
--   3. A pending (not approved) candidate is removed without an archive row.
--   4. Operator test emails (+test, +applereview) are removed WITHOUT an archive row.
--   5. Nothing else in candidate_profiles is touched.

begin;

do $$
declare
  v_regular  uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_pending  uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_test     uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  v_review   uuid := 'aaaaaaaa-0000-4000-8000-000000000004';
  v_before   bigint;
  v_after    bigint;
  v_count    bigint;
  v_raised   boolean;
begin
  select count(*) into v_before from public.candidate_profiles;

  -- Fixtures. Email choice is the whole point of the test-account rule.
  insert into public.candidate_profiles (user_id, display_name, email, phone, office_level, office_name,
                                         state_code, city_name, cycle, approval_status)
  values
    (v_regular, 'Live Test Regular',  'livetest.regular@example.com', '555-0101', 'LOCAL', 'City Council', 'CA', 'Fremont',  2026, 'approved'),
    (v_pending, 'Live Test Pending',  'livetest.pending@example.com', '555-0102', 'LOCAL', 'School Board', 'CA', 'Fremont',  2026, 'pending'),
    (v_test,    'Live Test Dummy',    'naqviasyed+test@gmail.com',    '555-0103', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved'),
    (v_review,  'Live Test Reviewer', 'NaqviAsyed+AppleReview@gmail.com', '555-0104', 'STATE', 'State Assembly', 'CA', null, 2026, 'approved');

  -- 1. Protected people are refused, for every one of the four ids.
  foreach v_count in array array[1,2,3,4] loop
    v_raised := false;
    begin
      perform api.archive_and_remove_account_rows(
        (array['68d5d58a-066a-4f79-a56d-c7095c335abf',
               'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
               '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
               '712b3698-adfe-4411-b3ee-770812c6c31e'])[v_count]::uuid);
    exception when others then
      v_raised := sqlerrm like '%protected account%';
    end;
    if not v_raised then
      raise exception 'FAIL 1: protected id #% was not refused', v_count;
    end if;
  end loop;
  raise notice 'PASS 1: all four protected ids refused';

  -- 2. Regular approved candidate: archived without contact details, then removed.
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
  raise notice 'PASS 2: approved candidate archived (no contact details) and removed';

  -- 3. Pending candidate: removed, no archive row.
  perform api.archive_and_remove_account_rows(v_pending);
  if exists (select 1 from public.candidate_archive where former_user_id = v_pending) then
    raise exception 'FAIL 3: pending candidate must not be archived';
  end if;
  if exists (select 1 from public.candidate_profiles where user_id = v_pending) then
    raise exception 'FAIL 3: pending candidate profile still present';
  end if;
  raise notice 'PASS 3: pending candidate removed without archive';

  -- 4. Operator test emails: removed, never archived (case/space insensitive).
  --    Also drop the api.app_users row, whose email is unique and otherwise blocks re-registration.
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
  raise notice 'PASS 4: +test and +applereview removed without archive';

  -- 5. Nothing else was touched.
  select count(*) into v_after from public.candidate_profiles;
  if v_after <> v_before then
    raise exception 'FAIL 5: candidate_profiles count changed from % to %', v_before, v_after;
  end if;
  raise notice 'PASS 5: no other profiles touched (% rows before and after)', v_before;

  -- 6. The public views never show the two operator emails even when approved.
  --    (Fixtures above were already removed; re-insert one to check the view.)
  insert into public.candidate_profiles (user_id, display_name, email, office_level, office_name, state_code, city_name, cycle, approval_status)
  values (v_test, 'Live Test Dummy', 'naqviasyed+test@gmail.com', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved');
  if exists (select 1 from api.candidates_public where user_id = v_test) then
    raise exception 'FAIL 6: candidates_public shows the +test account';
  end if;
  if exists (select 1 from api.candidates_by_city_prod where candidate_id = v_test) then
    raise exception 'FAIL 6: candidates_by_city_prod shows the +test account';
  end if;
  raise notice 'PASS 6: public views hide the operator test email';

  raise notice 'ALL PASS';
end $$;

rollback;

select 'ALL PASS (rolled back, nothing kept)' as result;
