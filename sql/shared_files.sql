-- Public files an admin uploads, then shares by URL in a notification.
-- The iOS app already opens a notification link in Safari. A PDF at that
-- link displays there, so the app does not need a change.
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.shared_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  content_type text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint shared_files_title_len check (char_length(title) between 1 and 120),
  constraint shared_files_type check (
    content_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  )
);

alter table public.shared_files enable row level security;

create or replace view api.shared_files as
  select id, title, file_name, content_type, storage_path, created_at
  from public.shared_files;

grant select, insert, delete on api.shared_files to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-files',
  'shared-files',
  true,
  8388608,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
