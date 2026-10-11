-- Fix "permission denied for view candidate_profiles" (HTTP 403 on registration).
-- Run in Supabase SQL Editor after creating/recreating api.candidate_profiles.

-- Allow app roles to read and write via the view (registration uses RPC that writes to candidate_profiles).
GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON api.candidate_profiles TO anon, authenticated;

-- Dependent views: admin and pending need SELECT for admin UI and for RPC that may read them.
GRANT SELECT ON api.candidate_profiles_pending TO anon, authenticated;
GRANT SELECT ON api.candidate_profiles_admin TO anon, authenticated;

-- Underlying table: RPC may write to public.candidate_profiles; ensure roles can if RPC uses INVOKER.
GRANT SELECT, INSERT, UPDATE ON public.candidate_profiles TO anon, authenticated;
