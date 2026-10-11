-- Optional flyer image on admin notifications (shown in the iOS Notifications tab).
-- api.notifications is a VIEW. Add the column on the base table, then replace the view.
--
-- 1) Run the inspect block. You want public.notifications to be relkind = r (table).
-- 2) Run the apply block.
-- 3) If inspect shows public.notifications is also a view (v), paste that output
--    and stop — do not run the apply block yet.

-- ---------------------------------------------------------------------------
-- Inspect
-- ---------------------------------------------------------------------------
select n.nspname as schema_name,
       c.relname,
       case c.relkind
         when 'r' then 'table'
         when 'v' then 'view'
         when 'm' then 'materialized view'
         else c.relkind::text
       end as kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relname ilike '%notif%'
order by 1, 2;

select schemaname, viewname, definition
from pg_views
where viewname = 'notifications';


-- ---------------------------------------------------------------------------
-- Apply — only if public.notifications is a table
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists image_url text;

create or replace view api.notifications as
  select * from public.notifications;

grant select on api.notifications to anon, authenticated;
grant insert, update, delete on api.notifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notification-flyers',
  'notification-flyers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
