-- =============================================================================
-- FIRST-TIME PRODUCTION RESET — Clean dummy/test data for a production-ready DB
-- =============================================================================
--
-- Use this once when going live: remove test candidates and elected data so real
-- candidates can use the app. Polls, notifications, and quizzes are KEPT so you
-- can launch with empty candidate data but existing content if you want.
--
-- For ongoing testing after production: use a separate Supabase project (e.g.
-- a "staging" or "test" database) instead of resetting production again.
--
-- Run in: Supabase Dashboard → SQL Editor (postgres or service role).
--
-- KEEPS:
--   • Reference: states, cities, state_election_agencies, office_options, app_config
--   • Content (for first launch): polls, notifications, quizzes
--
-- DELETES (user/candidate data only):
--   • public.candidate_profiles (all candidate registrations)
--   • public.app_users (app user roles)
--   • Elected officials (base table — adjust name below if yours differs)
--
-- After running: Delete test Auth users in Dashboard → Authentication → Users
-- if you want a fully clean production (this script does not delete auth.users).
-- =============================================================================

BEGIN;

-- 1. Candidates and app users
DELETE FROM public.candidate_profiles;
DELETE FROM public.app_users;

-- 2. Elected officials (base table; active_elected is usually a view on this)
--    If you get "relation does not exist", find your table (e.g. elected_terms,
--    elected_officials) in Table Editor and use that name instead.
DELETE FROM public.elected_terms;
-- DELETE FROM public.elected;              -- uncomment if your table is "elected"
-- DELETE FROM public.deleted_elected_terms; -- if you have a soft-delete table to clear

-- 3. Optional — reset app config. Uncomment only if you want to clear election_range etc.
-- DELETE FROM public.app_config;
-- DELETE FROM api.app_config;

COMMIT;

-- =============================================================================
-- Auth: This script does NOT delete auth.users. To remove test sign-ups:
--   Dashboard → Authentication → Users → delete test accounts, or
--   SQL (service role):  DELETE FROM auth.users;
-- =============================================================================
