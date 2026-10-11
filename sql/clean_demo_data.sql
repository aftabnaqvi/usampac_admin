-- Clean up demo candidate records so App Store screenshots do not show test data.
-- Run in Supabase SQL Editor. Safe to run before or after fix_anon_exposure.sql.
--
-- Fixes three things visible in the screenshots:
--   1. Numbered placeholder names  - "Syed-4 Naqvi", "Syed-9 N", "S N"
--   2. Duplicate names             - two records read "Syed Naqvi / Mayor / San Jose"
--   3. Broken office names         - "Governed", "City Counsel", "US-Senate" vs "Senate"
--
-- Every statement targets a specific user_id, so re-running is harmless and no
-- other record can be caught by accident. Records already reading correctly
-- (Kumail Zaidi, Zahra Naqvi, Batool Naqvi, Mustafa Tajri, Syed Jafri, Azam
-- Zaidi, Shahid Lahore, Syed Zaidi, Istafa Zaidi) are left alone.


-- ---------------------------------------------------------------------------
-- 1. Names. Distinct so no two rows in the same city and office look alike.
-- ---------------------------------------------------------------------------
update public.candidate_profiles set display_name = 'Hassan Naqvi'
  where user_id = '0ebc7cb3-62df-4528-bbd4-eebfe6cc460f';  -- was Syed-4 Naqvi   (Governor, San Jose CA)

update public.candidate_profiles set display_name = 'Amira Rahman'
  where user_id = 'bbf03445-084f-4a5c-98e0-b1e08c91a523';  -- was Syed-5 N       (US Senate, San Jose CA)

update public.candidate_profiles set display_name = 'Bilal Naqvi'
  where user_id = '08e706d0-7f56-46de-bf82-9aa886df357f';  -- was Syed-6 Naqvi   (Mayor, San Jose CA)

update public.candidate_profiles set display_name = 'Yusuf Karim'
  where user_id = '9358071b-2e71-401e-a8e3-6d6df6107155';  -- was Syed-7 Naqvi   (President, San Jose CA)

update public.candidate_profiles set display_name = 'Fatima Khan'
  where user_id = '0ec623a5-32d5-49ed-a086-75fa3ac837b0';  -- was Syed-8 Naqvi   (President, Austin TX)

update public.candidate_profiles set display_name = 'Omar Siddiqui'
  where user_id = '99ca7de3-1a02-44ef-9b4b-b2c774d1d907';  -- was Syed-9 N       (US Senate, Denver CO)

update public.candidate_profiles set display_name = 'Rizwan Ali'
  where user_id = '6b1a6ea1-5eff-4443-a817-2467405cf76c';  -- was S N            (Berkeley CA)

update public.candidate_profiles set display_name = 'Nadia Hussain'
  where user_id = 'd4ceef27-7f90-4587-86f0-6911cab5ba16';  -- was Syed           (City Council, San Jose CA)

-- Second of two identical "Syed Naqvi / Mayor / San Jose" rows.
update public.candidate_profiles set display_name = 'Imran Sheikh'
  where user_id = '4520b26d-72f2-424e-af7f-5370c88cb7c1';


-- ---------------------------------------------------------------------------
-- 2. Office names.
-- ---------------------------------------------------------------------------
update public.candidate_profiles set office_name = 'Governor'
  where user_id = '6b1a6ea1-5eff-4443-a817-2467405cf76c';  -- was "Governed"

update public.candidate_profiles set office_name = 'City Council'
  where user_id = 'd4ceef27-7f90-4587-86f0-6911cab5ba16';  -- was "City Counsel"

update public.candidate_profiles set office_name = 'State Senate'
  where user_id = '712b3698-adfe-4411-b3ee-770812c6c31e';  -- was bare "Senate", office_level = STATE

-- Normalise the hyphenated spelling to match the "US Senate" record already present.
update public.candidate_profiles set office_name = 'US Senate'
  where office_name = 'US-Senate';


-- ---------------------------------------------------------------------------
-- 3. Elected officials.
--
--    api.active_elected.id matches candidate_profiles.user_id, so these four are
--    the same people after promote_candidate_to_elected. If active_elected derives
--    candidate_name by joining the profile, step 1 already fixed them and this
--    section is a no-op. Check first:
--
--      select pg_get_viewdef('api.active_elected'::regclass, true);
--
--    If candidate_name is stored on a base table rather than joined, uncomment
--    below and set the table name to whatever the view definition shows.
-- ---------------------------------------------------------------------------
-- update public.<elected_base_table> set candidate_name = 'Omar Siddiqui'
--   where id = '99ca7de3-1a02-44ef-9b4b-b2c774d1d907';
-- update public.<elected_base_table> set candidate_name = 'Amira Rahman'
--   where id = 'bbf03445-084f-4a5c-98e0-b1e08c91a523';
-- update public.<elected_base_table> set candidate_name = 'Fatima Khan'
--   where id = '0ec623a5-32d5-49ed-a086-75fa3ac837b0';
-- update public.<elected_base_table> set candidate_name = 'Yusuf Karim'
--   where id = '9358071b-2e71-401e-a8e3-6d6df6107155';


-- ---------------------------------------------------------------------------
-- 4. Optional - three Mayor records carry office_level = 'STATE', which is why
--    they appear under the "STATEWIDE OFFICES" heading in the app. Mayor is a
--    local office. Fixing this makes the state list correct but removes three
--    rows from it, so it is left commented out as a deliberate choice.
-- ---------------------------------------------------------------------------
-- update public.candidate_profiles set office_level = 'local'
--   where office_name = 'Mayor' and office_level = 'STATE';


-- ---------------------------------------------------------------------------
-- 5. Verify.
-- ---------------------------------------------------------------------------
select display_name, office_name, office_level, city_name, state_code
from api.candidate_profiles
where approval_status = 'approved'
order by state_code, city_name, display_name;
