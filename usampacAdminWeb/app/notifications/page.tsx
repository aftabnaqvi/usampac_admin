import { revalidatePath } from 'next/cache';
import AdminHeader from '@/app/components/AdminHeader';
import { requireAdmin } from '@/lib/requireAdmin';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import ListSearch from '@/app/components/ListSearch';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseEnv } from '@/lib/supabaseEnv';
import {
  FLYER_BUCKET,
  flyerContentType,
  flyerObjectPath,
  flyerObjectPathsToClear,
  isMissingImageUrlColumn,
  publicFlyerUrl,
  validateFlyerFile
} from '@/lib/notificationFlyer';

type NotificationRow = {
  id: string;
  title: string;
  url: string | null;
  body: string | null;
  image_url: string | null;
  published_at: string;
  is_active: boolean;
};

const MISSING_COLUMN_MESSAGE =
  'Run sql/notification_flyer_image.sql in the Supabase SQL Editor so notifications can store a flyer image.';

async function requireNotificationsAdmin() {
  const { supabase } = await requireAdmin('/notifications');
  return supabase;
}

function apiClientFrom(supabase: unknown) {
  const client: any = supabase;
  return client.schema ? client.schema('api') : client;
}

async function getData() {
  const supabase = await requireNotificationsAdmin();
  const apiClient = apiClientFrom(supabase);
  const { data, error } = await apiClient
    .from('notifications')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) {
    console.error('DEBUG notifications.getData error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as NotificationRow[];
}

async function ensureFlyerBucket() {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(FLYER_BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(FLYER_BUCKET, {
    public: true,
    fileSizeLimit: '8MB',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

async function saveFlyerForNotification(notificationId: string, file: File) {
  const invalid = validateFlyerFile(file);
  if (invalid) throw new Error(invalid);
  const contentType = flyerContentType(file);
  const path = contentType ? flyerObjectPath(notificationId, contentType) : null;
  if (!contentType || !path) throw new Error('Use a JPEG, PNG, WebP, or GIF flyer.');

  await ensureFlyerBucket();
  const admin = supabaseAdmin();
  await admin.storage.from(FLYER_BUCKET).remove(flyerObjectPathsToClear(notificationId));
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(FLYER_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true
  });
  if (error) throw new Error(error.message);
  return publicFlyerUrl(supabaseEnv().url, path);
}

async function clearStoredFlyer(notificationId: string) {
  try {
    const admin = supabaseAdmin();
    await admin.storage.from(FLYER_BUCKET).remove(flyerObjectPathsToClear(notificationId));
  } catch {
    // Keep the row delete/update even if storage cleanup fails.
  }
}

async function patchImageUrl(apiClient: any, id: string, imageUrl: string | null) {
  const { error } = await apiClient.from('notifications').update({ image_url: imageUrl }).eq('id', id);
  if (error) {
    if (isMissingImageUrlColumn(error.message)) {
      throw new Error(MISSING_COLUMN_MESSAGE);
    }
    throw new Error(error.message);
  }
}

async function upsertNotification(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const title = (formData.get('title') as string | null) ?? null;
  const url = (formData.get('url') as string | null) ?? null;
  const body = (formData.get('body') as string | null) ?? null;
  const publishedAtRaw = (formData.get('published_at') as string | null) ?? null;
  const isActive = formData.get('is_active') === 'on';
  const removeFlyer = formData.get('remove_flyer') === 'on';
  const flyer = formData.get('flyer');

  if (!title || title.trim() === '') return;

  const supabase = await requireNotificationsAdmin();
  const apiClient = apiClientFrom(supabase);

  const payload: Record<string, unknown> = {
    title: title.trim(),
    url: url && url.trim() !== '' ? url.trim() : null,
    body: body && body.trim() !== '' ? body.trim() : null,
    is_active: isActive
  };

  if (publishedAtRaw && publishedAtRaw.trim() !== '') {
    payload.published_at = new Date(publishedAtRaw).toISOString();
  }

  let rowId = id && id.trim() !== '' ? id.trim() : null;
  let error;
  if (rowId) {
    ({ error } = await apiClient.from('notifications').update(payload).eq('id', rowId));
  } else {
    const inserted = await apiClient.from('notifications').insert(payload).select('id').single();
    error = inserted.error;
    rowId = inserted.data?.id ?? null;
  }

  if (error) {
    console.error('DEBUG notifications.upsert error', error);
    throw new Error(error.message);
  }
  if (!rowId) throw new Error('Could not save notification.');

  if (flyer instanceof File && flyer.size > 0) {
    const imageUrl = await saveFlyerForNotification(rowId, flyer);
    await patchImageUrl(apiClient, rowId, imageUrl);
  } else if (removeFlyer) {
    await clearStoredFlyer(rowId);
    await patchImageUrl(apiClient, rowId, null);
  }

  revalidatePath('/notifications');
}

async function deleteNotification(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireNotificationsAdmin();
  const apiClient = apiClientFrom(supabase);
  await clearStoredFlyer(id);
  await apiClient.from('notifications').delete().eq('id', id);
  revalidatePath('/notifications');
}

function FlyerFields({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <>
      <label>Flyer image (optional)</label>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Flyer preview" className="flyerPreview" />
      ) : null}
      <input name="flyer" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" />
      {imageUrl ? (
        <label className="checkRow">
          <input type="checkbox" name="remove_flyer" />
          Remove flyer
        </label>
      ) : null}
    </>
  );
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const rows = await getData();
  const query = listSearchQuery(searchParams?.q);
  const filtered = rows.filter((n) =>
    matchesListQuery({ display_name: n.title, office_name: n.body, email: n.url }, query)
  );

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Notifications</h2>
      </header>
      <ListSearch action="/notifications" query={query} placeholder="Search notifications" />

      <section className="card">
        <h3 className="cardTitle">Create new notification</h3>
        <form action={upsertNotification} className="formGrid" encType="multipart/form-data">
          <input type="hidden" name="id" value="" />
          <input
            name="title"
            placeholder="Title"
          />
          <input
            name="url"
            placeholder="Link URL (optional)"
          />
          <textarea
            name="body"
            placeholder="Body (optional)"
            rows={3}
          />
          <FlyerFields />
          <label>Published at (optional)</label>
          <input
            name="published_at"
            type="datetime-local"
            style={{ maxWidth: 260 }}
          />
          <label className="checkRow">
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button type="submit" className="btnPrimary btnFit">
            Save notification
          </button>
        </form>
      </section>

      {filtered.length === 0 && <p>{query ? 'No notifications match that search.' : 'No notifications yet.'}</p>}

      {filtered.map((n) => (
        <section key={n.id} className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <form
              action={upsertNotification}
              className="formGrid"
              style={{ flex: 1 }}
              encType="multipart/form-data"
            >
              <input type="hidden" name="id" defaultValue={n.id} />
              <label>Title</label>
              <input
                name="title"
                defaultValue={n.title}
              />
              <label>URL</label>
              <input
                name="url"
                defaultValue={n.url ?? ''}
              />
              <label>Body</label>
              <textarea
                name="body"
                defaultValue={n.body ?? ''}
                rows={2}
              />
              <FlyerFields imageUrl={n.image_url} />
              <label>Published at</label>
              <input
                name="published_at"
                type="datetime-local"
                defaultValue={n.published_at ? n.published_at.slice(0, 16) : ''}
                style={{ maxWidth: 260 }}
              />
              <label className="checkRow">
                <input type="checkbox" name="is_active" defaultChecked={n.is_active} />
                Active
              </label>
              <button type="submit" className="btnPrimary btnFit">
                Update notification
              </button>
            </form>
            <form action={deleteNotification} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" className="btnDanger">
                Delete
              </button>
            </form>
          </div>
        </section>
      ))}
      </main>
    </>
  );
}
