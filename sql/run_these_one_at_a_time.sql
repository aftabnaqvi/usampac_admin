-- Run each block separately in Supabase SQL Editor (no "..." placeholders).

-- 1) Check if FEC is stored for pending candidates:
SELECT user_id, display_name, office_level, fec_filing_number, state_filing_number, election_agency_number
FROM public.candidate_profiles
WHERE approval_status = 'pending'
LIMIT 10;


-- 2) Get your register_candidate function definition (copy result, then edit and run CREATE OR REPLACE):
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'register_candidate';


-- 3) Backfill FEC for one candidate (replace the FEC and user_id, then run):
-- UPDATE public.candidate_profiles
-- SET fec_filing_number = '123456789012345678'
-- WHERE user_id = '057f95fc-ca63-49cf-99b5-487a9fab8ace';
