-- Snapshot before candidate_soft_delete.sql Apply.
-- Creates new backup tables only. Does not UPDATE or DELETE candidate rows.

create table if not exists public.candidate_profiles_backup_20261011 as
select *
from public.candidate_profiles;

create table if not exists public.view_defs_backup_20261011 as
select schemaname, viewname, definition, now() as backed_up_at
from pg_views
where (schemaname, viewname) in (
  ('api', 'candidate_profiles'),
  ('api', 'candidate_profiles_admin'),
  ('api', 'candidate_profiles_pending'),
  ('api', 'candidates_public'),
  ('api', 'candidates_by_city_prod'),
  ('api', 'deleted_candidates_admin')
);

-- Confirm the snapshot. Expect the same count as live profiles.
select
  (select count(*) from public.candidate_profiles) as live_profiles,
  (select count(*) from public.candidate_profiles_backup_20261011) as backup_profiles,
  (select count(*) from public.view_defs_backup_20261011) as backed_up_views;
