-- Allow admin_set_user_role to be called with the service role key (e.g. from Admin WebUI server).
-- When called with service role, auth.uid() is null; we allow that. When called with a user JWT, we still require that user to be an admin.
--
-- Admins are not candidates: we only set app_users.role (ADMIN or VISITOR). No candidate_profiles row.
-- Admins use the Admin UI to approve/reject candidates, manage content, etc.

CREATE OR REPLACE FUNCTION api.admin_set_user_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
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
    -- Downgrade to VISITOR when removing admin (admins are just users, not registered candidates)
    role_val := 'VISITOR'::public.user_role;
  else
    role_val := p_role::public.user_role;
  end if;

  insert into public.app_users (auth_sub, role, email)
  values (p_user_id, role_val, p_email)
  on conflict (auth_sub) do update set role = excluded.role;
end;
$function$;
