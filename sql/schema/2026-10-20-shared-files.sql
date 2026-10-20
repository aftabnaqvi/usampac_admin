-- USAMPAC live schema snapshot
-- Database: postgres
-- Captured: 2026-10-20 08:10 UTC
-- Schemas: public, api
-- Schema only. No table rows, passwords, or keys.
-- Track of the live database. Not a guaranteed restore script.

CREATE TYPE public.application_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.jurisdiction_kind AS ENUM ('federal_senate', 'federal_house_cd', 'state_senate', 'state_house', 'county', 'city', 'state');

CREATE TYPE public.office_level AS ENUM ('federal', 'state', 'county', 'city', 'local');

CREATE TYPE public.user_role AS ENUM ('VISITOR', 'CANDIDATE', 'ELECTED', 'ADMIN');

CREATE TABLE api.app_users (
  id uuid NOT NULL,
  email text NOT NULL,
  persona_requested text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE api.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  voter_user_id uuid,
  voter_device_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE api.states_backup_20251109_041550 (
  code text NOT NULL,
  name text NOT NULL
);

CREATE TABLE public.account_deletion_requests (
  user_id uuid NOT NULL,
  email text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  delete_after timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
  status text NOT NULL DEFAULT 'pending'::text,
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_error text,
  notified_at timestamp with time zone
);

CREATE TABLE public.admin_change_log (
  id bigint NOT NULL DEFAULT nextval('admin_change_log_id_seq'::regclass),
  actor_auth_sub uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  diff jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.app_config (
  key text NOT NULL,
  value text NOT NULL
);

CREATE TABLE public.app_telemetry (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  screen text,
  install_id uuid NOT NULL,
  app_version text,
  is_signed_in boolean NOT NULL DEFAULT false,
  audience text,
  city text,
  region text,
  link_kind text,
  target_kind text,
  target_id uuid
);

CREATE TABLE public.app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_sub uuid NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'VISITOR'::user_role,
  persona user_role NOT NULL DEFAULT 'VISITOR'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.candidate_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status application_status NOT NULL DEFAULT 'pending'::application_status,
  office_level office_level NOT NULL,
  office_name text NOT NULL,
  state_code text NOT NULL,
  city_id uuid,
  county_name text,
  district_ref text,
  party text,
  bio text,
  website text,
  donate_url text,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone,
  decided_at timestamp with time zone
);

CREATE TABLE public.candidate_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  former_user_id uuid NOT NULL,
  display_name text,
  party text,
  office_level text,
  office_name text,
  state_code text,
  city_name text,
  cycle text,
  incumbency boolean,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'account_deleted'::text
);

CREATE TABLE public.candidate_profiles (
  user_id uuid NOT NULL,
  display_name text,
  photo_url text,
  bio text,
  website text,
  donate_url text,
  social_links jsonb,
  last_user_edit_at timestamp with time zone,
  last_admin_edit_at timestamp with time zone,
  email text,
  phone text,
  party text,
  website_url text,
  twitter_url text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  youtube_url text,
  office_level text,
  office_name text,
  state_code text,
  city_name text,
  cycle integer,
  incumbency boolean,
  approval_status approval_status NOT NULL DEFAULT 'pending'::approval_status,
  approved_by uuid,
  approved_at timestamp with time zone,
  reviewer_notes text,
  priority1_title text,
  priority1_body text,
  priority2_title text,
  priority2_body text,
  priority3_title text,
  priority3_body text,
  fec_filing_number text,
  state_filing_number text,
  election_agency_number text,
  deleted_at timestamp with time zone
);

CREATE TABLE public.candidate_profiles_backup_20261011 (
  user_id uuid,
  display_name text,
  photo_url text,
  bio text,
  website text,
  donate_url text,
  social_links jsonb,
  last_user_edit_at timestamp with time zone,
  last_admin_edit_at timestamp with time zone,
  email text,
  phone text,
  party text,
  website_url text,
  twitter_url text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  youtube_url text,
  office_level text,
  office_name text,
  state_code text,
  city_name text,
  cycle integer,
  incumbency boolean,
  approval_status approval_status,
  approved_by uuid,
  approved_at timestamp with time zone,
  reviewer_notes text,
  priority1_title text,
  priority1_body text,
  priority2_title text,
  priority2_body text,
  priority3_title text,
  priority3_body text,
  fec_filing_number text,
  state_filing_number text,
  election_agency_number text
);

CREATE TABLE public.candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL,
  name text NOT NULL,
  party text,
  incumbency boolean NOT NULL DEFAULT false,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.candidates_by_city_clean (
  candidate_id uuid,
  candidate_name text,
  party text,
  incumbency boolean,
  photo_url text,
  race_id uuid,
  office_level office_level,
  office_name text,
  cycle integer,
  city_id uuid
);

CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  name text NOT NULL
);

CREATE TABLE public.city_jurisdiction (
  city_id uuid NOT NULL,
  jurisdiction_id uuid NOT NULL
);

CREATE TABLE public.city_meta (
  city_id uuid NOT NULL,
  city_name text,
  state_code text,
  jurisdictions jsonb
);

CREATE TABLE public.deleted_candidates (
  user_id uuid NOT NULL,
  display_name text,
  email text,
  office_level text,
  office_name text,
  city_name text,
  state_code text,
  cycle text,
  payload jsonb NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_by uuid
);

CREATE TABLE public.deleted_elected_terms (
  user_id uuid NOT NULL,
  candidate_name text,
  office_name text,
  level text,
  jurisdiction_name text,
  state_code text,
  payload jsonb NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_by uuid
);

CREATE TABLE public.elected_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  office_name text NOT NULL,
  level office_level NOT NULL,
  jurisdiction_id uuid NOT NULL,
  candidate_name text NOT NULL,
  party text,
  term_start date,
  term_end date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.jurisdictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind jurisdiction_kind NOT NULL DEFAULT 'city'::jurisdiction_kind,
  state_code text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  body text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text
);

CREATE TABLE public.office_options (
  id bigint NOT NULL DEFAULT nextval('office_options_id_seq'::regclass),
  level text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.political_parties (
  id text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  allows_write_in boolean NOT NULL DEFAULT false
);

CREATE TABLE public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  label text NOT NULL,
  "position" integer NOT NULL DEFAULT 0
);

CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text,
  title text NOT NULL,
  subtitle text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  "position" integer NOT NULL DEFAULT 0
);

CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text,
  prompt text NOT NULL,
  explanation text,
  "position" integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_user_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.race_jurisdiction (
  race_id uuid NOT NULL,
  jurisdiction_id uuid NOT NULL
);

CREATE TABLE public.races (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle integer NOT NULL,
  office_level office_level NOT NULL,
  office_name text NOT NULL,
  state_code text,
  election_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text
);

CREATE TABLE public.shared_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.state_election_agencies (
  state_code text NOT NULL,
  agency_number text NOT NULL,
  agency_name text NOT NULL,
  filing_number_label text,
  filing_number_placeholder text,
  filing_number_exact_length integer,
  filing_number_max_length integer,
  filing_number_required boolean
);

CREATE TABLE public.states (
  code text NOT NULL,
  name text NOT NULL
);

CREATE TABLE public.view_defs_backup_20261011 (
  schemaname name,
  viewname name,
  definition text,
  backed_up_at timestamp with time zone
);

CREATE SEQUENCE public.admin_change_log_id_seq;

CREATE SEQUENCE public.office_options_id_seq;

ALTER TABLE api.app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);

ALTER TABLE api.app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);

ALTER TABLE api.poll_votes ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);

ALTER TABLE api.states_backup_20251109_041550 ADD CONSTRAINT states_pkey PRIMARY KEY (code);

ALTER TABLE account_deletion_requests ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (user_id);

ALTER TABLE account_deletion_requests ADD CONSTRAINT account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'cancelled'::text, 'completed'::text])));

ALTER TABLE admin_change_log ADD CONSTRAINT admin_change_log_pkey PRIMARY KEY (id);

ALTER TABLE app_config ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);

ALTER TABLE app_telemetry ADD CONSTRAINT app_telemetry_pkey PRIMARY KEY (id);

ALTER TABLE app_users ADD CONSTRAINT app_users_auth_sub_key UNIQUE (auth_sub);

ALTER TABLE app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);

ALTER TABLE app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);

ALTER TABLE candidate_applications ADD CONSTRAINT candidate_applications_pkey PRIMARY KEY (id);

ALTER TABLE candidate_applications ADD CONSTRAINT candidate_applications_state_code_fkey FOREIGN KEY (state_code) REFERENCES states(code);

ALTER TABLE candidate_applications ADD CONSTRAINT candidate_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE candidate_archive ADD CONSTRAINT candidate_archive_pkey PRIMARY KEY (id);

ALTER TABLE candidate_profiles ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE candidate_profiles ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);

ALTER TABLE candidates ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);

ALTER TABLE candidates ADD CONSTRAINT candidates_race_id_fkey FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE;

ALTER TABLE cities ADD CONSTRAINT cities_pkey PRIMARY KEY (id);

ALTER TABLE cities ADD CONSTRAINT cities_state_code_fkey FOREIGN KEY (state_code) REFERENCES states(code) ON DELETE CASCADE;

ALTER TABLE city_jurisdiction ADD CONSTRAINT city_jurisdiction_city_id_fkey FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE;

ALTER TABLE city_jurisdiction ADD CONSTRAINT city_jurisdiction_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE CASCADE;

ALTER TABLE city_jurisdiction ADD CONSTRAINT city_jurisdiction_pkey PRIMARY KEY (city_id, jurisdiction_id);

ALTER TABLE city_meta ADD CONSTRAINT city_meta_city_id_fkey FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE;

ALTER TABLE city_meta ADD CONSTRAINT city_meta_pkey PRIMARY KEY (city_id);

ALTER TABLE deleted_candidates ADD CONSTRAINT deleted_candidates_pkey PRIMARY KEY (user_id);

ALTER TABLE deleted_elected_terms ADD CONSTRAINT deleted_elected_terms_pkey PRIMARY KEY (user_id);

ALTER TABLE elected_terms ADD CONSTRAINT elected_terms_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE CASCADE;

ALTER TABLE elected_terms ADD CONSTRAINT elected_terms_pkey PRIMARY KEY (id);

ALTER TABLE jurisdictions ADD CONSTRAINT jurisdictions_pkey PRIMARY KEY (id);

ALTER TABLE jurisdictions ADD CONSTRAINT jurisdictions_state_code_fkey FOREIGN KEY (state_code) REFERENCES states(code) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE office_options ADD CONSTRAINT office_options_pkey PRIMARY KEY (id);

ALTER TABLE political_parties ADD CONSTRAINT political_parties_pkey PRIMARY KEY (id);

ALTER TABLE poll_options ADD CONSTRAINT poll_options_pkey PRIMARY KEY (id);

ALTER TABLE poll_options ADD CONSTRAINT poll_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE;

ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);

ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE polls ADD CONSTRAINT polls_pkey PRIMARY KEY (id);

ALTER TABLE polls ADD CONSTRAINT polls_slug_key UNIQUE (slug);

ALTER TABLE quiz_options ADD CONSTRAINT quiz_options_pkey PRIMARY KEY (id);

ALTER TABLE quiz_options ADD CONSTRAINT quiz_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;

ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);

ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_slug_key UNIQUE (slug);

ALTER TABLE quiz_user_answers ADD CONSTRAINT quiz_user_answers_option_id_fkey FOREIGN KEY (option_id) REFERENCES quiz_options(id) ON DELETE CASCADE;

ALTER TABLE quiz_user_answers ADD CONSTRAINT quiz_user_answers_pkey PRIMARY KEY (id);

ALTER TABLE quiz_user_answers ADD CONSTRAINT quiz_user_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;

ALTER TABLE race_jurisdiction ADD CONSTRAINT race_jurisdiction_jurisdiction_id_fkey FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE CASCADE;

ALTER TABLE race_jurisdiction ADD CONSTRAINT race_jurisdiction_pkey PRIMARY KEY (race_id, jurisdiction_id);

ALTER TABLE race_jurisdiction ADD CONSTRAINT race_jurisdiction_race_id_fkey FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE;

ALTER TABLE races ADD CONSTRAINT races_pkey PRIMARY KEY (id);

ALTER TABLE races ADD CONSTRAINT races_state_code_fkey FOREIGN KEY (state_code) REFERENCES states(code);

ALTER TABLE shared_files ADD CONSTRAINT shared_files_pkey PRIMARY KEY (id);

ALTER TABLE shared_files ADD CONSTRAINT shared_files_storage_path_key UNIQUE (storage_path);

ALTER TABLE shared_files ADD CONSTRAINT shared_files_title_len CHECK (((char_length(title) >= 1) AND (char_length(title) <= 120)));

ALTER TABLE shared_files ADD CONSTRAINT shared_files_type CHECK ((content_type = ANY (ARRAY['application/pdf'::text, 'application/msword'::text, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text])));

ALTER TABLE state_election_agencies ADD CONSTRAINT state_election_agencies_pkey PRIMARY KEY (state_code);

ALTER TABLE states ADD CONSTRAINT states_pkey PRIMARY KEY (code);

CREATE INDEX poll_votes_option_idx ON api.poll_votes USING btree (option_id);

CREATE INDEX poll_votes_poll_idx ON api.poll_votes USING btree (poll_id);

CREATE UNIQUE INDEX poll_votes_unique_device ON api.poll_votes USING btree (poll_id, voter_device_id) WHERE (voter_device_id IS NOT NULL);

CREATE UNIQUE INDEX poll_votes_unique_user ON api.poll_votes USING btree (poll_id, voter_user_id) WHERE (voter_user_id IS NOT NULL);

CREATE INDEX account_deletion_requests_due_idx ON public.account_deletion_requests USING btree (status, delete_after);

CREATE INDEX app_telemetry_city_idx ON public.app_telemetry USING btree (city, occurred_at DESC);

CREATE INDEX app_telemetry_link_kind_idx ON public.app_telemetry USING btree (link_kind, occurred_at DESC);

CREATE INDEX app_telemetry_occurred_at_idx ON public.app_telemetry USING btree (occurred_at DESC);

CREATE INDEX app_telemetry_screen_idx ON public.app_telemetry USING btree (screen, occurred_at DESC);

CREATE UNIQUE INDEX candidate_archive_former_user_reason_idx ON public.candidate_archive USING btree (former_user_id, reason);

CREATE INDEX idx_admin_log_actor ON public.admin_change_log USING btree (actor_auth_sub);

CREATE INDEX idx_admin_log_entity ON public.admin_change_log USING btree (entity, entity_id);

CREATE INDEX idx_applications_status ON public.candidate_applications USING btree (status);

CREATE INDEX idx_applications_user ON public.candidate_applications USING btree (user_id);

CREATE INDEX idx_candidates_party ON public.candidates USING btree (party);

CREATE INDEX idx_candidates_race ON public.candidates USING btree (race_id);

CREATE INDEX idx_cbc_clean_candidate_city ON public.candidates_by_city_clean USING btree (candidate_id, city_id);

CREATE INDEX idx_cbc_clean_city ON public.candidates_by_city_clean USING btree (city_id);

CREATE INDEX idx_cities_state_name ON public.cities USING btree (state_code, name);

CREATE INDEX idx_elected_active_comp ON public.elected_terms USING btree (jurisdiction_id, level, term_end);

CREATE INDEX idx_elected_active_nulls ON public.elected_terms USING btree (jurisdiction_id, level) WHERE (term_end IS NULL);

CREATE INDEX idx_juris_state_kind_name ON public.jurisdictions USING btree (state_code, kind, name);

CREATE INDEX idx_races_cycle_level ON public.races USING btree (cycle, office_level);

CREATE INDEX notifications_published_at_idx ON public.notifications USING btree (published_at DESC);

CREATE UNIQUE INDEX office_options_level_label_idx ON public.office_options USING btree (level, label);

CREATE INDEX poll_options_poll_id_idx ON public.poll_options USING btree (poll_id);

CREATE INDEX poll_votes_poll_id_idx ON public.poll_votes USING btree (poll_id);

CREATE INDEX poll_votes_poll_id_option_id_idx ON public.poll_votes USING btree (poll_id, option_id);

CREATE INDEX poll_votes_user_id_idx ON public.poll_votes USING btree (user_id);

CREATE INDEX quiz_options_question_id_idx ON public.quiz_options USING btree (question_id);

