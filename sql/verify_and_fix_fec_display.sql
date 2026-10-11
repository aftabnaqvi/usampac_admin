-- Step 1: VERIFY (run in Supabase SQL Editor)
-- Do we have the columns? Is any FEC data stored?
SELECT
  user_id,
  display_name,
  office_level,
  fec_filing_number,
  state_filing_number,
  election_agency_number
FROM public.candidate_profiles
WHERE approval_status = 'pending'
LIMIT 10;

-- If fec_filing_number is always NULL, the register_candidate RPC is not saving it.
-- Then do Step 2.


-- Step 2: GET YOUR CURRENT RPC DEFINITION
-- Run this and copy the full output so you can add the three params:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'register_candidate';


-- Step 3: UPDATE THE RPC
-- Your function must:
-- A) Accept three extra parameters (name them exactly as below for Supabase/PostgREST):
--      fec_filing_number text DEFAULT NULL,
--      state_filing_number text DEFAULT NULL,
--      election_agency_number text DEFAULT NULL
--
-- B) In the INSERT into public.candidate_profiles, add to the column list:
--      fec_filing_number, state_filing_number, election_agency_number
--
-- C) In the VALUES (or in the SELECT for INSERT...SELECT), add the three params:
--      fec_filing_number, state_filing_number, election_agency_number
--
-- D) If you have ON CONFLICT (user_id) DO UPDATE SET, add:
--      fec_filing_number = COALESCE(EXCLUDED.fec_filing_number, candidate_profiles.fec_filing_number),
--      state_filing_number = COALESCE(EXCLUDED.state_filing_number, candidate_profiles.state_filing_number),
--      election_agency_number = COALESCE(EXCLUDED.election_agency_number, candidate_profiles.election_agency_number)
--
-- Then run: CREATE OR REPLACE FUNCTION api.register_candidate(your params) AS $$ body $$ LANGUAGE plpgsql;


-- Step 4: FOR EXISTING ROWS (e.g. Kumail Zaidi) – optional backfill
-- If a candidate already registered and the RPC wasn’t saving FEC before, you can set it manually:
--
-- UPDATE public.candidate_profiles
-- SET fec_filing_number = '123456789012345678'
-- WHERE user_id = '<their-auth-user-id>' AND office_level = 'FEDERAL';
