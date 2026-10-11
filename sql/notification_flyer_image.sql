-- Optional flyer image on admin notifications (shown in the iOS Notifications tab).
-- Run once in the Supabase SQL Editor, then reload the schema if the REST API still
-- says image_url does not exist (Dashboard → Settings → API → Reload).

ALTER TABLE IF EXISTS api.notifications
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notification-flyers',
  'notification-flyers',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