CREATE INDEX quiz_user_answers_question_id_idx ON public.quiz_user_answers USING btree (question_id);

CREATE INDEX quiz_user_answers_user_id_idx ON public.quiz_user_answers USING btree (user_id);

CREATE OR REPLACE FUNCTION api.admin_restore_candidate(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  update public.candidate_profiles
  set deleted_at = null
  where user_id = p_user_id;

  if not found then
    raise exception 'candidate not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.admin_restore_elected(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  payload jsonb;
begin
  if not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  select de.payload into payload from public.deleted_elected_terms de where de.user_id = p_user_id;
  if payload is null then
    raise exception 'no deleted elected official found';
  end if;

  insert into public.elected_terms
  select * from jsonb_populate_record(null::public.elected_terms, payload->'elected_terms')
  on conflict do nothing;

  delete from public.deleted_elected_terms where user_id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.admin_set_user_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  p_email text;
  role_val public.user_role;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  select email into p_email from auth.users where id = p_user_id limit 1;
  if p_email is null then
    raise exception 'User not found in auth (sign up or accept invite first)';
  end if;

  if upper(trim(p_role)) = 'ADMIN' then
    role_val := 'ADMIN'::public.user_role;
  elsif upper(trim(p_role)) = 'USER' then
    role_val := 'VISITOR'::public.user_role;
  else
    role_val := p_role::public.user_role;
  end if;

  insert into public.app_users (auth_sub, role, email)
  values (p_user_id, role_val, p_email)
  on conflict (auth_sub) do update set role = excluded.role;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.admin_soft_delete_candidate(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.candidate_profiles where user_id = p_user_id
  ) then
    raise exception 'candidate not found';
  end if;

  update public.candidate_profiles
  set deleted_at = now()
  where user_id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.admin_soft_delete_elected(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  et public.elected_terms%rowtype;
  j public.jurisdictions%rowtype;
begin
  if not exists (
    select 1 from public.app_users
    where auth_sub = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'not authorized';
  end if;

  select * into et from public.elected_terms where id = p_user_id limit 1;
  select * into j from public.jurisdictions where id = et.jurisdiction_id limit 1;

  insert into public.deleted_elected_terms (
    user_id, candidate_name, office_name, level, jurisdiction_name, state_code, payload, deleted_by
  )
  values (
    p_user_id,
    et.candidate_name,
    et.office_name,
    et.level::text,
    j.name,
    j.state_code,
    jsonb_build_object('elected_terms', to_jsonb(et)),
    auth.uid()
  )
  on conflict (user_id) do update
  set payload = excluded.payload,
      candidate_name = excluded.candidate_name,
      office_name = excluded.office_name,
      level = excluded.level,
      jurisdiction_name = excluded.jurisdiction_name,
      state_code = excluded.state_code,
      deleted_at = now(),
      deleted_by = auth.uid();

  delete from public.elected_terms where id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.approve_candidate(p_user_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.candidate_profiles
     set approval_status='approved', approved_by=auth.uid(), approved_at=now(),
         reviewer_notes=coalesce(p_notes, reviewer_notes)
   where user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION api.archive_and_remove_account_rows(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if p_user_id in (
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ) then
    raise exception 'protected account cannot be deleted';
  end if;

  insert into public.candidate_archive (
    former_user_id, display_name, party, office_level, office_name,
    state_code, city_name, cycle, incumbency, reason
  )
  select cp.user_id, cp.display_name, cp.party, cp.office_level, cp.office_name,
         cp.state_code, cp.city_name, cp.cycle::text, cp.incumbency, 'account_deleted'
  from public.candidate_profiles cp
  where cp.user_id = p_user_id
    and cp.approval_status = 'approved'::approval_status
    and lower(trim(coalesce(cp.email, ''))) not in (
      'naqviasyed+test@gmail.com',
      'naqviasyed+applereview@gmail.com'
    )
  on conflict (former_user_id, reason) do nothing;

  delete from public.candidate_profiles where user_id = p_user_id;
  delete from public.app_users where auth_sub = p_user_id;
  delete from api.app_users where id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.cancel_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      cancelled_at = now()
  where user_id = auth.uid()
    and status = 'pending';
end;
$function$
;

CREATE OR REPLACE FUNCTION api.cleanup_account_deletion_system_fixture(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'api', 'auth'
AS $function$
declare
  v_email text;
begin
  if p_user_id in (
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ) then
    raise exception 'protected account cannot be deleted';
  end if;

  select coalesce(
    (select email from auth.users where id = p_user_id),
    (select email from public.account_deletion_requests where user_id = p_user_id),
    (select email from public.candidate_profiles where user_id = p_user_id)
  ) into v_email;

  if v_email is null or v_email !~ '^systemtest\.[0-9a-f-]+@example\.com$' then
    raise exception 'refusing to clean a non-test account';
  end if;

  delete from public.candidate_archive where former_user_id = p_user_id;
  delete from public.account_deletion_requests where user_id = p_user_id;
  delete from public.candidate_profiles where user_id = p_user_id;
  delete from public.app_users where auth_sub = p_user_id;
  delete from api.app_users where id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.ensure_app_user(p_email text, p_persona text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'no auth uid';
  end if;

  insert into api.app_users(id, email, persona_requested)
  values (v_id, p_email, p_persona)
  on conflict (id) do update
    set email = excluded.email,
        persona_requested = excluded.persona_requested;

  return jsonb_build_object('id', v_id, 'persona', p_persona, 'role', 'USER');
end $function$
;

CREATE OR REPLACE FUNCTION api.get_candidate_self_status()
 RETURNS TABLE(approval_status text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
     select c.approval_status
     from api.candidate_profiles_admin c
     where c.user_id = auth.uid()
     limit 1;
   $function$
;

CREATE OR REPLACE FUNCTION api.my_account_deletion()
 RETURNS TABLE(status text, requested_at timestamp with time zone, delete_after timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select r.status, r.requested_at, r.delete_after
  from public.account_deletion_requests r
  where r.user_id = auth.uid()
    and r.status = 'pending';
$function$
;

CREATE OR REPLACE FUNCTION api.poll_votes_validate_option_belongs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  opt_poll uuid;
begin
  -- Ensure poll exists (works even if api.polls is a view)
  if not exists (select 1 from api.polls p where p.id = new.poll_id) then
    raise exception 'invalid poll_id';
  end if;

  select poll_id into opt_poll from api.poll_options where id = new.option_id;
  if opt_poll is null then
    raise exception 'invalid option_id';
  end if;
  if opt_poll <> new.poll_id then
    raise exception 'option does not belong to poll';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.promote_candidate_to_elected(p_user_id text, p_jurisdiction_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  uid uuid;
  lvl_schema text;
  lvl_udt text;
  allowed_levels text[];
  desired_level text;
  chosen_level text;
begin
  uid := p_user_id::uuid;

  -- admin-only guard
  if not exists (
    select 1
    from public.app_users au
    where au.auth_sub = auth.uid()
      and au.role = 'ADMIN'
  ) then
    raise exception 'admin only';
  end if;

  -- Determine enum type used by elected_terms.level
  select c.udt_schema, c.udt_name
    into lvl_schema, lvl_udt
  from information_schema.columns c
  where c.table_name = 'elected_terms'
    and c.column_name = 'level'
  limit 1;

  select array_agg(e.enumlabel order by e.enumsortorder)
    into allowed_levels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = lvl_schema
    and t.typname = lvl_udt;

  desired_level := (
    select lower(coalesce(c.office_level, ''))
    from api.candidate_profiles_admin c
    where c.user_id::text = p_user_id
    limit 1
  );

  if desired_level <> '' and desired_level = any(allowed_levels) then
    chosen_level := desired_level;
  else
    chosen_level := allowed_levels[1];
  end if;

  execute format($sql$
    insert into elected_terms (
      id,
      office_name,
      level,
      candidate_name,
      party,
      jurisdiction_id,
      term_start,
      term_end
    )
    select
      $1::uuid,
      c.office_name,
      ($2::text)::%I.%I,
      coalesce(c.display_name, c.email, 'Elected Official'),
      c.party,
      $3::uuid,
      coalesce(current_date, now()::date),
      null
    from api.candidate_profiles_admin c
    where c.user_id::text = $4
    limit 1
    on conflict (id) do update set
      office_name = excluded.office_name,
      level = excluded.level,
      candidate_name = excluded.candidate_name,
      party = excluded.party,
      jurisdiction_id = excluded.jurisdiction_id,
      term_end = null
  $sql$, lvl_schema, lvl_udt)
  using uid, chosen_level, p_jurisdiction_id, p_user_id;

  update public.app_users
  set persona = 'ELECTED'
  where auth_sub::text = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.promote_candidate_to_elected(p_user_id text, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'api'
AS $function$
declare
  uid uuid;
  cjson jsonb;

  c_city text;
  c_state text;
  c_office_name text;
  c_office_level text;
  c_display_name text;
  c_email text;
  c_party text;

  jur_id uuid;
  jur_name text;

  cities_schema text;
  jur_schema text;
  et_schema text;

  lvl_schema text;
  lvl_udt text;
  allowed_levels text[];
  chosen_level text;

  match_count int;
begin
  uid := p_user_id::uuid;

  -- admin-only guard
  if not exists (
    select 1
    from public.app_users au
    where au.auth_sub = auth.uid()
      and au.role = 'ADMIN'
  ) then
    raise exception 'admin only';
  end if;

  select to_jsonb(c) into cjson
  from api.candidate_profiles_admin c
  where c.user_id::text = p_user_id
  limit 1;

  if cjson is null then
    raise exception 'candidate not found';
  end if;

  c_city := nullif(trim(cjson->>'city_name'), '');
  c_state := nullif(upper(trim(cjson->>'state_code')), '');
  c_office_name := nullif(trim(cjson->>'office_name'), '');
  c_office_level := nullif(lower(trim(cjson->>'office_level')), '');
  c_display_name := nullif(trim(cjson->>'display_name'), '');
  c_email := nullif(trim(cjson->>'email'), '');
  c_party := nullif(trim(cjson->>'party'), '');

  -- Prefer stable IDs if present on the view (pulled via json so missing columns won't break compilation)
  jur_id := nullif(cjson->>'jurisdiction_id', '')::uuid;
  if jur_id is null then
    jur_id := nullif(cjson->>'city_id', '')::uuid;
  end if;

  cities_schema := case
    when to_regclass('api.cities_api') is not null then 'api'
    when to_regclass('public.cities_api') is not null then 'public'
    else null
  end;

  jur_schema := case
    when to_regclass('public.jurisdictions') is not null then 'public'
    when to_regclass('api.jurisdictions') is not null then 'api'
    else null
  end;

  et_schema := case
    when to_regclass('public.elected_terms') is not null then 'public'
    when to_regclass('api.elected_terms') is not null then 'api'
    else null
  end;

  if jur_schema is null then
    raise exception 'jurisdictions table not found in public/api';
  end if;

  if et_schema is null then
    raise exception 'elected_terms table not found in public/api';
  end if;

  -- Fallback: resolve via cities_api using loose normalized match
  if jur_id is null then
    if c_city is null or c_state is null then
      raise exception 'candidate missing city_name/state_code';
    end if;

    if cities_schema is null then
      raise exception 'cities_api not found in api/public schema';
    end if;

    execute format($q$
      with t as (
        select
          id,
          name,
          upper(state_code) as sc,
          lower(
            regexp_replace(
              regexp_replace(
                regexp_replace(coalesce(name,''), '[.,]', ' ', 'g'),
                '\s+', ' ', 'g'
              ),
              '\m(city|county|town|village|borough|district|of|the)\M', '', 'gi'
            )
          ) as loose
        from %I.cities_api
        where upper(state_code) = $1
      )
      select count(*)::int
      from t
      where t.loose = lower(
        regexp_replace(
          regexp_replace(
            regexp_replace($2, '[.,]', ' ', 'g'),
            '\s+', ' ', 'g'
          ),
          '\m(city|county|town|village|borough|district|of|the)\M', '', 'gi'
        )
      )
    $q$, cities_schema)
    into match_count
    using c_state, c_city;

    if match_count <> 1 then
      raise exception 'could not resolve city in cities_api (matches=%) for %, %', match_count, c_city, c_state;
    end if;

    execute format($q$
      with t as (
        select
          id,
          name,
          upper(state_code) as sc,
          lower(
            regexp_replace(
              regexp_replace(
                regexp_replace(coalesce(name,''), '[.,]', ' ', 'g'),
                '\s+', ' ', 'g'
              ),
              '\m(city|county|town|village|borough|district|of|the)\M', '', 'gi'
            )
          ) as loose
        from %I.cities_api
        where upper(state_code) = $1
      )
      select t.id
      from t
      where t.loose = lower(
        regexp_replace(
          regexp_replace(
            regexp_replace($2, '[.,]', ' ', 'g'),
            '\s+', ' ', 'g'
          ),
          '\m(city|county|town|village|borough|district|of|the)\M', '', 'gi'
        )
      )
      limit 1
    $q$, cities_schema)
    into jur_id
    using c_state, c_city;

    execute format('select name from %I.cities_api where id = $1 limit 1', cities_schema)
      into jur_name
      using jur_id;
  end if;

  if jur_id is null then
    raise exception 'could not resolve jurisdiction id';
  end if;

  if jur_name is null then
    jur_name := c_city;
  end if;

  -- Ensure jurisdictions row exists so `active_elected` join works
  execute format($q$
    insert into %I.jurisdictions (id, name, state_code)
    values ($1::uuid, $2::text, $3::text)
    on conflict (id) do update
      set name = excluded.name,
          state_code = excluded.state_code
  $q$, jur_schema)
  using jur_id, jur_name, c_state;

  -- enum detection for elected_terms.level
  select c.udt_schema, c.udt_name
    into lvl_schema, lvl_udt
  from information_schema.columns c
  where c.table_schema = et_schema
    and c.table_name = 'elected_terms'
    and c.column_name = 'level'
  limit 1;

  select array_agg(e.enumlabel order by e.enumsortorder)
    into allowed_levels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = lvl_schema
    and t.typname = lvl_udt;

  if c_office_level is not null and c_office_level = any(allowed_levels) then
    chosen_level := c_office_level;
  else
    chosen_level := allowed_levels[1];
  end if;

  -- Upsert into elected_terms (drives active_elected view)
  execute format($q$
    insert into %I.elected_terms (
      id, office_name, level, candidate_name, party, jurisdiction_id, term_start, term_end
    )
    values (
      $1::uuid,
      $2::text,
      ($3::text)::%I.%I,
      $4::text,
      $5::text,
      $6::uuid,
      coalesce(current_date, now()::date),
      null
    )
    on conflict (id) do update set
      office_name = excluded.office_name,
      level = excluded.level,
      candidate_name = excluded.candidate_name,
      party = excluded.party,
      jurisdiction_id = excluded.jurisdiction_id,
      term_end = null
  $q$, et_schema, lvl_schema, lvl_udt)
  using
    uid,
    c_office_name,
    chosen_level,
    coalesce(c_display_name, c_email, 'Elected Official'),
    c_party,
    jur_id;

  update public.app_users
  set persona = 'ELECTED'
  where auth_sub::text = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.register_candidate(first_name text, last_name text, email text, state_code text, phone text DEFAULT NULL::text, city_id text DEFAULT NULL::text, office_type text DEFAULT NULL::text, office_name text DEFAULT NULL::text, party text DEFAULT NULL::text, bio text DEFAULT NULL::text, cycle integer DEFAULT NULL::integer, incumbency boolean DEFAULT NULL::boolean, fec_filing_number text DEFAULT NULL::text, state_filing_number text DEFAULT NULL::text, election_agency_number text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'api'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION api.reject_candidate(p_user_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.candidate_profiles
     set approval_status='rejected', approved_by=auth.uid(), approved_at=now(),
         reviewer_notes=coalesce(p_notes, reviewer_notes)
   where user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION api.request_account_deletion()
 RETURNS TABLE(status text, requested_at timestamp with time zone, delete_after timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.account_deletion_requests (user_id, email)
  values (v_uid, (select u.email from auth.users u where u.id = v_uid))
  on conflict (user_id) do update
    set status = 'pending',
        email = excluded.email,
        requested_at = now(),
        delete_after = now() + interval '30 days',
        cancelled_at = null,
        completed_at = null,
        last_error = null
    where public.account_deletion_requests.status <> 'pending';

  return query
    select r.status, r.requested_at, r.delete_after
    from public.account_deletion_requests r
    where r.user_id = v_uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.run_account_deletion_system_test()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'api', 'auth'
AS $function$
declare
  v_regular  uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_pending  uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_test     uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  v_review   uuid := 'aaaaaaaa-0000-4000-8000-000000000004';
  v_before   bigint;
  v_after    bigint;
  v_count    bigint;
  v_i        int;
  v_raised   boolean;
  v_protected uuid[] := array[
    '68d5d58a-066a-4f79-a56d-c7095c335abf',
    'ab7ca576-1089-4c3f-acf7-19ac54f773e3',
    '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b',
    '712b3698-adfe-4411-b3ee-770812c6c31e'
  ];
begin
  begin
    select count(*) into v_before from public.candidate_profiles;

    insert into public.candidate_profiles (
      user_id, display_name, email, phone, office_level, office_name,
      state_code, city_name, cycle, approval_status
    )
    values
      (v_regular, 'Live Test Regular',  'livetest.regular@example.com', '555-0101', 'LOCAL', 'City Council', 'CA', 'Fremont',  2026, 'approved'),
      (v_pending, 'Live Test Pending',  'livetest.pending@example.com', '555-0102', 'LOCAL', 'School Board', 'CA', 'Fremont',  2026, 'pending'),
      (v_test,    'Live Test Dummy',    'naqviasyed+test@gmail.com',    '555-0103', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved'),
      (v_review,  'Live Test Reviewer', 'NaqviAsyed+AppleReview@gmail.com', '555-0104', 'STATE', 'State Assembly', 'CA', null, 2026, 'approved');

    for v_i in 1..4 loop
      v_raised := false;
      begin
        perform api.archive_and_remove_account_rows(v_protected[v_i]);
      exception when others then
        v_raised := sqlerrm like '%protected account%';
      end;
      if not v_raised then
        raise exception 'FAIL 1: protected id #% was not refused', v_i;
      end if;
    end loop;

    perform api.archive_and_remove_account_rows(v_regular);
    select count(*) into v_count from public.candidate_archive
     where former_user_id = v_regular and reason = 'account_deleted'
       and display_name = 'Live Test Regular' and office_name = 'City Council'
       and city_name = 'Fremont' and state_code = 'CA' and cycle = '2026';
    if v_count <> 1 then raise exception 'FAIL 2: regular candidate not archived correctly'; end if;
    if exists (select 1 from public.candidate_profiles where user_id = v_regular) then
      raise exception 'FAIL 2: regular candidate profile still present';
    end if;
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'candidate_archive'
                  and column_name in ('email', 'phone', 'photo_url', 'bio')) then
      raise exception 'FAIL 2: candidate_archive must not carry email/phone/photo/bio columns';
    end if;

    perform api.archive_and_remove_account_rows(v_pending);
    if exists (select 1 from public.candidate_archive where former_user_id = v_pending) then
      raise exception 'FAIL 3: pending candidate must not be archived';
    end if;
    if exists (select 1 from public.candidate_profiles where user_id = v_pending) then
      raise exception 'FAIL 3: pending candidate profile still present';
    end if;

    insert into api.app_users (id, email, persona_requested)
    values (v_test, 'livetest.dummy.appuser@example.com', 'CANDIDATE');
    perform api.archive_and_remove_account_rows(v_test);
    perform api.archive_and_remove_account_rows(v_review);
    if exists (select 1 from public.candidate_archive where former_user_id in (v_test, v_review)) then
      raise exception 'FAIL 4: test / app-review account was archived';
    end if;
    if exists (select 1 from public.candidate_profiles where user_id in (v_test, v_review)) then
      raise exception 'FAIL 4: test / app-review profile still present';
    end if;
    if exists (select 1 from api.app_users where id = v_test) then
      raise exception 'FAIL 4: api.app_users row still present';
    end if;

    select count(*) into v_after from public.candidate_profiles;
    if v_after <> v_before then
      raise exception 'FAIL 5: candidate_profiles count changed from % to %', v_before, v_after;
    end if;

    insert into public.candidate_profiles (
      user_id, display_name, email, office_level, office_name, state_code, city_name, cycle, approval_status
    )
    values (v_test, 'Live Test Dummy', 'naqviasyed+test@gmail.com', 'LOCAL', 'School Board', 'CA', 'Adelanto', 2026, 'approved');
    if exists (select 1 from api.candidates_public where user_id = v_test) then
      raise exception 'FAIL 6: candidates_public shows the +test account';
    end if;
    if exists (select 1 from api.candidates_by_city_prod where candidate_id = v_test) then
      raise exception 'FAIL 6: candidates_by_city_prod shows the +test account';
    end if;

    insert into public.account_deletion_requests (user_id, email, status)
    values (v_test, 'naqviasyed+test@gmail.com', 'pending');
    update public.account_deletion_requests
       set status = 'cancelled', cancelled_at = now()
     where user_id = v_test and status = 'pending';
    update public.account_deletion_requests
       set status = 'pending', cancelled_at = null
     where user_id = v_test and status = 'cancelled';
    perform api.archive_and_remove_account_rows(v_test);
    if (select email from public.account_deletion_requests where user_id = v_test)
         is distinct from 'naqviasyed+test@gmail.com' then
      raise exception 'FAIL 7: deletion history lost the account email';
    end if;

    raise exception 'USAMPAC_TEST_ROLLBACK';
  exception
    when others then
      if sqlerrm = 'USAMPAC_TEST_ROLLBACK' then
        return 'ALL PASS (rolled back, nothing kept)';
      end if;
      raise;
  end;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.submit_poll_vote(p_poll_id uuid, p_option_id uuid, p_device_id text DEFAULT NULL::text)
 RETURNS SETOF api.poll_option_results
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  uid uuid;
begin
  uid := auth.uid();

  if uid is null and (p_device_id is null or length(trim(p_device_id)) < 8) then
    raise exception 'device_id required for guest voting';
  end if;

  -- Upsert for signed-in users
  if uid is not null then
    insert into api.poll_votes (poll_id, option_id, voter_user_id)
    values (p_poll_id, p_option_id, uid)
    on conflict (poll_id, voter_user_id)
    where voter_user_id is not null
    do update set option_id = excluded.option_id, updated_at = now();
  else
    -- Upsert for guests by device id
    insert into api.poll_votes (poll_id, option_id, voter_device_id)
    values (p_poll_id, p_option_id, p_device_id)
    on conflict (poll_id, voter_device_id)
    where voter_device_id is not null
    do update set option_id = excluded.option_id, updated_at = now();
  end if;

  return query
    select * from api.poll_option_results
    where poll_id = p_poll_id
    order by option_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.tg_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.app_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1
    from public.app_users u
    where u.auth_sub = auth.uid()
      and u.role = 'ADMIN'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.current_cycle()
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select (select value::int from public.app_config where key = 'current_cycle' limit 1);
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists(
    select 1 from app_users au
    where au.auth_sub = uid and au.role = 'ADMIN'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_ensure_app_user(p_email text, p_persona user_role DEFAULT 'VISITOR'::user_role)
 RETURNS TABLE(id uuid, role user_role, persona user_role)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_id uuid;
begin
  insert into app_users (auth_sub, email, persona)
  values (auth.uid(), p_email, coalesce(p_persona,'VISITOR'))
  on conflict (auth_sub) do update
    set email   = excluded.email,
        persona = excluded.persona
  returning app_users.id into v_id;

  return query
  select id, role, persona from app_users where id = v_id;
end $function$
;

CREATE OR REPLACE VIEW api.account_deletion_requests AS
 SELECT user_id,
    email,
    requested_at,
    delete_after,
    status,
    cancelled_at,
    completed_at,
    last_error,
    notified_at
   FROM account_deletion_requests;

CREATE OR REPLACE VIEW api.active_elected AS
 SELECT e.id,
    e.office_name,
    e.level,
    e.candidate_name,
    e.party,
    j.name AS jurisdiction_name,
    j.state_code,
    j.id AS jurisdiction_id,
    e.term_start,
    e.term_end
   FROM elected_terms e
     JOIN jurisdictions j ON j.id = e.jurisdiction_id
  WHERE e.term_end IS NULL OR e.term_end > now();

CREATE OR REPLACE VIEW api.app_telemetry AS
 SELECT id,
    occurred_at,
    event_name,
    screen,
    install_id,
    app_version,
    is_signed_in,
    audience,
    city,
    region,
    link_kind,
    target_kind,
    target_id
   FROM app_telemetry;

CREATE OR REPLACE VIEW api.app_users_admin AS
 SELECT id,
    auth_sub,
    email,
    role,
    created_at
   FROM app_users;

CREATE OR REPLACE VIEW api.candidate_archive AS
 SELECT id,
    former_user_id,
    display_name,
    party,
    office_level,
    office_name,
    state_code,
    city_name,
    cycle,
    incumbency,
    archived_at,
    reason
   FROM candidate_archive;

CREATE OR REPLACE VIEW api.candidate_profiles AS
 SELECT user_id,
    display_name,
    photo_url,
    bio,
    website,
    donate_url,
    social_links,
    last_user_edit_at,
    last_admin_edit_at,
    email,
    phone,
    party,
    website_url,
    twitter_url,
    facebook_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    office_level,
    office_name,
    state_code,
    city_name,
    cycle,
    incumbency,
    approval_status,
    approved_by,
    approved_at,
    reviewer_notes,
    priority1_title,
    priority1_body,
    priority2_title,
    priority2_body,
    priority3_title,
    priority3_body,
    fec_filing_number,
    state_filing_number,
    election_agency_number,
    deleted_at
   FROM candidate_profiles;

CREATE OR REPLACE VIEW api.candidate_profiles_admin AS
 SELECT user_id,
    display_name,
    photo_url,
    bio,
    website,
    donate_url,
    social_links,
    last_user_edit_at,
    last_admin_edit_at,
    email,
    phone,
    party,
    website_url,
    twitter_url,
    facebook_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    office_level,
    office_name,
    state_code,
    city_name,
    cycle,
    incumbency,
    approval_status,
    approved_by,
    approved_at,
    reviewer_notes,
    priority1_title,
    priority1_body,
    priority2_title,
    priority2_body,
    priority3_title,
    priority3_body,
    fec_filing_number,
    state_filing_number,
    election_agency_number,
    deleted_at
   FROM candidate_profiles
  WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW api.candidate_profiles_pending AS
 SELECT user_id,
    display_name,
    photo_url,
    bio,
    website,
    donate_url,
    social_links,
    last_user_edit_at,
    last_admin_edit_at,
    email,
    phone,
    party,
    website_url,
    twitter_url,
    facebook_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    office_level,
    office_name,
    state_code,
    city_name,
    cycle,
    incumbency,
    approval_status,
    approved_by,
    approved_at,
    reviewer_notes,
    priority1_title,
    priority1_body,
    priority2_title,
    priority2_body,
    priority3_title,
    priority3_body,
    fec_filing_number,
    state_filing_number,
    election_agency_number,
    deleted_at
   FROM candidate_profiles
  WHERE approval_status = 'pending'::approval_status AND deleted_at IS NULL;

CREATE OR REPLACE VIEW api.candidates_by_city AS
 SELECT candidate_id,
    candidate_name,
    party,
    incumbency,
    photo_url,
    race_id,
    office_level,
    office_name,
    cycle,
    city_id
   FROM candidates_by_city_clean;

CREATE OR REPLACE VIEW api.candidates_by_city_backup_20251109_042703 AS
 SELECT DISTINCT ON (cnd.id, cj.city_id) cnd.id AS candidate_id,
    cnd.name AS candidate_name,
    cnd.party,
    cnd.incumbency,
    cnd.photo_url,
    r.id AS race_id,
    r.office_level,
    r.office_name,
    r.cycle,
    cj.city_id
   FROM candidates cnd
     JOIN races r ON r.id = cnd.race_id
     JOIN race_jurisdiction rj ON rj.race_id = r.id
     JOIN city_jurisdiction cj ON cj.jurisdiction_id = rj.jurisdiction_id
  ORDER BY cnd.id, cj.city_id;

CREATE OR REPLACE VIEW api.candidates_by_city_current AS
 SELECT candidate_id,
    candidate_name,
    party,
    incumbency,
    photo_url,
    race_id,
    office_level,
    office_name,
    cycle,
    city_id
   FROM api.candidates_by_city
  WHERE cycle = current_cycle();

CREATE OR REPLACE VIEW api.candidates_by_city_dev AS
 SELECT c.candidate_id,
    c.candidate_name,
    c.party,
    c.incumbency,
    c.photo_url,
    c.race_id,
    c.office_level,
    c.office_name,
    c.cycle,
    c.city_id,
    true AS is_seeded
   FROM api.candidates_by_city c
UNION ALL
 SELECT cp.user_id AS candidate_id,
    COALESCE(cp.display_name, cp.email, 'Candidate'::text) AS candidate_name,
    cp.party,
    COALESCE(cp.incumbency, false) AS incumbency,
    cp.photo_url,
    NULL::uuid AS race_id,
        CASE
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['federal'::text, 'us'::text, 'national'::text]) THEN 'federal'::office_level
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['state'::text, 'statewide'::text, 'legislature'::text]) THEN 'state'::office_level
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['local'::text, 'city'::text, 'county'::text, 'municipal'::text]) THEN 'local'::office_level
            ELSE NULL::office_level
        END AS office_level,
    cp.office_name,
    cp.cycle,
    cm.city_id,
    false AS is_seeded
   FROM candidate_profiles cp
     LEFT JOIN api.city_meta cm ON lower(cm.city_name) = lower(COALESCE(cp.city_name, ''::text)) AND cm.state_code = COALESCE(cp.state_code, ''::text);

CREATE OR REPLACE VIEW api.candidates_by_city_prod AS
 SELECT c.candidate_id,
    c.candidate_name,
    c.party,
    c.incumbency,
    c.photo_url,
    c.race_id,
    c.office_level,
    c.office_name,
    c.cycle,
    c.city_id
   FROM api.candidates_by_city c
UNION ALL
 SELECT cp.user_id AS candidate_id,
    COALESCE(cp.display_name, cp.email, 'Candidate'::text) AS candidate_name,
    cp.party,
    COALESCE(cp.incumbency, false) AS incumbency,
    cp.photo_url,
    NULL::uuid AS race_id,
        CASE
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['federal'::text, 'us'::text, 'national'::text]) THEN 'federal'::office_level
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['state'::text, 'statewide'::text, 'legislature'::text]) THEN 'state'::office_level
            WHEN lower(COALESCE(cp.office_level, ''::text)) = ANY (ARRAY['local'::text, 'city'::text, 'county'::text, 'municipal'::text]) THEN 'local'::office_level
            ELSE NULL::office_level
        END AS office_level,
    cp.office_name,
    cp.cycle,
    cm.city_id
   FROM candidate_profiles cp
     LEFT JOIN api.city_meta cm ON lower(cm.city_name) = lower(COALESCE(cp.city_name, ''::text)) AND cm.state_code = COALESCE(cp.state_code, ''::text)
  WHERE cp.approval_status = 'approved'::approval_status AND cp.deleted_at IS NULL AND (lower(TRIM(BOTH FROM COALESCE(cp.email, ''::text))) <> ALL (ARRAY['naqviasyed+test@gmail.com'::text, 'naqviasyed+applereview@gmail.com'::text]));

CREATE OR REPLACE VIEW api.candidates_by_city_with_flag AS
 SELECT candidate_id,
    candidate_name,
    party,
    incumbency,
    photo_url,
    race_id,
    office_level,
    office_name,
    cycle,
    city_id,
    cycle = current_cycle() AS is_current
   FROM api.candidates_by_city c;

CREATE OR REPLACE VIEW api.candidates_public AS
 SELECT user_id,
    display_name,
    email,
    phone,
    party,
    office_level,
    office_name,
    state_code,
    city_name,
    cycle,
    incumbency,
    photo_url,
    bio,
    priority1_title,
    priority1_body,
    priority2_title,
    priority2_body,
    priority3_title,
    priority3_body,
    website_url,
    donate_url,
    twitter_url,
    facebook_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    approval_status
   FROM candidate_profiles
  WHERE approval_status = 'approved'::approval_status AND deleted_at IS NULL AND (lower(TRIM(BOTH FROM COALESCE(email, ''::text))) <> ALL (ARRAY['naqviasyed+test@gmail.com'::text, 'naqviasyed+applereview@gmail.com'::text]));

CREATE OR REPLACE VIEW api.cities_api AS
 SELECT id,
    state_code,
    name
   FROM cities;

CREATE OR REPLACE VIEW api.city_meta AS
 SELECT c.id AS city_id,
    c.name AS city_name,
    s.code AS state_code,
    s.name AS state_name,
    jsonb_agg(jsonb_build_object('id', j.id, 'kind', j.kind, 'name', j.name) ORDER BY j.kind) AS jurisdictions
   FROM cities c
     JOIN states s ON s.code = c.state_code
     LEFT JOIN city_jurisdiction cj ON cj.city_id = c.id
     LEFT JOIN jurisdictions j ON j.id = cj.jurisdiction_id
  GROUP BY c.id, c.name, s.code, s.name;

CREATE OR REPLACE VIEW api.deleted_candidates_admin AS
 SELECT user_id,
    display_name,
    email,
    office_level,
    office_name,
    city_name,
    state_code,
    cycle::text AS cycle,
    deleted_at
   FROM candidate_profiles
  WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE VIEW api.deleted_elected_terms_admin AS
 SELECT user_id,
    candidate_name,
    office_name,
    level,
    jurisdiction_name,
    state_code,
    deleted_at
   FROM deleted_elected_terms;

CREATE OR REPLACE VIEW api.jurisdictions_lookup AS
 SELECT id,
    name,
    state_code
   FROM jurisdictions;

CREATE OR REPLACE VIEW api.notifications AS
 SELECT id,
    title,
    url,
    body,
    published_at,
    is_active,
    created_at,
    image_url
   FROM notifications;

CREATE OR REPLACE VIEW api.political_parties AS
 SELECT id,
    label,
    sort_order,
    is_active,
    allows_write_in
   FROM political_parties
  WHERE is_active = true;

CREATE OR REPLACE VIEW api.poll_option_results AS
 WITH counts AS (
         SELECT po.poll_id,
            po.id AS option_id,
            count(pv.id)::integer AS votes
           FROM api.poll_options po
             LEFT JOIN api.poll_votes pv ON pv.option_id = po.id
          GROUP BY po.poll_id, po.id
        ), totals AS (
         SELECT counts.poll_id,
            sum(counts.votes)::integer AS total_votes
           FROM counts
          GROUP BY counts.poll_id
        )
 SELECT c.poll_id,
    c.option_id,
    c.votes,
        CASE
            WHEN COALESCE(t.total_votes, 0) = 0 THEN 0
            ELSE round(c.votes::numeric * 100.0 / t.total_votes::numeric)::integer
        END AS percent,
    COALESCE(t.total_votes, 0) AS total_votes
   FROM counts c
     LEFT JOIN totals t ON t.poll_id = c.poll_id;

CREATE OR REPLACE VIEW api.poll_options AS
 SELECT id,
    poll_id,
    label,
    "position"
   FROM poll_options;

CREATE OR REPLACE VIEW api.polls AS
 SELECT id,
    slug,
    title,
    subtitle,
    is_active,
    created_at
   FROM polls;

CREATE OR REPLACE VIEW api.quiz_options AS
 SELECT id,
    question_id,
    label,
    is_correct,
    "position"
   FROM quiz_options;

CREATE OR REPLACE VIEW api.quiz_questions AS
 SELECT id,
    slug,
    prompt,
    explanation,
    "position",
    is_active,
    created_at
   FROM quiz_questions;

CREATE OR REPLACE VIEW api.shared_files AS
 SELECT id,
    title,
    file_name,
    content_type,
    storage_path,
    created_at
   FROM shared_files;

CREATE OR REPLACE VIEW api.states AS
 SELECT code,
    name
   FROM states;

CREATE OR REPLACE VIEW public.cities_api AS
 SELECT id,
    name,
    state_code
   FROM cities;

CREATE OR REPLACE VIEW public.city_meta_api AS
 SELECT c.id AS city_id,
    c.name AS city_name,
    c.state_code,
    s.name AS state_name,
    '{}'::jsonb AS jurisdictions
   FROM cities c
     LEFT JOIN states s ON s.code = c.state_code;

CREATE TRIGGER trg_poll_votes_updated_at BEFORE UPDATE ON api.poll_votes FOR EACH ROW EXECUTE FUNCTION api.set_updated_at();

CREATE TRIGGER trg_poll_votes_validate BEFORE INSERT OR UPDATE ON api.poll_votes FOR EACH ROW EXECUTE FUNCTION api.poll_votes_validate_option_belongs();

ALTER TABLE api.poll_votes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_telemetry ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_archive ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_profiles_backup_20261011 ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.political_parties ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_user_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.view_defs_backup_20261011 ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_votes_insert ON api.poll_votes AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK ((((auth.uid() IS NOT NULL) AND (voter_user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (voter_user_id IS NULL) AND (voter_device_id IS NOT NULL) AND (length(TRIM(BOTH FROM voter_device_id)) >= 8))));

CREATE POLICY poll_votes_select_own_user ON api.poll_votes AS PERMISSIVE FOR SELECT TO authenticated USING ((voter_user_id = auth.uid()));

CREATE POLICY poll_votes_update ON api.poll_votes AS PERMISSIVE FOR UPDATE TO anon, authenticated USING ((((auth.uid() IS NOT NULL) AND (voter_user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (voter_user_id IS NULL) AND (voter_device_id IS NOT NULL)))) WITH CHECK ((((auth.uid() IS NOT NULL) AND (voter_user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (voter_user_id IS NULL) AND (voter_device_id IS NOT NULL))));

CREATE POLICY poll_votes_update_own_user ON api.poll_votes AS PERMISSIVE FOR UPDATE TO authenticated USING ((voter_user_id = auth.uid())) WITH CHECK ((voter_user_id = auth.uid()));

CREATE POLICY app_telemetry_insert_anon ON public.app_telemetry AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY app_users_admin_select ON public.app_users AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.auth_sub = auth.uid()) AND (u.role = 'ADMIN'::user_role)))));

CREATE POLICY users_self_select ON public.app_users AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = auth_sub) OR is_admin(auth.uid())));

CREATE POLICY users_self_update ON public.app_users AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((auth.uid() = auth_sub) OR is_admin(auth.uid()))) WITH CHECK (((auth.uid() = auth_sub) OR is_admin(auth.uid())));

CREATE POLICY apps_admin_select ON public.candidate_applications AS PERMISSIVE FOR SELECT TO PUBLIC USING (is_admin(auth.uid()));

CREATE POLICY apps_admin_update ON public.candidate_applications AS PERMISSIVE FOR UPDATE TO PUBLIC USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY apps_owner_insert ON public.candidate_applications AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_applications.user_id) AND (u.auth_sub = auth.uid())))));

