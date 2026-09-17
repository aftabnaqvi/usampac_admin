-- Notify admins when a candidate first becomes pending.
-- Run in the Supabase SQL Editor AFTER setting PENDING_NOTIFY_SECRET in Vercel.
--
-- Option A (recommended): Dashboard → Database → Webhooks
--   Table: public.candidate_profiles
--   Events: Insert, Update
--   URL: https://usampac-admin-sigma.vercel.app/api/pending-notify
--   HTTP headers:
--     Content-Type: application/json
--     x-webhook-secret: <same value as PENDING_NOTIFY_SECRET>
--
-- Option B: this trigger uses pg_net. Replace REPLACE_WITH_SECRET first.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_pending_candidate()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_url text := 'https://usampac-admin-sigma.vercel.app/api/pending-notify';
  webhook_secret text := 'REPLACE_WITH_SECRET';
begin
  if webhook_secret = 'REPLACE_WITH_SECRET' then
    return NEW;
  end if;

  if NEW.approval_status is distinct from 'pending' then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.approval_status is not distinct from 'pending' then
    return NEW;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_pending_candidate on public.candidate_profiles;
create trigger trg_notify_pending_candidate
after insert or update of approval_status on public.candidate_profiles
for each row
execute procedure public.notify_pending_candidate();
