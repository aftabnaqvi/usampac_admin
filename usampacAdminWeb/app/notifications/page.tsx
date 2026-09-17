import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import ListSearch from '@/app/components/ListSearch';

type NotificationRow = {
  id: string;
  title: string;
  url: string | null;
  body: string | null;
  published_at: string;
  is_active: boolean;
};

async function requireAdmin() {
  const { supabase, user } = await getServerUser();
  if (!user) redirectToLogin('/notifications');

  try {
    const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(apiClient, user.id);
    if (!ok) redirectToLogin('/notifications');
  } catch {
    // rely on RLS if this check fails
  }
  return supabase;
}

async function getData() {
  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { data, error } = await apiClient
    .from('notifications')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) {
    // Surface errors during development so we can see RLS / permission issues.
    console.error('DEBUG notifications.getData error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as NotificationRow[];
}

async function upsertNotification(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const title = (formData.get('title') as string | null) ?? null;
  const url = (formData.get('url') as string | null) ?? null;
  const body = (formData.get('body') as string | null) ?? null;
  const publishedAtRaw = (formData.get('published_at') as string | null) ?? null;
  const isActive = formData.get('is_active') === 'on';

  if (!title || title.trim() === '') return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const payload: Partial<NotificationRow> = {
    title: title.trim(),
    url: url && url.trim() !== '' ? url.trim() : null,
    body: body && body.trim() !== '' ? body.trim() : null,
    is_active: isActive
  };

  if (publishedAtRaw && publishedAtRaw.trim() !== '') {
    payload.published_at = new Date(publishedAtRaw).toISOString() as any;
  }

  let error;
  if (id && id.trim() !== '') {
    ({ error } = await apiClient.from('notifications').update(payload).eq('id', id));
  } else {
    ({ error } = await apiClient.from('notifications').insert(payload));
  }

  if (error) {
    console.error('DEBUG notifications.upsert error', error);
    throw new Error(error.message);
  }

  revalidatePath('/notifications');
}

async function deleteNotification(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  await apiClient.from('notifications').delete().eq('id', id);
  revalidatePath('/notifications');
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const rows = await getData();
  const query = listSearchQuery(searchParams?.q);
  const filtered = rows.filter((n) => matchesListQuery({ display_name: n.title, office_name: n.body, email: n.url }, query));

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
        <form action={upsertNotification} className="formGrid">
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