CREATE POLICY apps_owner_read ON public.candidate_applications AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_applications.user_id) AND (u.auth_sub = auth.uid())))));

CREATE POLICY apps_owner_update ON public.candidate_applications AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_applications.user_id) AND (u.auth_sub = auth.uid())))) AND (status = ANY (ARRAY['draft'::application_status, 'pending'::application_status])))) WITH CHECK (((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_applications.user_id) AND (u.auth_sub = auth.uid())))) AND (status = ANY (ARRAY['draft'::application_status, 'pending'::application_status]))));

CREATE POLICY "candidates can insert own profile" ON public.candidate_profiles AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "candidates can read own profile" ON public.candidate_profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING ((user_id = auth.uid()));

CREATE POLICY "candidates can update own profile" ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "cp dev insert" ON public.candidate_profiles AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "cp dev select" ON public.candidate_profiles AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "cp dev update" ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY cp_admin_select ON public.candidate_profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.auth_sub = auth.uid()) AND (u.role = 'ADMIN'::user_role)))));

CREATE POLICY cp_admin_update ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.auth_sub = auth.uid()) AND (u.role = 'ADMIN'::user_role))))) WITH CHECK (true);

CREATE POLICY cp_owner_insert ON public.candidate_profiles AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));

CREATE POLICY cp_owner_select ON public.candidate_profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY cp_owner_update ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "profiles anon update (dev)" ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profiles anon upsert (dev)" ON public.candidate_profiles AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY profiles_admin_rw ON public.candidate_profiles AS PERMISSIVE FOR ALL TO PUBLIC USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY profiles_owner_insert ON public.candidate_profiles AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_profiles.user_id) AND (u.auth_sub = auth.uid())))));

