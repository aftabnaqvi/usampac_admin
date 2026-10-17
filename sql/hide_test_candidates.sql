-- Hide operator dummy accounts from the public iOS directory.
-- Exact emails only:
--   naqviasyed+test@gmail.com        (our test candidate)
--   naqviasyed+applereview@gmail.com (Apple App Review demo, Alex Rivera)
-- Do NOT use a +test@ wildcard — any other candidate could register that way
-- and disappear from the public list.
--
-- No candidate_profiles rows are changed. The owner still sees their own profile
-- in Settings, and Admin Pending / Approved still list them.
--
-- Covers both views the app reads:
--   api.candidates_public       (profile and state lists)
--   api.candidates_by_city_prod (main candidate list)
-- Both keep "deleted_at is null" from candidate_soft_delete.sql.
-- Run in the Supabase SQL Editor.

begin;

create or replace view api.candidates_public as
select user_id,
       display_name,
       email,
       phone,
       party,
       office_level,
       office_name,
       state_code,
       city_name,
       cycle,
       incumbency,
       photo_url,
       bio,
       priority1_title,
       priority1_body,
       priority2_title,
       priority2_body,
       priority3_title,
       priority3_body,
       website_url,
       donate_url,
       twitter_url,
       facebook_url,
       instagram_url,
       linkedin_url,
       youtube_url,
       approval_status
from public.candidate_profiles
where approval_status = 'approved'::approval_status
  and deleted_at is null
  and lower(trim(coalesce(email, ''))) not in (
    'naqviasyed+test@gmail.com',
    'naqviasyed+applereview@gmail.com'
  );

create or replace view api.candidates_by_city_prod as
select c.candidate_id,
       c.candidate_name,
       c.party,
       c.incumbency,
       c.photo_url,
       c.race_id,
       c.office_level,
       c.office_name,
       c.cycle,
       c.city_id
from api.candidates_by_city c
union all
select cp.user_id as candidate_id,
       coalesce(cp.display_name, cp.email, 'Candidate'::text) as candidate_name,
       cp.party,
       coalesce(cp.incumbency, false) as incumbency,
       cp.photo_url,
       null::uuid as race_id,
       case
         when (lower(coalesce(cp.office_level, ''::text)) = any (array['federal'::text, 'us'::text, 'national'::text])) then 'federal'::office_level
         when (lower(coalesce(cp.office_level, ''::text)) = any (array['state'::text, 'statewide'::text, 'legislature'::text])) then 'state'::office_level
         when (lower(coalesce(cp.office_level, ''::text)) = any (array['local'::text, 'city'::text, 'county'::text, 'municipal'::text])) then 'local'::office_level
         else null::office_level
       end as office_level,
       cp.office_name,
       cp.cycle,
       cm.city_id
from public.candidate_profiles cp
left join api.city_meta cm
  on lower(cm.city_name) = lower(coalesce(cp.city_name, ''::text))
 and cm.state_code = coalesce(cp.state_code, ''::text)
where cp.approval_status = 'approved'::approval_status
  and cp.deleted_at is null
  and lower(trim(coalesce(cp.email, ''))) not in (
    'naqviasyed+test@gmail.com',
    'naqviasyed+applereview@gmail.com'
  );

grant select on api.candidates_public to anon, authenticated;
grant select on api.candidates_by_city_prod to anon, authenticated;

commit;

notify pgrst, 'reload schema';
