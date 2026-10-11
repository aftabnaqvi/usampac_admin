-- state_election_agencies: per-state election agency + filing number rules
-- Run this in Supabase SQL Editor (public schema).

-- 1. Create table (original columns)
create table if not exists public.state_election_agencies (
  state_code     text primary key,
  agency_number  text not null,
  agency_name    text not null
);

-- 2. Add filing-number rule columns (safe if table already existed)
alter table public.state_election_agencies
  add column if not exists filing_number_label       text,
  add column if not exists filing_number_placeholder text,
  add column if not exists filing_number_exact_length int,
  add column if not exists filing_number_max_length  int,
  add column if not exists filing_number_required    boolean;

-- 3. CA: agency info + FPPC filing rules (single upsert)
insert into public.state_election_agencies (
  state_code,
  agency_number,
  agency_name,
  filing_number_label,
  filing_number_placeholder,
  filing_number_exact_length,
  filing_number_max_length,
  filing_number_required
) values (
  'CA',
  'FPPC',
  'California Fair Political Practices Commission',
  'FPPC Filing Number',
  '7‑digit FPPC number',
  7,
  null,
  true
)
on conflict (state_code) do update set
  agency_number              = excluded.agency_number,
  agency_name                = excluded.agency_name,
  filing_number_label        = excluded.filing_number_label,
  filing_number_placeholder = excluded.filing_number_placeholder,
  filing_number_exact_length = excluded.filing_number_exact_length,
  filing_number_max_length   = excluded.filing_number_max_length,
  filing_number_required     = excluded.filing_number_required;

-- 4. (Optional) Add other states when you have their rules, e.g.:
-- insert into public.state_election_agencies (
--   state_code, agency_number, agency_name,
--   filing_number_label, filing_number_placeholder,
--   filing_number_exact_length, filing_number_max_length, filing_number_required
-- ) values (
--   'TX', 'TEC', 'Texas Ethics Commission',
--   'Texas Ethics Commission ID', 'TEC filing number',
--   8, null, true
-- )
-- on conflict (state_code) do update set
--   agency_number = excluded.agency_number,
--   agency_name = excluded.agency_name,
--   filing_number_label = excluded.filing_number_label,
--   filing_number_placeholder = excluded.filing_number_placeholder,
--   filing_number_exact_length = excluded.filing_number_exact_length,
--   filing_number_max_length = excluded.filing_number_max_length,
--   filing_number_required = excluded.filing_number_required;

-- 5. Expose to api schema so the iOS app (Accept-Profile: api) can read it via PostgREST.
create or replace view api.state_election_agencies as
  select * from public.state_election_agencies;
grant select on api.state_election_agencies to anon, authenticated;