CREATE POLICY profiles_owner_update ON public.candidate_profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_profiles.user_id) AND (u.auth_sub = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM app_users u
  WHERE ((u.id = candidate_profiles.user_id) AND (u.auth_sub = auth.uid())))));

CREATE POLICY profiles_public_read ON public.candidate_profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Allow read cities" ON public.cities AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage notifications" ON public.notifications AS PERMISSIVE FOR ALL TO PUBLIC USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "Public read notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY political_parties_select_active ON public.political_parties AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));

CREATE POLICY "Admins manage poll options" ON public.poll_options AS PERMISSIVE FOR ALL TO PUBLIC USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "Public read poll options" ON public.poll_options AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Public insert poll votes" ON public.poll_votes AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Public read poll votes" ON public.poll_votes AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Admins manage polls" ON public.polls AS PERMISSIVE FOR ALL TO PUBLIC USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "Public read polls" ON public.polls AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Admins manage quiz options" ON public.quiz_options AS PERMISSIVE FOR ALL TO PUBLIC USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "Public read quiz options" ON public.quiz_options AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Admins manage quiz questions" ON public.quiz_questions AS PERMISSIVE FOR ALL TO PUBLIC USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY "Public read quiz questions" ON public.quiz_questions AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Public insert quiz answers" ON public.quiz_user_answers AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Public read quiz answers" ON public.quiz_user_answers AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

GRANT SELECT ON TABLE api.account_deletion_requests TO service_role;

GRANT UPDATE ON TABLE api.account_deletion_requests TO service_role;

GRANT DELETE ON TABLE api.active_elected TO service_role;

GRANT INSERT ON TABLE api.active_elected TO service_role;

GRANT SELECT ON TABLE api.active_elected TO anon;

GRANT SELECT ON TABLE api.active_elected TO authenticated;

GRANT SELECT ON TABLE api.active_elected TO service_role;

GRANT UPDATE ON TABLE api.active_elected TO service_role;

GRANT INSERT ON TABLE api.app_telemetry TO anon;

GRANT INSERT ON TABLE api.app_telemetry TO authenticated;

GRANT SELECT ON TABLE api.app_telemetry TO anon;

GRANT SELECT ON TABLE api.app_telemetry TO authenticated;

GRANT SELECT ON TABLE api.app_telemetry TO service_role;

GRANT DELETE ON TABLE api.app_users TO service_role;

GRANT INSERT ON TABLE api.app_users TO service_role;

GRANT SELECT ON TABLE api.app_users TO anon;

GRANT SELECT ON TABLE api.app_users TO authenticated;

GRANT SELECT ON TABLE api.app_users TO service_role;

GRANT UPDATE ON TABLE api.app_users TO service_role;

GRANT DELETE ON TABLE api.app_users_admin TO service_role;

GRANT INSERT ON TABLE api.app_users_admin TO service_role;

GRANT SELECT ON TABLE api.app_users_admin TO anon;

GRANT SELECT ON TABLE api.app_users_admin TO authenticated;

GRANT SELECT ON TABLE api.app_users_admin TO service_role;

GRANT UPDATE ON TABLE api.app_users_admin TO service_role;

GRANT SELECT ON TABLE api.candidate_archive TO service_role;

GRANT DELETE ON TABLE api.candidate_profiles TO service_role;

GRANT INSERT ON TABLE api.candidate_profiles TO authenticated;

GRANT INSERT ON TABLE api.candidate_profiles TO service_role;

GRANT SELECT ON TABLE api.candidate_profiles TO anon;

GRANT SELECT ON TABLE api.candidate_profiles TO authenticated;

GRANT SELECT ON TABLE api.candidate_profiles TO service_role;

GRANT UPDATE ON TABLE api.candidate_profiles TO authenticated;

GRANT UPDATE ON TABLE api.candidate_profiles TO service_role;

GRANT DELETE ON TABLE api.candidate_profiles_admin TO service_role;

GRANT INSERT ON TABLE api.candidate_profiles_admin TO service_role;

GRANT SELECT ON TABLE api.candidate_profiles_admin TO anon;

GRANT SELECT ON TABLE api.candidate_profiles_admin TO authenticated;

GRANT SELECT ON TABLE api.candidate_profiles_admin TO service_role;

GRANT UPDATE ON TABLE api.candidate_profiles_admin TO service_role;

GRANT DELETE ON TABLE api.candidate_profiles_pending TO service_role;

GRANT INSERT ON TABLE api.candidate_profiles_pending TO service_role;

GRANT SELECT ON TABLE api.candidate_profiles_pending TO anon;

GRANT SELECT ON TABLE api.candidate_profiles_pending TO authenticated;

GRANT SELECT ON TABLE api.candidate_profiles_pending TO service_role;

GRANT UPDATE ON TABLE api.candidate_profiles_pending TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city TO anon;

GRANT SELECT ON TABLE api.candidates_by_city TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city_backup_20251109_042703 TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city_backup_20251109_042703 TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city_backup_20251109_042703 TO anon;

GRANT SELECT ON TABLE api.candidates_by_city_backup_20251109_042703 TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city_backup_20251109_042703 TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city_backup_20251109_042703 TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city_current TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city_current TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city_current TO anon;

GRANT SELECT ON TABLE api.candidates_by_city_current TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city_current TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city_current TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city_dev TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city_dev TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city_dev TO anon;

GRANT SELECT ON TABLE api.candidates_by_city_dev TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city_dev TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city_dev TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city_prod TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city_prod TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city_prod TO anon;

GRANT SELECT ON TABLE api.candidates_by_city_prod TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city_prod TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city_prod TO service_role;

GRANT DELETE ON TABLE api.candidates_by_city_with_flag TO service_role;

GRANT INSERT ON TABLE api.candidates_by_city_with_flag TO service_role;

GRANT SELECT ON TABLE api.candidates_by_city_with_flag TO anon;

GRANT SELECT ON TABLE api.candidates_by_city_with_flag TO authenticated;

GRANT SELECT ON TABLE api.candidates_by_city_with_flag TO service_role;

GRANT UPDATE ON TABLE api.candidates_by_city_with_flag TO service_role;

GRANT DELETE ON TABLE api.candidates_public TO service_role;

GRANT INSERT ON TABLE api.candidates_public TO service_role;

GRANT SELECT ON TABLE api.candidates_public TO anon;

GRANT SELECT ON TABLE api.candidates_public TO authenticated;

GRANT SELECT ON TABLE api.candidates_public TO service_role;

GRANT UPDATE ON TABLE api.candidates_public TO service_role;

GRANT DELETE ON TABLE api.cities_api TO service_role;

GRANT INSERT ON TABLE api.cities_api TO service_role;

GRANT SELECT ON TABLE api.cities_api TO anon;

GRANT SELECT ON TABLE api.cities_api TO authenticated;

GRANT SELECT ON TABLE api.cities_api TO service_role;

GRANT UPDATE ON TABLE api.cities_api TO service_role;

GRANT DELETE ON TABLE api.city_meta TO service_role;

GRANT INSERT ON TABLE api.city_meta TO service_role;

GRANT SELECT ON TABLE api.city_meta TO anon;

GRANT SELECT ON TABLE api.city_meta TO authenticated;

GRANT SELECT ON TABLE api.city_meta TO service_role;

GRANT UPDATE ON TABLE api.city_meta TO service_role;

GRANT DELETE ON TABLE api.deleted_candidates_admin TO service_role;

GRANT INSERT ON TABLE api.deleted_candidates_admin TO service_role;

GRANT SELECT ON TABLE api.deleted_candidates_admin TO anon;

GRANT SELECT ON TABLE api.deleted_candidates_admin TO authenticated;

GRANT SELECT ON TABLE api.deleted_candidates_admin TO service_role;

GRANT UPDATE ON TABLE api.deleted_candidates_admin TO service_role;

GRANT DELETE ON TABLE api.deleted_elected_terms_admin TO service_role;

GRANT INSERT ON TABLE api.deleted_elected_terms_admin TO service_role;

