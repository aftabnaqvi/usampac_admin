-- Close the anonymous exposure created by sql/grant_candidate_profiles_permissions.sql.
-- Run in Supabase SQL Editor, in the numbered order below.
--
-- Background: that earlier file cleared a 403 on candidate registration by granting
--   GRANT SELECT, INSERT, UPDATE ON api.candidate_profiles TO anon, authenticated;
-- The anon key is compiled into the iOS app (Config.swift), so every one of those
-- rights is available to anyone who extracts it from the binary. Confirmed live:
--   * readable  - 23 candidate emails, phones, reviewer_notes, approval metadata,
--                 filing numbers, 1 pending application, 25 app_users emails
--   * writable  - UPDATE on candidate_profiles, including approval_status, which
--                 lets an applicant approve themselves and skip the review queue
--
-- Steps 1 and 3 are safe to run immediately. Step 2 requires the matching iOS build
-- (the one that reads api.candidates_public) to be live first.


-- ---------------------------------------------------------------------------
-- 0. Record what is granted today. Keep this output as the rollback reference.
-- ---------------------------------------------------------------------------
select table_schema,
       table_name,
       grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema in ('api', 'public')
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_schema, table_name, grantee
order by table_schema, table_name, grantee;


-- ---------------------------------------------------------------------------
-- 1. URGENT - revoke anonymous writes. Run this now.
--
--    Safe to run ahead of any app release: every write path in the iOS app
--    sends a bearer token and therefore runs as 'authenticated', not 'anon'.
--    After running, re-test candidate registration once. register_candidate
--    should be SECURITY DEFINER; if it is INVOKER and is ever called before
--    sign-in, it would need its own grant rather than a blanket anon grant.
-- ---------------------------------------------------------------------------
revoke insert, update on api.candidate_profiles    from anon;
revoke insert, update on public.candidate_profiles from anon;


-- ---------------------------------------------------------------------------
-- 2. Replace the app's read path, then revoke anonymous reads.
--
--    2a creates the view. Ship the iOS build that reads candidates_public.
--    Only then run 2b, or candidate browsing breaks for every install.
-- ---------------------------------------------------------------------------

-- 2a. Publishable columns only. Email and phone are included deliberately as
--     campaign contact details; the candidate enters both and the registration
--     and settings screens now say they appear publicly. Excluded: reviewer_notes,
--     approved_by, approval timestamps, and the three filing-number columns.
create or replace view api.candidates_public as
select user_id, display_name, email, phone, party, office_level, office_name,
       state_code, city_name, cycle, incumbency, photo_url,
       bio,
       priority1_title, priority1_body,
       priority2_title, priority2_body,
       priority3_title, priority3_body,
       website_url, donate_url, twitter_url, facebook_url,
       instagram_url, linkedin_url, youtube_url,
       approval_status
from api.candidate_profiles
where approval_status = 'approved';

-- Runs as the view owner so the app needs no rights on the base table.
alter view api.candidates_public set (security_invoker = off);

grant usage  on schema api          to anon, authenticated;
grant select on api.candidates_public to anon, authenticated;

-- 2b. Only after the new iOS build is live.
revoke select on api.candidate_profiles           from anon;
revoke select on public.candidate_profiles        from anon;
revoke select on api.candidate_profiles_admin     from anon;
revoke select on api.candidate_profiles_pending   from anon;
revoke select on api.app_users                    from anon;
revoke select on api.deleted_candidates_admin     from anon;
revoke select on api.deleted_elected_terms_admin  from anon;


-- ---------------------------------------------------------------------------
-- 3. Give service_role the grants it never had.
--
--    This is why lib/supabaseAdmin.ts and the Admins page throw today:
--    every request returns 42501 "permission denied for view".
-- ---------------------------------------------------------------------------
grant usage on schema api to service_role;
grant select, insert, update, delete on all tables in schema api to service_role;
grant execute on all functions in schema api to service_role;


-- ---------------------------------------------------------------------------
-- 4. Optional - lock the admin views to admins only.
--
--    'authenticated' means any voter who registers in the app, so these views
--    are still readable by ordinary users after step 2b. Run this only once the
--    admin pages read through supabaseAdmin() (service role) instead of
--    supabaseServer() (the logged-in user's JWT), or the dashboard will break.
-- ---------------------------------------------------------------------------
-- revoke select on api.candidate_profiles_admin     from authenticated;
-- revoke select on api.candidate_profiles_pending   from authenticated;
-- revoke select on api.deleted_candidates_admin     from authenticated;
-- revoke select on api.deleted_elected_terms_admin  from authenticated;


-- ---------------------------------------------------------------------------
-- 5. Verify. Re-run step 0 and confirm anon holds no rights on the tables
--    above, then check from the shell:
--
--      # expect 401 / "permission denied for view"
--      curl -s -o /dev/null -w '%{http_code}\n' \
--        "$SUPABASE_URL/rest/v1/candidate_profiles_admin?select=email&limit=1" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--        -H "Accept-Profile: api"
--
--      # expect 200, and no reviewer_notes or approval metadata in the payload
--      curl -s "$SUPABASE_URL/rest/v1/candidates_public?select=*&limit=1" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--        -H "Accept-Profile: api"
-- ---------------------------------------------------------------------------
