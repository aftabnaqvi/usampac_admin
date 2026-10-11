-- Hide ONE operator dummy from the public iOS directory.
-- Exact email only: naqviasyed+test@gmail.com
-- Do NOT use a +test@ wildcard — any other candidate could register that way
-- and disappear from the public list.
--
-- This script does not UPDATE or DELETE any candidate_profiles rows.
-- Admin Pending / Approved still show the dummy (with a TEST badge).
--
-- 1) Run inspect. Confirm public.candidates_by_city_prod (or api.*) kind.
-- 2) Run apply. If the city view has no email column, stop and paste inspect.

-- Inspect
select n.nspname as schema_name,
       c.relname,
       case c.relkind
         when 'r' then 'table'
         when 'v' then 'view'
         else c.relkind::text
       end as kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relname in (
  'candidates_public',
  'candidates_by_city_prod',
  'candidates_by_city',
  'candidate_profiles'
)
order by 1, 2;

select schemaname, viewname
from pg_views
where viewname in ('candidates_public', 'candidates_by_city_prod', 'candidates_by_city');


-- Apply — public directory only. No row changes.
create or replace view api.candidates_public as
select user_id, display_name, email, phone, party, office_level, office_name,
       state_code, city_name, cycle, incumbency, photo_url,
       bio,
       priority1_title, priority1_body,
       priority2_title, priority2_body,
       priority3_title, priority3_body,
       website_url, donate_url, twitter_url, facebook_url,
       instagram_url, linkedin_url, youtube_url,
       approval_status
from api.candidate_profiles
where approval_status = 'approved'
  and lower(trim(coalesce(email, ''))) <> 'naqviasyed+test@gmail.com';

alter view api.candidates_public set (security_invoker = off);
grant select on api.candidates_public to anon, authenticated;

notify pgrst, 'reload schema';