GRANT SELECT ON TABLE api.deleted_elected_terms_admin TO anon;

GRANT SELECT ON TABLE api.deleted_elected_terms_admin TO authenticated;

GRANT SELECT ON TABLE api.deleted_elected_terms_admin TO service_role;

GRANT UPDATE ON TABLE api.deleted_elected_terms_admin TO service_role;

GRANT DELETE ON TABLE api.jurisdictions_lookup TO service_role;

GRANT INSERT ON TABLE api.jurisdictions_lookup TO service_role;

GRANT SELECT ON TABLE api.jurisdictions_lookup TO anon;

GRANT SELECT ON TABLE api.jurisdictions_lookup TO authenticated;

GRANT SELECT ON TABLE api.jurisdictions_lookup TO service_role;

GRANT UPDATE ON TABLE api.jurisdictions_lookup TO service_role;

GRANT DELETE ON TABLE api.notifications TO authenticated;

GRANT DELETE ON TABLE api.notifications TO service_role;

GRANT INSERT ON TABLE api.notifications TO authenticated;

GRANT INSERT ON TABLE api.notifications TO service_role;

GRANT SELECT ON TABLE api.notifications TO anon;

GRANT SELECT ON TABLE api.notifications TO authenticated;

GRANT SELECT ON TABLE api.notifications TO service_role;

GRANT UPDATE ON TABLE api.notifications TO authenticated;

GRANT UPDATE ON TABLE api.notifications TO service_role;

GRANT SELECT ON TABLE api.political_parties TO anon;

GRANT SELECT ON TABLE api.political_parties TO authenticated;

GRANT DELETE ON TABLE api.poll_option_results TO service_role;

GRANT INSERT ON TABLE api.poll_option_results TO service_role;

GRANT SELECT ON TABLE api.poll_option_results TO anon;

GRANT SELECT ON TABLE api.poll_option_results TO authenticated;

GRANT SELECT ON TABLE api.poll_option_results TO service_role;

GRANT UPDATE ON TABLE api.poll_option_results TO service_role;

GRANT DELETE ON TABLE api.poll_options TO authenticated;

GRANT DELETE ON TABLE api.poll_options TO service_role;

GRANT INSERT ON TABLE api.poll_options TO authenticated;

GRANT INSERT ON TABLE api.poll_options TO service_role;

GRANT SELECT ON TABLE api.poll_options TO anon;

GRANT SELECT ON TABLE api.poll_options TO authenticated;

GRANT SELECT ON TABLE api.poll_options TO service_role;

GRANT UPDATE ON TABLE api.poll_options TO authenticated;

GRANT UPDATE ON TABLE api.poll_options TO service_role;

GRANT DELETE ON TABLE api.poll_votes TO service_role;

GRANT INSERT ON TABLE api.poll_votes TO service_role;

GRANT SELECT ON TABLE api.poll_votes TO anon;

GRANT SELECT ON TABLE api.poll_votes TO authenticated;

GRANT SELECT ON TABLE api.poll_votes TO service_role;

GRANT UPDATE ON TABLE api.poll_votes TO service_role;

GRANT DELETE ON TABLE api.polls TO authenticated;

GRANT DELETE ON TABLE api.polls TO service_role;

GRANT INSERT ON TABLE api.polls TO authenticated;

GRANT INSERT ON TABLE api.polls TO service_role;

GRANT SELECT ON TABLE api.polls TO anon;

GRANT SELECT ON TABLE api.polls TO authenticated;

GRANT SELECT ON TABLE api.polls TO service_role;

GRANT UPDATE ON TABLE api.polls TO authenticated;

GRANT UPDATE ON TABLE api.polls TO service_role;

GRANT DELETE ON TABLE api.quiz_options TO authenticated;

GRANT DELETE ON TABLE api.quiz_options TO service_role;

GRANT INSERT ON TABLE api.quiz_options TO authenticated;

GRANT INSERT ON TABLE api.quiz_options TO service_role;

GRANT SELECT ON TABLE api.quiz_options TO anon;

GRANT SELECT ON TABLE api.quiz_options TO authenticated;

GRANT SELECT ON TABLE api.quiz_options TO service_role;

GRANT UPDATE ON TABLE api.quiz_options TO authenticated;

GRANT UPDATE ON TABLE api.quiz_options TO service_role;

GRANT DELETE ON TABLE api.quiz_questions TO authenticated;

GRANT DELETE ON TABLE api.quiz_questions TO service_role;

GRANT INSERT ON TABLE api.quiz_questions TO authenticated;

GRANT INSERT ON TABLE api.quiz_questions TO service_role;

GRANT SELECT ON TABLE api.quiz_questions TO anon;

GRANT SELECT ON TABLE api.quiz_questions TO authenticated;

GRANT SELECT ON TABLE api.quiz_questions TO service_role;

GRANT UPDATE ON TABLE api.quiz_questions TO authenticated;

GRANT UPDATE ON TABLE api.quiz_questions TO service_role;

GRANT DELETE ON TABLE api.shared_files TO service_role;

GRANT INSERT ON TABLE api.shared_files TO service_role;

GRANT SELECT ON TABLE api.shared_files TO anon;

GRANT SELECT ON TABLE api.shared_files TO authenticated;

GRANT SELECT ON TABLE api.shared_files TO service_role;

GRANT DELETE ON TABLE api.states TO service_role;

GRANT INSERT ON TABLE api.states TO service_role;

GRANT SELECT ON TABLE api.states TO anon;

GRANT SELECT ON TABLE api.states TO authenticated;

GRANT SELECT ON TABLE api.states TO service_role;

GRANT UPDATE ON TABLE api.states TO service_role;

GRANT DELETE ON TABLE api.states_backup_20251109_041550 TO service_role;

GRANT INSERT ON TABLE api.states_backup_20251109_041550 TO service_role;

GRANT SELECT ON TABLE api.states_backup_20251109_041550 TO anon;

GRANT SELECT ON TABLE api.states_backup_20251109_041550 TO authenticated;

GRANT SELECT ON TABLE api.states_backup_20251109_041550 TO service_role;

GRANT UPDATE ON TABLE api.states_backup_20251109_041550 TO service_role;

GRANT DELETE ON TABLE public.account_deletion_requests TO service_role;

GRANT INSERT ON TABLE public.account_deletion_requests TO service_role;

GRANT MAINTAIN ON TABLE public.account_deletion_requests TO service_role;

GRANT REFERENCES ON TABLE public.account_deletion_requests TO service_role;

GRANT SELECT ON TABLE public.account_deletion_requests TO service_role;

GRANT TRIGGER ON TABLE public.account_deletion_requests TO service_role;

GRANT TRUNCATE ON TABLE public.account_deletion_requests TO service_role;

GRANT UPDATE ON TABLE public.account_deletion_requests TO service_role;

GRANT DELETE ON TABLE public.admin_change_log TO anon;

GRANT DELETE ON TABLE public.admin_change_log TO authenticated;

GRANT DELETE ON TABLE public.admin_change_log TO service_role;

GRANT INSERT ON TABLE public.admin_change_log TO anon;

GRANT INSERT ON TABLE public.admin_change_log TO authenticated;

GRANT INSERT ON TABLE public.admin_change_log TO service_role;

GRANT MAINTAIN ON TABLE public.admin_change_log TO anon;

GRANT MAINTAIN ON TABLE public.admin_change_log TO authenticated;

GRANT MAINTAIN ON TABLE public.admin_change_log TO service_role;

GRANT REFERENCES ON TABLE public.admin_change_log TO anon;

GRANT REFERENCES ON TABLE public.admin_change_log TO authenticated;

GRANT REFERENCES ON TABLE public.admin_change_log TO service_role;

GRANT SELECT ON TABLE public.admin_change_log TO anon;

GRANT SELECT ON TABLE public.admin_change_log TO authenticated;

GRANT SELECT ON TABLE public.admin_change_log TO service_role;

GRANT TRIGGER ON TABLE public.admin_change_log TO anon;

GRANT TRIGGER ON TABLE public.admin_change_log TO authenticated;

GRANT TRIGGER ON TABLE public.admin_change_log TO service_role;

GRANT TRUNCATE ON TABLE public.admin_change_log TO anon;

GRANT TRUNCATE ON TABLE public.admin_change_log TO authenticated;

GRANT TRUNCATE ON TABLE public.admin_change_log TO service_role;

GRANT UPDATE ON TABLE public.admin_change_log TO anon;

GRANT UPDATE ON TABLE public.admin_change_log TO authenticated;

GRANT UPDATE ON TABLE public.admin_change_log TO service_role;

GRANT SELECT ON TABLE public.admin_change_log_id_seq TO anon;

GRANT SELECT ON TABLE public.admin_change_log_id_seq TO authenticated;

GRANT SELECT ON TABLE public.admin_change_log_id_seq TO service_role;

GRANT UPDATE ON TABLE public.admin_change_log_id_seq TO anon;

GRANT UPDATE ON TABLE public.admin_change_log_id_seq TO authenticated;

GRANT UPDATE ON TABLE public.admin_change_log_id_seq TO service_role;

GRANT USAGE ON TABLE public.admin_change_log_id_seq TO anon;

GRANT USAGE ON TABLE public.admin_change_log_id_seq TO authenticated;

GRANT USAGE ON TABLE public.admin_change_log_id_seq TO service_role;

GRANT DELETE ON TABLE public.app_config TO anon;

GRANT DELETE ON TABLE public.app_config TO authenticated;

GRANT DELETE ON TABLE public.app_config TO service_role;

GRANT INSERT ON TABLE public.app_config TO anon;

GRANT INSERT ON TABLE public.app_config TO authenticated;

GRANT INSERT ON TABLE public.app_config TO service_role;

GRANT MAINTAIN ON TABLE public.app_config TO anon;

GRANT MAINTAIN ON TABLE public.app_config TO authenticated;

GRANT MAINTAIN ON TABLE public.app_config TO service_role;

GRANT REFERENCES ON TABLE public.app_config TO anon;

GRANT REFERENCES ON TABLE public.app_config TO authenticated;

GRANT REFERENCES ON TABLE public.app_config TO service_role;

GRANT SELECT ON TABLE public.app_config TO anon;

GRANT SELECT ON TABLE public.app_config TO authenticated;

GRANT SELECT ON TABLE public.app_config TO service_role;

GRANT TRIGGER ON TABLE public.app_config TO anon;

GRANT TRIGGER ON TABLE public.app_config TO authenticated;

GRANT TRIGGER ON TABLE public.app_config TO service_role;

GRANT TRUNCATE ON TABLE public.app_config TO anon;

GRANT TRUNCATE ON TABLE public.app_config TO authenticated;

GRANT TRUNCATE ON TABLE public.app_config TO service_role;

GRANT UPDATE ON TABLE public.app_config TO anon;

GRANT UPDATE ON TABLE public.app_config TO authenticated;

GRANT UPDATE ON TABLE public.app_config TO service_role;

GRANT DELETE ON TABLE public.app_telemetry TO service_role;

GRANT INSERT ON TABLE public.app_telemetry TO anon;

GRANT INSERT ON TABLE public.app_telemetry TO authenticated;

GRANT INSERT ON TABLE public.app_telemetry TO service_role;

GRANT MAINTAIN ON TABLE public.app_telemetry TO service_role;

GRANT REFERENCES ON TABLE public.app_telemetry TO service_role;

GRANT SELECT ON TABLE public.app_telemetry TO service_role;

GRANT TRIGGER ON TABLE public.app_telemetry TO service_role;

GRANT TRUNCATE ON TABLE public.app_telemetry TO service_role;

GRANT UPDATE ON TABLE public.app_telemetry TO service_role;

GRANT DELETE ON TABLE public.app_users TO anon;

GRANT DELETE ON TABLE public.app_users TO authenticated;

GRANT DELETE ON TABLE public.app_users TO service_role;

GRANT INSERT ON TABLE public.app_users TO anon;

GRANT INSERT ON TABLE public.app_users TO authenticated;

GRANT INSERT ON TABLE public.app_users TO service_role;

GRANT MAINTAIN ON TABLE public.app_users TO anon;

GRANT MAINTAIN ON TABLE public.app_users TO authenticated;

GRANT MAINTAIN ON TABLE public.app_users TO service_role;

GRANT REFERENCES ON TABLE public.app_users TO anon;

GRANT REFERENCES ON TABLE public.app_users TO authenticated;

GRANT REFERENCES ON TABLE public.app_users TO service_role;

GRANT SELECT ON TABLE public.app_users TO anon;

GRANT SELECT ON TABLE public.app_users TO authenticated;

GRANT SELECT ON TABLE public.app_users TO service_role;

GRANT TRIGGER ON TABLE public.app_users TO anon;

GRANT TRIGGER ON TABLE public.app_users TO authenticated;

GRANT TRIGGER ON TABLE public.app_users TO service_role;

GRANT TRUNCATE ON TABLE public.app_users TO anon;

GRANT TRUNCATE ON TABLE public.app_users TO authenticated;

GRANT TRUNCATE ON TABLE public.app_users TO service_role;

GRANT UPDATE ON TABLE public.app_users TO anon;

GRANT UPDATE ON TABLE public.app_users TO authenticated;

GRANT UPDATE ON TABLE public.app_users TO service_role;

GRANT DELETE ON TABLE public.candidate_applications TO anon;

GRANT DELETE ON TABLE public.candidate_applications TO authenticated;

GRANT DELETE ON TABLE public.candidate_applications TO service_role;

GRANT INSERT ON TABLE public.candidate_applications TO anon;

GRANT INSERT ON TABLE public.candidate_applications TO authenticated;

GRANT INSERT ON TABLE public.candidate_applications TO service_role;

GRANT MAINTAIN ON TABLE public.candidate_applications TO anon;

GRANT MAINTAIN ON TABLE public.candidate_applications TO authenticated;

GRANT MAINTAIN ON TABLE public.candidate_applications TO service_role;

GRANT REFERENCES ON TABLE public.candidate_applications TO anon;

GRANT REFERENCES ON TABLE public.candidate_applications TO authenticated;

GRANT REFERENCES ON TABLE public.candidate_applications TO service_role;

GRANT SELECT ON TABLE public.candidate_applications TO anon;

GRANT SELECT ON TABLE public.candidate_applications TO authenticated;

GRANT SELECT ON TABLE public.candidate_applications TO service_role;

GRANT TRIGGER ON TABLE public.candidate_applications TO anon;

GRANT TRIGGER ON TABLE public.candidate_applications TO authenticated;

GRANT TRIGGER ON TABLE public.candidate_applications TO service_role;

GRANT TRUNCATE ON TABLE public.candidate_applications TO anon;

GRANT TRUNCATE ON TABLE public.candidate_applications TO authenticated;

GRANT TRUNCATE ON TABLE public.candidate_applications TO service_role;

GRANT UPDATE ON TABLE public.candidate_applications TO anon;

GRANT UPDATE ON TABLE public.candidate_applications TO authenticated;

GRANT UPDATE ON TABLE public.candidate_applications TO service_role;

GRANT DELETE ON TABLE public.candidate_archive TO service_role;

GRANT INSERT ON TABLE public.candidate_archive TO service_role;

GRANT MAINTAIN ON TABLE public.candidate_archive TO service_role;

GRANT REFERENCES ON TABLE public.candidate_archive TO service_role;

GRANT SELECT ON TABLE public.candidate_archive TO service_role;

GRANT TRIGGER ON TABLE public.candidate_archive TO service_role;

GRANT TRUNCATE ON TABLE public.candidate_archive TO service_role;

GRANT UPDATE ON TABLE public.candidate_archive TO service_role;

GRANT DELETE ON TABLE public.candidate_profiles TO anon;

GRANT DELETE ON TABLE public.candidate_profiles TO authenticated;

GRANT DELETE ON TABLE public.candidate_profiles TO service_role;

GRANT INSERT ON TABLE public.candidate_profiles TO authenticated;

GRANT INSERT ON TABLE public.candidate_profiles TO service_role;

GRANT MAINTAIN ON TABLE public.candidate_profiles TO anon;

GRANT MAINTAIN ON TABLE public.candidate_profiles TO authenticated;

GRANT MAINTAIN ON TABLE public.candidate_profiles TO service_role;

GRANT REFERENCES ON TABLE public.candidate_profiles TO anon;

GRANT REFERENCES ON TABLE public.candidate_profiles TO authenticated;

