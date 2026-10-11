-- Your table has the columns but they're NULL → register_candidate RPC is not saving them.
-- Add the three parameters and wire them into the INSERT/UPDATE.

-- 1. Get your current function (run in Supabase SQL Editor, copy the result):
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'register_candidate';

-- 2. In the function definition, make these changes:

-- A) In the parameter list, add these three (with the rest of your params):
--    fec_filing_number text DEFAULT NULL,
--    state_filing_number text DEFAULT NULL,
--    election_agency_number text DEFAULT NULL

-- B) In the INSERT INTO public.candidate_profiles (your columns), add to the column list:
--    fec_filing_number, state_filing_number, election_agency_number

-- C) In the VALUES (your values), add (same order as the column list):
--    fec_filing_number, state_filing_number, election_agency_number

-- D) If your function has ON CONFLICT (user_id) DO UPDATE SET, add these lines to the SET list:
--    fec_filing_number = COALESCE(EXCLUDED.fec_filing_number, public.candidate_profiles.fec_filing_number),
--    state_filing_number = COALESCE(EXCLUDED.state_filing_number, public.candidate_profiles.state_filing_number),
--    election_agency_number = COALESCE(EXCLUDED.election_agency_number, public.candidate_profiles.election_agency_number)

-- 3. Save as CREATE OR REPLACE FUNCTION api.register_candidate(your params) AS $$ body $$ LANGUAGE plpgsql; and run it.

-- 4. Optional: backfill Kumail Zaidi (replace with real FEC if you have it):
-- UPDATE public.candidate_profiles
-- SET fec_filing_number = '000000000000000000'
-- WHERE user_id = '057f95fc-ca63-49cf-99b5-487a9fab8ace';
