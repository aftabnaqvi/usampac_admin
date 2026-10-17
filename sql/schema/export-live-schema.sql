-- Builds a schema-only snapshot of public and api.
-- Run in the Supabase SQL Editor. Copy the single result cell into
-- sql/schema/YYYY-MM-DD-short-slug.sql and push that file.
-- No table data is selected.

select string_agg(ddl, E'\n\n' order by ord, sort_name) as snapshot
from (
  select 0 as ord, '0' as sort_name,
    format(E'-- USAMPAC live schema snapshot\n-- Database: %s\n-- Captured: %s\n-- Schemas: public, api\n-- Schema only. No table rows, passwords, or keys.\n-- Track of the live database. Not a guaranteed restore script.',
      current_database(), to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI UTC')) as ddl

  union all
  select 10, n.nspname || '.' || t.typname,
    format('CREATE TYPE %I.%I AS ENUM (%s);', n.nspname, t.typname,
      string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder))
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in ('public', 'api')
  group by n.nspname, t.typname

  union all
  select 20, n.nspname || '.' || c.relname,
    format(E'CREATE TABLE %I.%I (\n%s\n);', n.nspname, c.relname,
      string_agg(
        format('  %I %s%s%s',
          a.attname,
          pg_catalog.format_type(a.atttypid, a.atttypmod),
          case when a.attnotnull then ' NOT NULL' else '' end,
          coalesce(' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid), '')),
        E',\n' order by a.attnum))
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  where n.nspname in ('public', 'api') and c.relkind = 'r'
  group by n.nspname, c.relname

  union all
  select 30, n.nspname || '.' || c.relname,
    format('CREATE SEQUENCE %I.%I;', n.nspname, c.relname)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'api') and c.relkind = 'S'

  union all
  select 40, n.nspname || '.' || rel.relname || '.' || con.conname,
    format('ALTER TABLE %s ADD CONSTRAINT %I %s;', con.conrelid::regclass, con.conname, pg_get_constraintdef(con.oid))
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname in ('public', 'api') and con.contype in ('p', 'u', 'c', 'f')

  union all
  select 50, n.nspname || '.' || idx.relname,
    pg_get_indexdef(i.indexrelid) || ';'
  from pg_index i
  join pg_class tbl on tbl.oid = i.indrelid
  join pg_class idx on idx.oid = i.indexrelid
  join pg_namespace n on n.oid = tbl.relnamespace
  where n.nspname in ('public', 'api')
    and not exists (select 1 from pg_constraint con where con.conindid = i.indexrelid)

  union all
  select 60, n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    pg_get_functiondef(p.oid) || ';'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'api') and p.prokind = 'f'

  union all
  select 70, n.nspname || '.' || c.relname,
    format(E'CREATE OR REPLACE VIEW %I.%I AS\n%s', n.nspname, c.relname, pg_get_viewdef(c.oid, true))
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'api') and c.relkind = 'v'

  union all
  select 80, n.nspname || '.' || c.relname || '.' || t.tgname,
    pg_get_triggerdef(t.oid, true) || ';'
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'api') and not t.tgisinternal

  union all
  select 90, n.nspname || '.' || c.relname,
    format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', n.nspname, c.relname)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'api') and c.relkind = 'r' and c.relrowsecurity

  union all
  select 100, n.nspname || '.' || c.relname || '.' || pol.polname,
    format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
      pol.polname, n.nspname, c.relname,
      case when pol.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
      case pol.polcmd::text when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
      case when pol.polroles = '{0}'::oid[] then 'PUBLIC'
           else coalesce((select string_agg(quote_ident(r.rolname), ', ' order by r.rolname) from pg_roles r where r.oid = any (pol.polroles)), 'PUBLIC')
      end,
      coalesce(' USING (' || pg_get_expr(pol.polqual, pol.polrelid) || ')', ''),
      coalesce(' WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid) || ')', ''))
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'api')

  union all
  select 110, n.nspname || '.' || c.relname || '.' || x.privilege_type || '.' || coalesce(r.rolname, 'public'),
    format('GRANT %s ON TABLE %I.%I TO %s;', x.privilege_type, n.nspname, c.relname,
      case when x.grantee = 0 then 'PUBLIC' else quote_ident(r.rolname) end)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r'::"char", c.relowner))) x
  left join pg_roles r on r.oid = x.grantee
  where n.nspname in ('public', 'api') and c.relkind in ('r', 'v', 'S')
    and (x.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))

  union all
  select 120, n.nspname || '.' || p.proname || '.' || x.privilege_type || '.' || coalesce(r.rolname, 'public'),
    format('GRANT %s ON FUNCTION %s TO %s;', x.privilege_type, p.oid::regprocedure,
      case when x.grantee = 0 then 'PUBLIC' else quote_ident(r.rolname) end)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner))) x
  left join pg_roles r on r.oid = x.grantee
  where n.nspname in ('public', 'api') and p.prokind = 'f'
    and (x.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
) parts;
