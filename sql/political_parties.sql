-- political_parties: reference list for candidate registration / settings / filters
-- Run this in Supabase SQL Editor (public schema).
--
-- The iOS app reads via Accept-Profile: api, so we also expose api.political_parties.
-- SELECT only for anon + authenticated. Writes stay in the SQL editor / admin.

create table if not exists public.political_parties (
  id              text primary key,
  label           text not null,
  sort_order      int not null default 100,
  is_active       boolean not null default true,
  allows_write_in boolean not null default false
);

insert into public.political_parties (id, label, sort_order, is_active, allows_write_in) values
  ('democratic',   'Democratic',   10, true, false),
  ('republican',   'Republican',   20, true, false),
  ('independent',  'Independent',  30, true, false),
  ('libertarian',  'Libertarian',  40, true, false),
  ('green',        'Green',        50, true, false),
  ('constitution', 'Constitution', 60, true, false),
  ('nonpartisan',  'Nonpartisan',  70, true, false),
  ('other',        'Other',        90, true, true)
on conflict (id) do update set
  label           = excluded.label,
  sort_order      = excluded.sort_order,
  is_active       = excluded.is_active,
  allows_write_in = excluded.allows_write_in;

alter table public.political_parties enable row level security;

drop policy if exists political_parties_select_active on public.political_parties;
create policy political_parties_select_active
  on public.political_parties
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.political_parties to anon, authenticated;

create or replace view api.political_parties as
  select id, label, sort_order, is_active, allows_write_in
  from public.political_parties
  where is_active = true;

grant select on api.political_parties to anon, authenticated;
