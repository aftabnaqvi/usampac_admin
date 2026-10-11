-- Expose FEC / FPPC / Agency numbers to admin UI (Pending & Approved pages).
-- Run in Supabase SQL Editor.
-- api.candidate_profiles is a VIEW; you must add columns to the BASE TABLE, then recreate views.

-- 1. Add columns to the BASE TABLE. Use the table that your register_candidate RPC writes to.
--    If this fails with "relation does not exist", find the table name in Supabase (Table Editor)
--    and replace public.candidate_profiles with it (e.g. public.candidates).
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS fec_filing_number text,
  ADD COLUMN IF NOT EXISTS state_filing_number text,
  ADD COLUMN IF NOT EXISTS election_agency_number text;

-- 2. Recreate api.candidate_profiles VIEW so it includes the new columns.
--    Get the current view definition from: Supabase Dashboard → SQL Editor →
--    "SELECT definition FROM pg_views WHERE schemaname = 'api' AND viewname = 'candidate_profiles';"
--    Then add fec_filing_number, state_filing_number, election_agency_number to the SELECT.
--
-- If the view is simply "SELECT * FROM public.candidate_profiles", run this:
DROP VIEW IF EXISTS api.candidate_profiles_pending CASCADE;
DROP VIEW IF EXISTS api.candidate_profiles_admin CASCADE;
DROP VIEW IF EXISTS api.candidate_profiles CASCADE;
CREATE VIEW api.candidate_profiles AS
  SELECT * FROM public.candidate_profiles;

-- Recreate dependent views (adjust WHERE and column list to match your setup).
-- candidate_profiles_pending: pending approvals only.
CREATE VIEW api.candidate_profiles_pending AS
  SELECT * FROM api.candidate_profiles
  WHERE approval_status = 'pending';

-- candidate_profiles_admin: all profiles for admin (pending + approved + rejected).
CREATE VIEW api.candidate_profiles_admin AS
  SELECT * FROM api.candidate_profiles;

-- 3. Restore permissions so registration (RPC) and app can read/write (fixes HTTP 403).
GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON api.candidate_profiles TO anon, authenticated;
GRANT SELECT ON api.candidate_profiles_pending TO anon, authenticated;
GRANT SELECT ON api.candidate_profiles_admin TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.candidate_profiles TO anon, authenticated;