GRANT REFERENCES ON TABLE public.candidate_profiles TO service_role;

GRANT SELECT ON TABLE public.candidate_profiles TO anon;

GRANT SELECT ON TABLE public.candidate_profiles TO authenticated;

GRANT SELECT ON TABLE public.candidate_profiles TO service_role;

GRANT TRIGGER ON TABLE public.candidate_profiles TO anon;

GRANT TRIGGER ON TABLE public.candidate_profiles TO authenticated;

GRANT TRIGGER ON TABLE public.candidate_profiles TO service_role;

GRANT TRUNCATE ON TABLE public.candidate_profiles TO anon;

GRANT TRUNCATE ON TABLE public.candidate_profiles TO authenticated;

GRANT TRUNCATE ON TABLE public.candidate_profiles TO service_role;

GRANT UPDATE ON TABLE public.candidate_profiles TO authenticated;

GRANT UPDATE ON TABLE public.candidate_profiles TO service_role;

GRANT DELETE ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT DELETE ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT DELETE ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT INSERT ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT INSERT ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT INSERT ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT MAINTAIN ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT MAINTAIN ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT MAINTAIN ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT REFERENCES ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT REFERENCES ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT REFERENCES ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT SELECT ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT SELECT ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT SELECT ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT TRIGGER ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT TRIGGER ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT TRIGGER ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT TRUNCATE ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT TRUNCATE ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT TRUNCATE ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT UPDATE ON TABLE public.candidate_profiles_backup_20261011 TO anon;

GRANT UPDATE ON TABLE public.candidate_profiles_backup_20261011 TO authenticated;

GRANT UPDATE ON TABLE public.candidate_profiles_backup_20261011 TO service_role;

GRANT DELETE ON TABLE public.candidates TO anon;

GRANT DELETE ON TABLE public.candidates TO authenticated;

GRANT DELETE ON TABLE public.candidates TO service_role;

GRANT INSERT ON TABLE public.candidates TO anon;

GRANT INSERT ON TABLE public.candidates TO authenticated;

GRANT INSERT ON TABLE public.candidates TO service_role;

GRANT MAINTAIN ON TABLE public.candidates TO anon;

GRANT MAINTAIN ON TABLE public.candidates TO authenticated;

GRANT MAINTAIN ON TABLE public.candidates TO service_role;

GRANT REFERENCES ON TABLE public.candidates TO anon;

GRANT REFERENCES ON TABLE public.candidates TO authenticated;

GRANT REFERENCES ON TABLE public.candidates TO service_role;

GRANT SELECT ON TABLE public.candidates TO anon;

GRANT SELECT ON TABLE public.candidates TO authenticated;

GRANT SELECT ON TABLE public.candidates TO service_role;

GRANT TRIGGER ON TABLE public.candidates TO anon;

GRANT TRIGGER ON TABLE public.candidates TO authenticated;

GRANT TRIGGER ON TABLE public.candidates TO service_role;

GRANT TRUNCATE ON TABLE public.candidates TO anon;

GRANT TRUNCATE ON TABLE public.candidates TO authenticated;

GRANT TRUNCATE ON TABLE public.candidates TO service_role;

GRANT UPDATE ON TABLE public.candidates TO anon;

GRANT UPDATE ON TABLE public.candidates TO authenticated;

GRANT UPDATE ON TABLE public.candidates TO service_role;

GRANT DELETE ON TABLE public.candidates_by_city_clean TO anon;

GRANT DELETE ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT DELETE ON TABLE public.candidates_by_city_clean TO service_role;

GRANT INSERT ON TABLE public.candidates_by_city_clean TO anon;

GRANT INSERT ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT INSERT ON TABLE public.candidates_by_city_clean TO service_role;

GRANT MAINTAIN ON TABLE public.candidates_by_city_clean TO anon;

GRANT MAINTAIN ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT MAINTAIN ON TABLE public.candidates_by_city_clean TO service_role;

GRANT REFERENCES ON TABLE public.candidates_by_city_clean TO anon;

GRANT REFERENCES ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT REFERENCES ON TABLE public.candidates_by_city_clean TO service_role;

GRANT SELECT ON TABLE public.candidates_by_city_clean TO anon;

GRANT SELECT ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT SELECT ON TABLE public.candidates_by_city_clean TO service_role;

GRANT TRIGGER ON TABLE public.candidates_by_city_clean TO anon;

GRANT TRIGGER ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT TRIGGER ON TABLE public.candidates_by_city_clean TO service_role;

GRANT TRUNCATE ON TABLE public.candidates_by_city_clean TO anon;

GRANT TRUNCATE ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT TRUNCATE ON TABLE public.candidates_by_city_clean TO service_role;

GRANT UPDATE ON TABLE public.candidates_by_city_clean TO anon;

GRANT UPDATE ON TABLE public.candidates_by_city_clean TO authenticated;

GRANT UPDATE ON TABLE public.candidates_by_city_clean TO service_role;

GRANT DELETE ON TABLE public.cities TO anon;

GRANT DELETE ON TABLE public.cities TO authenticated;

GRANT DELETE ON TABLE public.cities TO service_role;

GRANT INSERT ON TABLE public.cities TO anon;

GRANT INSERT ON TABLE public.cities TO authenticated;

GRANT INSERT ON TABLE public.cities TO service_role;

GRANT MAINTAIN ON TABLE public.cities TO anon;

GRANT MAINTAIN ON TABLE public.cities TO authenticated;

GRANT MAINTAIN ON TABLE public.cities TO service_role;

GRANT REFERENCES ON TABLE public.cities TO anon;

GRANT REFERENCES ON TABLE public.cities TO authenticated;

GRANT REFERENCES ON TABLE public.cities TO service_role;

GRANT SELECT ON TABLE public.cities TO anon;

GRANT SELECT ON TABLE public.cities TO authenticated;

GRANT SELECT ON TABLE public.cities TO service_role;

GRANT TRIGGER ON TABLE public.cities TO anon;

GRANT TRIGGER ON TABLE public.cities TO authenticated;

GRANT TRIGGER ON TABLE public.cities TO service_role;

GRANT TRUNCATE ON TABLE public.cities TO anon;

GRANT TRUNCATE ON TABLE public.cities TO authenticated;

GRANT TRUNCATE ON TABLE public.cities TO service_role;

GRANT UPDATE ON TABLE public.cities TO anon;

GRANT UPDATE ON TABLE public.cities TO authenticated;

GRANT UPDATE ON TABLE public.cities TO service_role;

GRANT DELETE ON TABLE public.cities_api TO anon;

GRANT DELETE ON TABLE public.cities_api TO authenticated;

GRANT DELETE ON TABLE public.cities_api TO service_role;

GRANT INSERT ON TABLE public.cities_api TO anon;

GRANT INSERT ON TABLE public.cities_api TO authenticated;

GRANT INSERT ON TABLE public.cities_api TO service_role;

GRANT MAINTAIN ON TABLE public.cities_api TO anon;

GRANT MAINTAIN ON TABLE public.cities_api TO authenticated;

GRANT MAINTAIN ON TABLE public.cities_api TO service_role;

GRANT REFERENCES ON TABLE public.cities_api TO anon;

GRANT REFERENCES ON TABLE public.cities_api TO authenticated;

GRANT REFERENCES ON TABLE public.cities_api TO service_role;

GRANT SELECT ON TABLE public.cities_api TO anon;

GRANT SELECT ON TABLE public.cities_api TO authenticated;

GRANT SELECT ON TABLE public.cities_api TO service_role;

GRANT TRIGGER ON TABLE public.cities_api TO anon;

GRANT TRIGGER ON TABLE public.cities_api TO authenticated;

GRANT TRIGGER ON TABLE public.cities_api TO service_role;

GRANT TRUNCATE ON TABLE public.cities_api TO anon;

GRANT TRUNCATE ON TABLE public.cities_api TO authenticated;

GRANT TRUNCATE ON TABLE public.cities_api TO service_role;

GRANT UPDATE ON TABLE public.cities_api TO anon;

GRANT UPDATE ON TABLE public.cities_api TO authenticated;

GRANT UPDATE ON TABLE public.cities_api TO service_role;

GRANT DELETE ON TABLE public.city_jurisdiction TO anon;

GRANT DELETE ON TABLE public.city_jurisdiction TO authenticated;

GRANT DELETE ON TABLE public.city_jurisdiction TO service_role;

GRANT INSERT ON TABLE public.city_jurisdiction TO anon;

GRANT INSERT ON TABLE public.city_jurisdiction TO authenticated;

GRANT INSERT ON TABLE public.city_jurisdiction TO service_role;

GRANT MAINTAIN ON TABLE public.city_jurisdiction TO anon;

GRANT MAINTAIN ON TABLE public.city_jurisdiction TO authenticated;

GRANT MAINTAIN ON TABLE public.city_jurisdiction TO service_role;

GRANT REFERENCES ON TABLE public.city_jurisdiction TO anon;

GRANT REFERENCES ON TABLE public.city_jurisdiction TO authenticated;

GRANT REFERENCES ON TABLE public.city_jurisdiction TO service_role;

GRANT SELECT ON TABLE public.city_jurisdiction TO anon;

GRANT SELECT ON TABLE public.city_jurisdiction TO authenticated;

GRANT SELECT ON TABLE public.city_jurisdiction TO service_role;

GRANT TRIGGER ON TABLE public.city_jurisdiction TO anon;

GRANT TRIGGER ON TABLE public.city_jurisdiction TO authenticated;

GRANT TRIGGER ON TABLE public.city_jurisdiction TO service_role;

GRANT TRUNCATE ON TABLE public.city_jurisdiction TO anon;

GRANT TRUNCATE ON TABLE public.city_jurisdiction TO authenticated;

GRANT TRUNCATE ON TABLE public.city_jurisdiction TO service_role;

GRANT UPDATE ON TABLE public.city_jurisdiction TO anon;

GRANT UPDATE ON TABLE public.city_jurisdiction TO authenticated;

GRANT UPDATE ON TABLE public.city_jurisdiction TO service_role;

GRANT DELETE ON TABLE public.city_meta TO anon;

GRANT DELETE ON TABLE public.city_meta TO authenticated;

GRANT DELETE ON TABLE public.city_meta TO service_role;

GRANT INSERT ON TABLE public.city_meta TO anon;

GRANT INSERT ON TABLE public.city_meta TO authenticated;

GRANT INSERT ON TABLE public.city_meta TO service_role;

GRANT MAINTAIN ON TABLE public.city_meta TO anon;

GRANT MAINTAIN ON TABLE public.city_meta TO authenticated;

GRANT MAINTAIN ON TABLE public.city_meta TO service_role;

GRANT REFERENCES ON TABLE public.city_meta TO anon;

GRANT REFERENCES ON TABLE public.city_meta TO authenticated;

GRANT REFERENCES ON TABLE public.city_meta TO service_role;

GRANT SELECT ON TABLE public.city_meta TO anon;

GRANT SELECT ON TABLE public.city_meta TO authenticated;

GRANT SELECT ON TABLE public.city_meta TO service_role;

GRANT TRIGGER ON TABLE public.city_meta TO anon;

GRANT TRIGGER ON TABLE public.city_meta TO authenticated;

GRANT TRIGGER ON TABLE public.city_meta TO service_role;

GRANT TRUNCATE ON TABLE public.city_meta TO anon;

GRANT TRUNCATE ON TABLE public.city_meta TO authenticated;

GRANT TRUNCATE ON TABLE public.city_meta TO service_role;

GRANT UPDATE ON TABLE public.city_meta TO anon;

GRANT UPDATE ON TABLE public.city_meta TO authenticated;

GRANT UPDATE ON TABLE public.city_meta TO service_role;

GRANT DELETE ON TABLE public.city_meta_api TO anon;

GRANT DELETE ON TABLE public.city_meta_api TO authenticated;

GRANT DELETE ON TABLE public.city_meta_api TO service_role;

GRANT INSERT ON TABLE public.city_meta_api TO anon;

GRANT INSERT ON TABLE public.city_meta_api TO authenticated;

GRANT INSERT ON TABLE public.city_meta_api TO service_role;

GRANT MAINTAIN ON TABLE public.city_meta_api TO anon;

GRANT MAINTAIN ON TABLE public.city_meta_api TO authenticated;

GRANT MAINTAIN ON TABLE public.city_meta_api TO service_role;

GRANT REFERENCES ON TABLE public.city_meta_api TO anon;

GRANT REFERENCES ON TABLE public.city_meta_api TO authenticated;

GRANT REFERENCES ON TABLE public.city_meta_api TO service_role;

GRANT SELECT ON TABLE public.city_meta_api TO anon;

GRANT SELECT ON TABLE public.city_meta_api TO authenticated;

GRANT SELECT ON TABLE public.city_meta_api TO service_role;

GRANT TRIGGER ON TABLE public.city_meta_api TO anon;

GRANT TRIGGER ON TABLE public.city_meta_api TO authenticated;

GRANT TRIGGER ON TABLE public.city_meta_api TO service_role;

GRANT TRUNCATE ON TABLE public.city_meta_api TO anon;

GRANT TRUNCATE ON TABLE public.city_meta_api TO authenticated;

GRANT TRUNCATE ON TABLE public.city_meta_api TO service_role;

GRANT UPDATE ON TABLE public.city_meta_api TO anon;

GRANT UPDATE ON TABLE public.city_meta_api TO authenticated;

GRANT UPDATE ON TABLE public.city_meta_api TO service_role;

GRANT DELETE ON TABLE public.deleted_candidates TO anon;

GRANT DELETE ON TABLE public.deleted_candidates TO authenticated;

GRANT DELETE ON TABLE public.deleted_candidates TO service_role;

GRANT INSERT ON TABLE public.deleted_candidates TO anon;

GRANT INSERT ON TABLE public.deleted_candidates TO authenticated;

GRANT INSERT ON TABLE public.deleted_candidates TO service_role;

GRANT MAINTAIN ON TABLE public.deleted_candidates TO anon;

GRANT MAINTAIN ON TABLE public.deleted_candidates TO authenticated;

GRANT MAINTAIN ON TABLE public.deleted_candidates TO service_role;

GRANT REFERENCES ON TABLE public.deleted_candidates TO anon;

GRANT REFERENCES ON TABLE public.deleted_candidates TO authenticated;

GRANT REFERENCES ON TABLE public.deleted_candidates TO service_role;

GRANT SELECT ON TABLE public.deleted_candidates TO anon;

GRANT SELECT ON TABLE public.deleted_candidates TO authenticated;

GRANT SELECT ON TABLE public.deleted_candidates TO service_role;

GRANT TRIGGER ON TABLE public.deleted_candidates TO anon;

GRANT TRIGGER ON TABLE public.deleted_candidates TO authenticated;

GRANT TRIGGER ON TABLE public.deleted_candidates TO service_role;

GRANT TRUNCATE ON TABLE public.deleted_candidates TO anon;

GRANT TRUNCATE ON TABLE public.deleted_candidates TO authenticated;

GRANT TRUNCATE ON TABLE public.deleted_candidates TO service_role;

GRANT UPDATE ON TABLE public.deleted_candidates TO anon;

GRANT UPDATE ON TABLE public.deleted_candidates TO authenticated;

GRANT UPDATE ON TABLE public.deleted_candidates TO service_role;

GRANT DELETE ON TABLE public.deleted_elected_terms TO anon;

GRANT DELETE ON TABLE public.deleted_elected_terms TO authenticated;

GRANT DELETE ON TABLE public.deleted_elected_terms TO service_role;

GRANT INSERT ON TABLE public.deleted_elected_terms TO anon;

GRANT INSERT ON TABLE public.deleted_elected_terms TO authenticated;

GRANT INSERT ON TABLE public.deleted_elected_terms TO service_role;

GRANT MAINTAIN ON TABLE public.deleted_elected_terms TO anon;

GRANT MAINTAIN ON TABLE public.deleted_elected_terms TO authenticated;

GRANT MAINTAIN ON TABLE public.deleted_elected_terms TO service_role;

GRANT REFERENCES ON TABLE public.deleted_elected_terms TO anon;

GRANT REFERENCES ON TABLE public.deleted_elected_terms TO authenticated;

GRANT REFERENCES ON TABLE public.deleted_elected_terms TO service_role;

GRANT SELECT ON TABLE public.deleted_elected_terms TO anon;

GRANT SELECT ON TABLE public.deleted_elected_terms TO authenticated;

