-- Soft-delete candidates from Admin → Manage.
-- Delete sets public.candidate_profiles.deleted_at.
-- Restore clears that flag. Rows, Auth, and app_users are not removed.
--
-- Inspect confirmed:
--   public.candidate_profiles = table
--   api.* = views with explicit columns (not SELECT *)
--   candidates_by_city_prod = UNION of seed list + approved profiles
-- Do not rename the city view. Keep its UNION and add deleted_at is null.

-- Apply
begin;

alter table public.candidate_profiles
  add column if not exists deleted_at timestamptz;

create or replace view api.candidate_profiles as
select user_id,
       display_name,
       photo_url,
       bio,
       website,
       donate_url,
       social_links,
       last_user_edit_at,
       last_admin_edit_at,
       email,
       phone,
       party,
       website_url,
       twitter_url,
       facebook_url,
       instagram_url,
       linkedin_url,
       youtube_url,
       office_level,
       office_name,
       state_code,
       city_name,
       cycle,
       incumbency,
       approval_status,
       approved_by,
       approved_at,
       reviewer_notes,
       priority1_title,
       priority1_body,
       priority2_title,
       priority2_body,
       priority3_title,
       priority3_body,
       fec_filing_number,
       state_filing_number,
       election_agency_number,
       deleted_at
from public.candidate_profiles;

create or replace view api.candidate_profiles_admin as
select user_id,
       display_name,
       photo_url,
       bio,
       website,
       donate_url,
       social_links,
       last_user_edit_at,
       last_admin_edit_at,
       email,
       phone,
       party,
       website_url,
       twitter_url,
       facebook_url,
       instagram_url,
       linkedin_url,
       youtube_url,
       office_level,
       office_name,
       state_code,
       city_name,
       cycle,
       incumbency,
       approval_status,
       approved_by,
       approved_at,
       reviewer_notes,
       priority1_title,
       priority1_body,
       priority2_title,
       priority2_body,
       priority3_title,
       priority3_body,
       fec_filing_number,
       state_filing_number,
       election_agency_number,
       deleted_at
from public.candidate_profiles
where deleted_at is null;

create or replace view api.candidate_profiles_pending as
select user_id,
       display_name,
       photo_url,
       bio,
       website,
       donate_url,
       social_links,
       last_user_edit_at,
       last_admin_edit_at,
       email,
       phone,
       party,
       website_url,
       twitter_url,
       facebook_url,
       instagram_url,
       linkedin_url,
       youtube_url,
       office_level,
       office_name,
       state_code,
       city_name,
       cycle,
       incumbency,
       approval_status,
       approved_by,
       approved_at,
       reviewer_notes,
       priority1_title,
       priority1_body,
       priority2_title,
       priority2_body,
       priority3_title,
       priority3_body,
       fec_filing_number,
       state_filing_number,
       election_agency_number,
       deleted_at
from public.candidate_profiles
where approval_status = 'pending'::approval_status
  and deleted_at is null;

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
  and deleted_at is null;

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
  and cp.deleted_at is null;

create or replace view api.deleted_candidates_admin as
select user_id,
       display_name,
       email,
       office_level,
       office_name,
       city_name,
       state_code,
       cycle::text as cycle,
       deleted_at
from public.candidate_profiles
where deleted_at is not null;

create or replace function api.admin_soft_delete_candidate(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.candidate_profiles where user_id = p_user_id
  ) then
    raise exception 'candidate not found';
  end if;

  update public.candidate_profiles
  set deleted_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function api.admin_restore_candidate(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  update public.candidate_profiles
  set deleted_at = null
  where user_id = p_user_id;

  if not found then
    raise exception 'candidate not found';
  end if;
end;
$$;

grant select on api.candidate_profiles to anon, authenticated;
grant select, insert, update on api.candidate_profiles to authenticated;
grant select on api.candidate_profiles_admin to authenticated;
grant select on api.candidate_profiles_pending to authenticated;
grant select on api.candidates_public to anon, authenticated;
grant select on api.deleted_candidates_admin to authenticated;
grant select on api.candidates_by_city_prod to anon, authenticated;
grant execute on function api.admin_soft_delete_candidate(uuid) to authenticated, service_role;
grant execute on function api.admin_restore_candidate(uuid) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
