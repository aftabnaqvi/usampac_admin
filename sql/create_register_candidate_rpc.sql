-- Create the register_candidate RPC so the app stops getting 404.
-- Run this in Supabase SQL Editor (one block). Parameter names must match exactly what the app sends.
--
-- Requires: public.candidate_profiles has user_id (PK or UNIQUE), display_name, email, phone, party, bio,
--   office_level, office_name, state_code, cycle, incumbency, approval_status,
--   fec_filing_number, state_filing_number, election_agency_number.
-- If you get "no unique or exclusion constraint matching ON CONFLICT", add: UNIQUE(user_id) on public.candidate_profiles.

CREATE OR REPLACE FUNCTION api.register_candidate(
  first_name text,
  last_name text,
  email text,
  state_code text,
  phone text DEFAULT NULL,
  city_id text DEFAULT NULL,
  office_type text DEFAULT NULL,
  office_name text DEFAULT NULL,
  party text DEFAULT NULL,
  bio text DEFAULT NULL,
  cycle integer DEFAULT NULL,
  incumbency boolean DEFAULT NULL,
  fec_filing_number text DEFAULT NULL,
  state_filing_number text DEFAULT NULL,
  election_agency_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, api
AS $$
DECLARE
  uid uuid;
  display text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  display := trim(trim(coalesce(first_name, '')) || ' ' || trim(coalesce(last_name, '')));

  INSERT INTO public.candidate_profiles (
    user_id,
    display_name,
    email,
    phone,
    party,
    bio,
    office_level,
    office_name,
    state_code,
    cycle,
    incumbency,
    fec_filing_number,
    state_filing_number,
    election_agency_number,
    approval_status
  ) VALUES (
    uid,
    NULLIF(display, ''),
    email,
    phone,
    party,
    bio,
    office_type,
    office_name,
    state_code,
    cycle,
    incumbency,
    fec_filing_number,
    state_filing_number,
    election_agency_number,
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, candidate_profiles.display_name),
    email = COALESCE(EXCLUDED.email, candidate_profiles.email),
    phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
    party = COALESCE(EXCLUDED.party, candidate_profiles.party),
    bio = COALESCE(EXCLUDED.bio, candidate_profiles.bio),
    office_level = COALESCE(EXCLUDED.office_level, candidate_profiles.office_level),
    office_name = COALESCE(EXCLUDED.office_name, candidate_profiles.office_name),
    state_code = COALESCE(EXCLUDED.state_code, candidate_profiles.state_code),
    cycle = COALESCE(EXCLUDED.cycle, candidate_profiles.cycle),
    incumbency = COALESCE(EXCLUDED.incumbency, candidate_profiles.incumbency),
    fec_filing_number = COALESCE(EXCLUDED.fec_filing_number, candidate_profiles.fec_filing_number),
    state_filing_number = COALESCE(EXCLUDED.state_filing_number, candidate_profiles.state_filing_number),
    election_agency_number = COALESCE(EXCLUDED.election_agency_number, candidate_profiles.election_agency_number);

  RETURN json_build_object(
    'id', uid,
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'message', 'Candidate registered successfully'
  );
END;
$$;

-- Expose the function to PostgREST (api schema is usually exposed by default).
GRANT EXECUTE ON FUNCTION api.register_candidate(text, text, text, text, text, text, text, text, text, text, integer, boolean, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION api.register_candidate IS 'Register or update candidate profile; user_id from JWT. Matches iOS app RPC params.';