GRANT SELECT ON TABLE public.deleted_elected_terms TO service_role;

GRANT TRIGGER ON TABLE public.deleted_elected_terms TO anon;

GRANT TRIGGER ON TABLE public.deleted_elected_terms TO authenticated;

GRANT TRIGGER ON TABLE public.deleted_elected_terms TO service_role;

GRANT TRUNCATE ON TABLE public.deleted_elected_terms TO anon;

GRANT TRUNCATE ON TABLE public.deleted_elected_terms TO authenticated;

GRANT TRUNCATE ON TABLE public.deleted_elected_terms TO service_role;

GRANT UPDATE ON TABLE public.deleted_elected_terms TO anon;

GRANT UPDATE ON TABLE public.deleted_elected_terms TO authenticated;

GRANT UPDATE ON TABLE public.deleted_elected_terms TO service_role;

GRANT DELETE ON TABLE public.elected_terms TO anon;

GRANT DELETE ON TABLE public.elected_terms TO authenticated;

GRANT DELETE ON TABLE public.elected_terms TO service_role;

GRANT INSERT ON TABLE public.elected_terms TO anon;

GRANT INSERT ON TABLE public.elected_terms TO authenticated;

GRANT INSERT ON TABLE public.elected_terms TO service_role;

GRANT MAINTAIN ON TABLE public.elected_terms TO anon;

GRANT MAINTAIN ON TABLE public.elected_terms TO authenticated;

GRANT MAINTAIN ON TABLE public.elected_terms TO service_role;

GRANT REFERENCES ON TABLE public.elected_terms TO anon;

GRANT REFERENCES ON TABLE public.elected_terms TO authenticated;

GRANT REFERENCES ON TABLE public.elected_terms TO service_role;

GRANT SELECT ON TABLE public.elected_terms TO anon;

GRANT SELECT ON TABLE public.elected_terms TO authenticated;

GRANT SELECT ON TABLE public.elected_terms TO service_role;

GRANT TRIGGER ON TABLE public.elected_terms TO anon;

GRANT TRIGGER ON TABLE public.elected_terms TO authenticated;

GRANT TRIGGER ON TABLE public.elected_terms TO service_role;

GRANT TRUNCATE ON TABLE public.elected_terms TO anon;

GRANT TRUNCATE ON TABLE public.elected_terms TO authenticated;

GRANT TRUNCATE ON TABLE public.elected_terms TO service_role;

GRANT UPDATE ON TABLE public.elected_terms TO anon;

GRANT UPDATE ON TABLE public.elected_terms TO authenticated;

GRANT UPDATE ON TABLE public.elected_terms TO service_role;

GRANT DELETE ON TABLE public.jurisdictions TO anon;

GRANT DELETE ON TABLE public.jurisdictions TO authenticated;

GRANT DELETE ON TABLE public.jurisdictions TO service_role;

GRANT INSERT ON TABLE public.jurisdictions TO anon;

GRANT INSERT ON TABLE public.jurisdictions TO authenticated;

GRANT INSERT ON TABLE public.jurisdictions TO service_role;

GRANT MAINTAIN ON TABLE public.jurisdictions TO anon;

GRANT MAINTAIN ON TABLE public.jurisdictions TO authenticated;

GRANT MAINTAIN ON TABLE public.jurisdictions TO service_role;

GRANT REFERENCES ON TABLE public.jurisdictions TO anon;

GRANT REFERENCES ON TABLE public.jurisdictions TO authenticated;

GRANT REFERENCES ON TABLE public.jurisdictions TO service_role;

GRANT SELECT ON TABLE public.jurisdictions TO anon;

GRANT SELECT ON TABLE public.jurisdictions TO authenticated;

GRANT SELECT ON TABLE public.jurisdictions TO service_role;

GRANT TRIGGER ON TABLE public.jurisdictions TO anon;

GRANT TRIGGER ON TABLE public.jurisdictions TO authenticated;

GRANT TRIGGER ON TABLE public.jurisdictions TO service_role;

GRANT TRUNCATE ON TABLE public.jurisdictions TO anon;

GRANT TRUNCATE ON TABLE public.jurisdictions TO authenticated;

GRANT TRUNCATE ON TABLE public.jurisdictions TO service_role;

GRANT UPDATE ON TABLE public.jurisdictions TO anon;

GRANT UPDATE ON TABLE public.jurisdictions TO authenticated;

GRANT UPDATE ON TABLE public.jurisdictions TO service_role;

GRANT DELETE ON TABLE public.notifications TO anon;

GRANT DELETE ON TABLE public.notifications TO authenticated;

GRANT DELETE ON TABLE public.notifications TO service_role;

GRANT INSERT ON TABLE public.notifications TO anon;

GRANT INSERT ON TABLE public.notifications TO authenticated;

GRANT INSERT ON TABLE public.notifications TO service_role;

GRANT MAINTAIN ON TABLE public.notifications TO anon;

GRANT MAINTAIN ON TABLE public.notifications TO authenticated;

GRANT MAINTAIN ON TABLE public.notifications TO service_role;

GRANT REFERENCES ON TABLE public.notifications TO anon;

GRANT REFERENCES ON TABLE public.notifications TO authenticated;

GRANT REFERENCES ON TABLE public.notifications TO service_role;

GRANT SELECT ON TABLE public.notifications TO anon;

GRANT SELECT ON TABLE public.notifications TO authenticated;

GRANT SELECT ON TABLE public.notifications TO service_role;

GRANT TRIGGER ON TABLE public.notifications TO anon;

GRANT TRIGGER ON TABLE public.notifications TO authenticated;

GRANT TRIGGER ON TABLE public.notifications TO service_role;

GRANT TRUNCATE ON TABLE public.notifications TO anon;

GRANT TRUNCATE ON TABLE public.notifications TO authenticated;

GRANT TRUNCATE ON TABLE public.notifications TO service_role;

GRANT UPDATE ON TABLE public.notifications TO anon;

GRANT UPDATE ON TABLE public.notifications TO authenticated;

GRANT UPDATE ON TABLE public.notifications TO service_role;

GRANT DELETE ON TABLE public.office_options TO anon;

GRANT DELETE ON TABLE public.office_options TO authenticated;

GRANT DELETE ON TABLE public.office_options TO service_role;

GRANT INSERT ON TABLE public.office_options TO anon;

GRANT INSERT ON TABLE public.office_options TO authenticated;

GRANT INSERT ON TABLE public.office_options TO service_role;

GRANT MAINTAIN ON TABLE public.office_options TO anon;

GRANT MAINTAIN ON TABLE public.office_options TO authenticated;

GRANT MAINTAIN ON TABLE public.office_options TO service_role;

GRANT REFERENCES ON TABLE public.office_options TO anon;

GRANT REFERENCES ON TABLE public.office_options TO authenticated;

GRANT REFERENCES ON TABLE public.office_options TO service_role;

GRANT SELECT ON TABLE public.office_options TO anon;

GRANT SELECT ON TABLE public.office_options TO authenticated;

GRANT SELECT ON TABLE public.office_options TO service_role;

GRANT TRIGGER ON TABLE public.office_options TO anon;

GRANT TRIGGER ON TABLE public.office_options TO authenticated;

GRANT TRIGGER ON TABLE public.office_options TO service_role;

GRANT TRUNCATE ON TABLE public.office_options TO anon;

GRANT TRUNCATE ON TABLE public.office_options TO authenticated;

GRANT TRUNCATE ON TABLE public.office_options TO service_role;

GRANT UPDATE ON TABLE public.office_options TO anon;

GRANT UPDATE ON TABLE public.office_options TO authenticated;

GRANT UPDATE ON TABLE public.office_options TO service_role;

GRANT SELECT ON TABLE public.office_options_id_seq TO anon;

GRANT SELECT ON TABLE public.office_options_id_seq TO authenticated;

GRANT SELECT ON TABLE public.office_options_id_seq TO service_role;

GRANT UPDATE ON TABLE public.office_options_id_seq TO anon;

GRANT UPDATE ON TABLE public.office_options_id_seq TO authenticated;

GRANT UPDATE ON TABLE public.office_options_id_seq TO service_role;

GRANT USAGE ON TABLE public.office_options_id_seq TO anon;

GRANT USAGE ON TABLE public.office_options_id_seq TO authenticated;

GRANT USAGE ON TABLE public.office_options_id_seq TO service_role;

GRANT DELETE ON TABLE public.political_parties TO anon;

GRANT DELETE ON TABLE public.political_parties TO authenticated;

GRANT DELETE ON TABLE public.political_parties TO service_role;

GRANT INSERT ON TABLE public.political_parties TO anon;

GRANT INSERT ON TABLE public.political_parties TO authenticated;

GRANT INSERT ON TABLE public.political_parties TO service_role;

GRANT MAINTAIN ON TABLE public.political_parties TO anon;

GRANT MAINTAIN ON TABLE public.political_parties TO authenticated;

GRANT MAINTAIN ON TABLE public.political_parties TO service_role;

GRANT REFERENCES ON TABLE public.political_parties TO anon;

GRANT REFERENCES ON TABLE public.political_parties TO authenticated;

GRANT REFERENCES ON TABLE public.political_parties TO service_role;

GRANT SELECT ON TABLE public.political_parties TO anon;

GRANT SELECT ON TABLE public.political_parties TO authenticated;

GRANT SELECT ON TABLE public.political_parties TO service_role;

GRANT TRIGGER ON TABLE public.political_parties TO anon;

GRANT TRIGGER ON TABLE public.political_parties TO authenticated;

GRANT TRIGGER ON TABLE public.political_parties TO service_role;

GRANT TRUNCATE ON TABLE public.political_parties TO anon;

GRANT TRUNCATE ON TABLE public.political_parties TO authenticated;

GRANT TRUNCATE ON TABLE public.political_parties TO service_role;

GRANT UPDATE ON TABLE public.political_parties TO anon;

GRANT UPDATE ON TABLE public.political_parties TO authenticated;

GRANT UPDATE ON TABLE public.political_parties TO service_role;

GRANT DELETE ON TABLE public.poll_options TO anon;

GRANT DELETE ON TABLE public.poll_options TO authenticated;

GRANT DELETE ON TABLE public.poll_options TO service_role;

GRANT INSERT ON TABLE public.poll_options TO anon;

GRANT INSERT ON TABLE public.poll_options TO authenticated;

GRANT INSERT ON TABLE public.poll_options TO service_role;

GRANT MAINTAIN ON TABLE public.poll_options TO anon;

GRANT MAINTAIN ON TABLE public.poll_options TO authenticated;

GRANT MAINTAIN ON TABLE public.poll_options TO service_role;

GRANT REFERENCES ON TABLE public.poll_options TO anon;

GRANT REFERENCES ON TABLE public.poll_options TO authenticated;

GRANT REFERENCES ON TABLE public.poll_options TO service_role;

GRANT SELECT ON TABLE public.poll_options TO anon;

GRANT SELECT ON TABLE public.poll_options TO authenticated;

GRANT SELECT ON TABLE public.poll_options TO service_role;

GRANT TRIGGER ON TABLE public.poll_options TO anon;

GRANT TRIGGER ON TABLE public.poll_options TO authenticated;

GRANT TRIGGER ON TABLE public.poll_options TO service_role;

GRANT TRUNCATE ON TABLE public.poll_options TO anon;

GRANT TRUNCATE ON TABLE public.poll_options TO authenticated;

GRANT TRUNCATE ON TABLE public.poll_options TO service_role;

GRANT UPDATE ON TABLE public.poll_options TO anon;

GRANT UPDATE ON TABLE public.poll_options TO authenticated;

GRANT UPDATE ON TABLE public.poll_options TO service_role;

GRANT DELETE ON TABLE public.poll_votes TO anon;

GRANT DELETE ON TABLE public.poll_votes TO authenticated;

GRANT DELETE ON TABLE public.poll_votes TO service_role;

GRANT INSERT ON TABLE public.poll_votes TO anon;

GRANT INSERT ON TABLE public.poll_votes TO authenticated;

GRANT INSERT ON TABLE public.poll_votes TO service_role;

GRANT MAINTAIN ON TABLE public.poll_votes TO anon;

GRANT MAINTAIN ON TABLE public.poll_votes TO authenticated;

GRANT MAINTAIN ON TABLE public.poll_votes TO service_role;

GRANT REFERENCES ON TABLE public.poll_votes TO anon;

GRANT REFERENCES ON TABLE public.poll_votes TO authenticated;

GRANT REFERENCES ON TABLE public.poll_votes TO service_role;

GRANT SELECT ON TABLE public.poll_votes TO anon;

GRANT SELECT ON TABLE public.poll_votes TO authenticated;

GRANT SELECT ON TABLE public.poll_votes TO service_role;

GRANT TRIGGER ON TABLE public.poll_votes TO anon;

GRANT TRIGGER ON TABLE public.poll_votes TO authenticated;

GRANT TRIGGER ON TABLE public.poll_votes TO service_role;

GRANT TRUNCATE ON TABLE public.poll_votes TO anon;

GRANT TRUNCATE ON TABLE public.poll_votes TO authenticated;

GRANT TRUNCATE ON TABLE public.poll_votes TO service_role;

GRANT UPDATE ON TABLE public.poll_votes TO anon;

GRANT UPDATE ON TABLE public.poll_votes TO authenticated;

GRANT UPDATE ON TABLE public.poll_votes TO service_role;

GRANT DELETE ON TABLE public.polls TO anon;

GRANT DELETE ON TABLE public.polls TO authenticated;

GRANT DELETE ON TABLE public.polls TO service_role;

GRANT INSERT ON TABLE public.polls TO anon;

GRANT INSERT ON TABLE public.polls TO authenticated;

GRANT INSERT ON TABLE public.polls TO service_role;

GRANT MAINTAIN ON TABLE public.polls TO anon;

GRANT MAINTAIN ON TABLE public.polls TO authenticated;

GRANT MAINTAIN ON TABLE public.polls TO service_role;

GRANT REFERENCES ON TABLE public.polls TO anon;

GRANT REFERENCES ON TABLE public.polls TO authenticated;

GRANT REFERENCES ON TABLE public.polls TO service_role;

GRANT SELECT ON TABLE public.polls TO anon;

GRANT SELECT ON TABLE public.polls TO authenticated;

GRANT SELECT ON TABLE public.polls TO service_role;

GRANT TRIGGER ON TABLE public.polls TO anon;

GRANT TRIGGER ON TABLE public.polls TO authenticated;

GRANT TRIGGER ON TABLE public.polls TO service_role;

GRANT TRUNCATE ON TABLE public.polls TO anon;

GRANT TRUNCATE ON TABLE public.polls TO authenticated;

GRANT TRUNCATE ON TABLE public.polls TO service_role;

GRANT UPDATE ON TABLE public.polls TO anon;

GRANT UPDATE ON TABLE public.polls TO authenticated;

GRANT UPDATE ON TABLE public.polls TO service_role;

GRANT DELETE ON TABLE public.quiz_options TO anon;

GRANT DELETE ON TABLE public.quiz_options TO authenticated;

GRANT DELETE ON TABLE public.quiz_options TO service_role;

GRANT INSERT ON TABLE public.quiz_options TO anon;

GRANT INSERT ON TABLE public.quiz_options TO authenticated;

GRANT INSERT ON TABLE public.quiz_options TO service_role;

GRANT MAINTAIN ON TABLE public.quiz_options TO anon;

GRANT MAINTAIN ON TABLE public.quiz_options TO authenticated;

GRANT MAINTAIN ON TABLE public.quiz_options TO service_role;

GRANT REFERENCES ON TABLE public.quiz_options TO anon;

GRANT REFERENCES ON TABLE public.quiz_options TO authenticated;

GRANT REFERENCES ON TABLE public.quiz_options TO service_role;

GRANT SELECT ON TABLE public.quiz_options TO anon;

GRANT SELECT ON TABLE public.quiz_options TO authenticated;

GRANT SELECT ON TABLE public.quiz_options TO service_role;

GRANT TRIGGER ON TABLE public.quiz_options TO anon;

GRANT TRIGGER ON TABLE public.quiz_options TO authenticated;

GRANT TRIGGER ON TABLE public.quiz_options TO service_role;

GRANT TRUNCATE ON TABLE public.quiz_options TO anon;

GRANT TRUNCATE ON TABLE public.quiz_options TO authenticated;

