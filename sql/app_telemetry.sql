-- Anonymous app usage events (which screens people open, which links they tap).
-- No visitor name, email, phone, or user_id.
-- Run in the Supabase SQL Editor.

create table if not exists public.app_telemetry (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_name text not null,
  screen text,
  install_id uuid not null,
  app_version text,
  is_signed_in boolean not null default false
);

alter table public.app_telemetry add column if not exists audience text;
alter table public.app_telemetry add column if not exists city text;
alter table public.app_telemetry add column if not exists region text;
alter table public.app_telemetry add column if not exists link_kind text;
alter table public.app_telemetry add column if not exists target_kind text;
alter table public.app_telemetry add column if not exists target_id uuid;

create index if not exists app_telemetry_occurred_at_idx
  on public.app_telemetry (occurred_at desc);

create index if not exists app_telemetry_screen_idx
  on public.app_telemetry (screen, occurred_at desc);

create index if not exists app_telemetry_link_kind_idx
  on public.app_telemetry (link_kind, occurred_at desc);

create index if not exists app_telemetry_city_idx
  on public.app_telemetry (city, occurred_at desc);

alter table public.app_telemetry enable row level security;

drop policy if exists app_telemetry_insert_anon on public.app_telemetry;
create policy app_telemetry_insert_anon
  on public.app_telemetry
  for insert
  to anon, authenticated
  with check (true);

revoke all on public.app_telemetry from anon, authenticated;
grant insert on public.app_telemetry to anon, authenticated;
grant select, insert, update, delete on public.app_telemetry to service_role;

create or replace view api.app_telemetry as
  select
    id,
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
  from public.app_telemetry;

grant insert on api.app_telemetry to anon, authenticated;
grant select on api.app_telemetry to service_role;
