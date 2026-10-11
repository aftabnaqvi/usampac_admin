-- Persist FEC / FPPC / Agency numbers when a candidate registers.
-- The app sends fec_filing_number, state_filing_number, election_agency_number;
-- the RPC must accept them and write to public.candidate_profiles.

-- 1. See your current function (run in SQL Editor to inspect):
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'register_candidate';

-- 2. Add the three parameters and include them in the INSERT/UPDATE.
--    Below is an EXAMPLE. Replace with your actual register_candidate logic,
--    adding the three new params and columns.

-- Example: if your function inserts like this, add the new columns:
--
-- INSERT INTO public.candidate_profiles (
--   user_id, first_name, last_name, email, state_code, city_id, office_type, office_name,
--   party, bio, cycle, incumbency,
--   fec_filing_number, state_filing_number, election_agency_number  -- add these
-- ) VALUES (
--   p_user_id, p_first_name, p_last_name, p_email, p_state_code, p_city_id, p_office_type, p_office_name,
--   p_party, p_bio, p_cycle, p_incumbency,
--   p_fec_filing_number, p_state_filing_number, p_election_agency_number  -- add these
-- );

-- 3. If the function uses UPSERT (ON CONFLICT DO UPDATE), add to the UPDATE too:
--
-- ON CONFLICT (user_id) DO UPDATE SET
--   first_name = EXCLUDED.first_name,
--   ...
--   fec_filing_number = EXCLUDED.fec_filing_number,
--   state_filing_number = EXCLUDED.state_filing_number,
--   election_agency_number = EXCLUDED.election_agency_number;

-- 4. Function signature: add the three parameters (names must match what the app sends).
--    Supabase maps JSON keys to parameter names. The app sends:
--    fec_filing_number, state_filing_number, election_agency_number
--
-- So your function header should include:
--   p_fec_filing_number text DEFAULT NULL,
--   p_state_filing_number text DEFAULT NULL,
--   p_election_agency_number text DEFAULT NULL
--
-- And in the RPC call from the client, Supabase may expect either snake_case parameter names
-- in the JSON body (fec_filing_number) or the function params (p_fec_filing_number).
-- If the RPC still doesn't receive them, try adding parameters named exactly:
--   fec_filing_number text DEFAULT NULL,
--   state_filing_number text DEFAULT NULL,
--   election_agency_number text DEFAULT NULL

-- Quick check: confirm columns exist and are writable.
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'candidate_profiles'
-- AND column_name IN ('fec_filing_number', 'state_filing_number', 'election_agency_number');