GRANT TRUNCATE ON TABLE public.quiz_options TO service_role;

GRANT UPDATE ON TABLE public.quiz_options TO anon;

GRANT UPDATE ON TABLE public.quiz_options TO authenticated;

GRANT UPDATE ON TABLE public.quiz_options TO service_role;

GRANT DELETE ON TABLE public.quiz_questions TO anon;

GRANT DELETE ON TABLE public.quiz_questions TO authenticated;

GRANT DELETE ON TABLE public.quiz_questions TO service_role;

GRANT INSERT ON TABLE public.quiz_questions TO anon;

GRANT INSERT ON TABLE public.quiz_questions TO authenticated;

GRANT INSERT ON TABLE public.quiz_questions TO service_role;

GRANT MAINTAIN ON TABLE public.quiz_questions TO anon;

GRANT MAINTAIN ON TABLE public.quiz_questions TO authenticated;

GRANT MAINTAIN ON TABLE public.quiz_questions TO service_role;

GRANT REFERENCES ON TABLE public.quiz_questions TO anon;

GRANT REFERENCES ON TABLE public.quiz_questions TO authenticated;

GRANT REFERENCES ON TABLE public.quiz_questions TO service_role;

GRANT SELECT ON TABLE public.quiz_questions TO anon;

GRANT SELECT ON TABLE public.quiz_questions TO authenticated;

GRANT SELECT ON TABLE public.quiz_questions TO service_role;

GRANT TRIGGER ON TABLE public.quiz_questions TO anon;

GRANT TRIGGER ON TABLE public.quiz_questions TO authenticated;

GRANT TRIGGER ON TABLE public.quiz_questions TO service_role;

GRANT TRUNCATE ON TABLE public.quiz_questions TO anon;

GRANT TRUNCATE ON TABLE public.quiz_questions TO authenticated;

GRANT TRUNCATE ON TABLE public.quiz_questions TO service_role;

GRANT UPDATE ON TABLE public.quiz_questions TO anon;

GRANT UPDATE ON TABLE public.quiz_questions TO authenticated;

GRANT UPDATE ON TABLE public.quiz_questions TO service_role;

GRANT DELETE ON TABLE public.quiz_user_answers TO anon;

GRANT DELETE ON TABLE public.quiz_user_answers TO authenticated;

GRANT DELETE ON TABLE public.quiz_user_answers TO service_role;

GRANT INSERT ON TABLE public.quiz_user_answers TO anon;

GRANT INSERT ON TABLE public.quiz_user_answers TO authenticated;

GRANT INSERT ON TABLE public.quiz_user_answers TO service_role;

GRANT MAINTAIN ON TABLE public.quiz_user_answers TO anon;

GRANT MAINTAIN ON TABLE public.quiz_user_answers TO authenticated;

GRANT MAINTAIN ON TABLE public.quiz_user_answers TO service_role;

GRANT REFERENCES ON TABLE public.quiz_user_answers TO anon;

GRANT REFERENCES ON TABLE public.quiz_user_answers TO authenticated;

GRANT REFERENCES ON TABLE public.quiz_user_answers TO service_role;

GRANT SELECT ON TABLE public.quiz_user_answers TO anon;

GRANT SELECT ON TABLE public.quiz_user_answers TO authenticated;

GRANT SELECT ON TABLE public.quiz_user_answers TO service_role;

GRANT TRIGGER ON TABLE public.quiz_user_answers TO anon;

GRANT TRIGGER ON TABLE public.quiz_user_answers TO authenticated;

GRANT TRIGGER ON TABLE public.quiz_user_answers TO service_role;

GRANT TRUNCATE ON TABLE public.quiz_user_answers TO anon;

GRANT TRUNCATE ON TABLE public.quiz_user_answers TO authenticated;

GRANT TRUNCATE ON TABLE public.quiz_user_answers TO service_role;

GRANT UPDATE ON TABLE public.quiz_user_answers TO anon;

GRANT UPDATE ON TABLE public.quiz_user_answers TO authenticated;

GRANT UPDATE ON TABLE public.quiz_user_answers TO service_role;

GRANT DELETE ON TABLE public.race_jurisdiction TO anon;

GRANT DELETE ON TABLE public.race_jurisdiction TO authenticated;

GRANT DELETE ON TABLE public.race_jurisdiction TO service_role;

GRANT INSERT ON TABLE public.race_jurisdiction TO anon;

GRANT INSERT ON TABLE public.race_jurisdiction TO authenticated;

GRANT INSERT ON TABLE public.race_jurisdiction TO service_role;

GRANT MAINTAIN ON TABLE public.race_jurisdiction TO anon;

GRANT MAINTAIN ON TABLE public.race_jurisdiction TO authenticated;

GRANT MAINTAIN ON TABLE public.race_jurisdiction TO service_role;

GRANT REFERENCES ON TABLE public.race_jurisdiction TO anon;

GRANT REFERENCES ON TABLE public.race_jurisdiction TO authenticated;

GRANT REFERENCES ON TABLE public.race_jurisdiction TO service_role;

GRANT SELECT ON TABLE public.race_jurisdiction TO anon;

GRANT SELECT ON TABLE public.race_jurisdiction TO authenticated;

GRANT SELECT ON TABLE public.race_jurisdiction TO service_role;

GRANT TRIGGER ON TABLE public.race_jurisdiction TO anon;

GRANT TRIGGER ON TABLE public.race_jurisdiction TO authenticated;

GRANT TRIGGER ON TABLE public.race_jurisdiction TO service_role;

GRANT TRUNCATE ON TABLE public.race_jurisdiction TO anon;

GRANT TRUNCATE ON TABLE public.race_jurisdiction TO authenticated;

GRANT TRUNCATE ON TABLE public.race_jurisdiction TO service_role;

GRANT UPDATE ON TABLE public.race_jurisdiction TO anon;

GRANT UPDATE ON TABLE public.race_jurisdiction TO authenticated;

GRANT UPDATE ON TABLE public.race_jurisdiction TO service_role;

GRANT DELETE ON TABLE public.races TO anon;

GRANT DELETE ON TABLE public.races TO authenticated;

GRANT DELETE ON TABLE public.races TO service_role;

GRANT INSERT ON TABLE public.races TO anon;

GRANT INSERT ON TABLE public.races TO authenticated;

GRANT INSERT ON TABLE public.races TO service_role;

GRANT MAINTAIN ON TABLE public.races TO anon;

GRANT MAINTAIN ON TABLE public.races TO authenticated;

GRANT MAINTAIN ON TABLE public.races TO service_role;

GRANT REFERENCES ON TABLE public.races TO anon;

GRANT REFERENCES ON TABLE public.races TO authenticated;

GRANT REFERENCES ON TABLE public.races TO service_role;

GRANT SELECT ON TABLE public.races TO anon;

GRANT SELECT ON TABLE public.races TO authenticated;

GRANT SELECT ON TABLE public.races TO service_role;

GRANT TRIGGER ON TABLE public.races TO anon;

GRANT TRIGGER ON TABLE public.races TO authenticated;

GRANT TRIGGER ON TABLE public.races TO service_role;

GRANT TRUNCATE ON TABLE public.races TO anon;

GRANT TRUNCATE ON TABLE public.races TO authenticated;

GRANT TRUNCATE ON TABLE public.races TO service_role;

GRANT UPDATE ON TABLE public.races TO anon;

GRANT UPDATE ON TABLE public.races TO authenticated;

GRANT UPDATE ON TABLE public.races TO service_role;

GRANT DELETE ON TABLE public.shared_files TO anon;

GRANT DELETE ON TABLE public.shared_files TO authenticated;

GRANT DELETE ON TABLE public.shared_files TO service_role;

GRANT INSERT ON TABLE public.shared_files TO anon;

GRANT INSERT ON TABLE public.shared_files TO authenticated;

GRANT INSERT ON TABLE public.shared_files TO service_role;

GRANT MAINTAIN ON TABLE public.shared_files TO anon;

GRANT MAINTAIN ON TABLE public.shared_files TO authenticated;

GRANT MAINTAIN ON TABLE public.shared_files TO service_role;

GRANT REFERENCES ON TABLE public.shared_files TO anon;

GRANT REFERENCES ON TABLE public.shared_files TO authenticated;

GRANT REFERENCES ON TABLE public.shared_files TO service_role;

GRANT SELECT ON TABLE public.shared_files TO anon;

GRANT SELECT ON TABLE public.shared_files TO authenticated;

GRANT SELECT ON TABLE public.shared_files TO service_role;

GRANT TRIGGER ON TABLE public.shared_files TO anon;

GRANT TRIGGER ON TABLE public.shared_files TO authenticated;

GRANT TRIGGER ON TABLE public.shared_files TO service_role;

GRANT TRUNCATE ON TABLE public.shared_files TO anon;

GRANT TRUNCATE ON TABLE public.shared_files TO authenticated;

GRANT TRUNCATE ON TABLE public.shared_files TO service_role;

GRANT UPDATE ON TABLE public.shared_files TO anon;

GRANT UPDATE ON TABLE public.shared_files TO authenticated;

GRANT UPDATE ON TABLE public.shared_files TO service_role;

GRANT DELETE ON TABLE public.state_election_agencies TO anon;

GRANT DELETE ON TABLE public.state_election_agencies TO authenticated;

GRANT DELETE ON TABLE public.state_election_agencies TO service_role;

GRANT INSERT ON TABLE public.state_election_agencies TO anon;

GRANT INSERT ON TABLE public.state_election_agencies TO authenticated;

GRANT INSERT ON TABLE public.state_election_agencies TO service_role;

GRANT MAINTAIN ON TABLE public.state_election_agencies TO anon;

GRANT MAINTAIN ON TABLE public.state_election_agencies TO authenticated;

GRANT MAINTAIN ON TABLE public.state_election_agencies TO service_role;

GRANT REFERENCES ON TABLE public.state_election_agencies TO anon;

GRANT REFERENCES ON TABLE public.state_election_agencies TO authenticated;

GRANT REFERENCES ON TABLE public.state_election_agencies TO service_role;

GRANT SELECT ON TABLE public.state_election_agencies TO anon;

GRANT SELECT ON TABLE public.state_election_agencies TO authenticated;

GRANT SELECT ON TABLE public.state_election_agencies TO service_role;

GRANT TRIGGER ON TABLE public.state_election_agencies TO anon;

GRANT TRIGGER ON TABLE public.state_election_agencies TO authenticated;

GRANT TRIGGER ON TABLE public.state_election_agencies TO service_role;

GRANT TRUNCATE ON TABLE public.state_election_agencies TO anon;

GRANT TRUNCATE ON TABLE public.state_election_agencies TO authenticated;

GRANT TRUNCATE ON TABLE public.state_election_agencies TO service_role;

GRANT UPDATE ON TABLE public.state_election_agencies TO anon;

GRANT UPDATE ON TABLE public.state_election_agencies TO authenticated;

GRANT UPDATE ON TABLE public.state_election_agencies TO service_role;

GRANT DELETE ON TABLE public.states TO anon;

GRANT DELETE ON TABLE public.states TO authenticated;

GRANT DELETE ON TABLE public.states TO service_role;

GRANT INSERT ON TABLE public.states TO anon;

GRANT INSERT ON TABLE public.states TO authenticated;

GRANT INSERT ON TABLE public.states TO service_role;

GRANT MAINTAIN ON TABLE public.states TO anon;

GRANT MAINTAIN ON TABLE public.states TO authenticated;

GRANT MAINTAIN ON TABLE public.states TO service_role;

GRANT REFERENCES ON TABLE public.states TO anon;

GRANT REFERENCES ON TABLE public.states TO authenticated;

GRANT REFERENCES ON TABLE public.states TO service_role;

GRANT SELECT ON TABLE public.states TO anon;

GRANT SELECT ON TABLE public.states TO authenticated;

GRANT SELECT ON TABLE public.states TO service_role;

GRANT TRIGGER ON TABLE public.states TO anon;

GRANT TRIGGER ON TABLE public.states TO authenticated;

GRANT TRIGGER ON TABLE public.states TO service_role;

GRANT TRUNCATE ON TABLE public.states TO anon;

GRANT TRUNCATE ON TABLE public.states TO authenticated;

GRANT TRUNCATE ON TABLE public.states TO service_role;

GRANT UPDATE ON TABLE public.states TO anon;

GRANT UPDATE ON TABLE public.states TO authenticated;

GRANT UPDATE ON TABLE public.states TO service_role;

GRANT DELETE ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT DELETE ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT DELETE ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT INSERT ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT INSERT ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT INSERT ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT MAINTAIN ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT MAINTAIN ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT MAINTAIN ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT REFERENCES ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT REFERENCES ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT REFERENCES ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT SELECT ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT SELECT ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT SELECT ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT TRIGGER ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT TRIGGER ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT TRIGGER ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT TRUNCATE ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT TRUNCATE ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT TRUNCATE ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT UPDATE ON TABLE public.view_defs_backup_20261011 TO anon;

GRANT UPDATE ON TABLE public.view_defs_backup_20261011 TO authenticated;

GRANT UPDATE ON TABLE public.view_defs_backup_20261011 TO service_role;

GRANT EXECUTE ON FUNCTION api.admin_restore_candidate(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION api.admin_restore_candidate(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.admin_restore_candidate(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.admin_restore_elected(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.admin_restore_elected(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.admin_set_user_role(uuid,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.admin_set_user_role(uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.admin_soft_delete_candidate(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION api.admin_soft_delete_candidate(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.admin_soft_delete_candidate(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.admin_soft_delete_elected(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.admin_soft_delete_elected(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.approve_candidate(uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.approve_candidate(uuid,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.approve_candidate(uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.archive_and_remove_account_rows(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.cancel_account_deletion() TO authenticated;

GRANT EXECUTE ON FUNCTION api.cleanup_account_deletion_system_fixture(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION api.ensure_app_user(text,text) TO anon;

GRANT EXECUTE ON FUNCTION api.ensure_app_user(text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.ensure_app_user(text,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.ensure_app_user(text,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.get_candidate_self_status() TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.get_candidate_self_status() TO service_role;

GRANT EXECUTE ON FUNCTION api.my_account_deletion() TO authenticated;

GRANT EXECUTE ON FUNCTION api.poll_votes_validate_option_belongs() TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.poll_votes_validate_option_belongs() TO service_role;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,uuid,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.promote_candidate_to_elected(text,uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.register_candidate(text,text,text,text,text,text,text,text,text,text,integer,boolean,text,text,text) TO anon;

GRANT EXECUTE ON FUNCTION api.register_candidate(text,text,text,text,text,text,text,text,text,text,integer,boolean,text,text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.register_candidate(text,text,text,text,text,text,text,text,text,text,integer,boolean,text,text,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.register_candidate(text,text,text,text,text,text,text,text,text,text,integer,boolean,text,text,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.reject_candidate(uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.reject_candidate(uuid,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.reject_candidate(uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.request_account_deletion() TO authenticated;

GRANT EXECUTE ON FUNCTION api.run_account_deletion_system_test() TO service_role;

GRANT EXECUTE ON FUNCTION api.set_updated_at() TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.set_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION api.submit_poll_vote(uuid,uuid,text) TO anon;

GRANT EXECUTE ON FUNCTION api.submit_poll_vote(uuid,uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION api.submit_poll_vote(uuid,uuid,text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.submit_poll_vote(uuid,uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION api.tg_touch_updated_at() TO PUBLIC;

GRANT EXECUTE ON FUNCTION api.tg_touch_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION app_is_admin() TO anon;

GRANT EXECUTE ON FUNCTION app_is_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION app_is_admin() TO PUBLIC;

GRANT EXECUTE ON FUNCTION app_is_admin() TO service_role;

GRANT EXECUTE ON FUNCTION current_cycle() TO anon;

GRANT EXECUTE ON FUNCTION current_cycle() TO authenticated;

GRANT EXECUTE ON FUNCTION current_cycle() TO PUBLIC;

GRANT EXECUTE ON FUNCTION current_cycle() TO service_role;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION rpc_ensure_app_user(text,user_role) TO anon;

GRANT EXECUTE ON FUNCTION rpc_ensure_app_user(text,user_role) TO authenticated;

GRANT EXECUTE ON FUNCTION rpc_ensure_app_user(text,user_role) TO PUBLIC;

GRANT EXECUTE ON FUNCTION rpc_ensure_app_user(text,user_role) TO service_role;
