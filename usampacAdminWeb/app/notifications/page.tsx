import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';

type NotificationRow = {
  id: string;
  title: string;
  url: string | null;
  body: string | null;
  published_at: string;
  is_active: boolean;
};

async function requireAdmin() {
  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) redirect('/login');

  try {
    const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const { data: roleRow } = await apiClient
      .from('app_users')
      .select('role')
      .eq('auth_sub', user.id)
      .limit(1)
      .single();
    if (!roleRow || roleRow.role !== 'ADMIN') {
      redirect('/login');
    }
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

export default async function NotificationsPage() {
  const rows = await getData();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '16px 0 20px'
        }}
      >
        <h2>Notifications</h2>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
        </nav>
      </header>

      {/* Create new notification */}
      <section
        style={{
          border: '1px solid #eee',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create new notification</h3>
        <form action={upsertNotification} style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
          <input type="hidden" name="id" value="" />
          <input
            name="title"
            placeholder="Title"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <input
            name="url"
            placeholder="Link URL (optional)"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <textarea
            name="body"
            placeholder="Body (optional)"
            rows={3}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <label style={{ fontSize: 12, color: '#666' }}>Published at (optional)</label>
          <input
            name="published_at"
            type="datetime-local"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', maxWidth: 260 }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button
            type="submit"
            style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 6 }}
          >
            Save notification
          </button>
        </form>
      </section>

      {rows.length === 0 && <p>No notifications yet.</p>}

      {rows.map((n) => (
        <section
          key={n.id}
          style={{
            border: '1px solid #eee',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <form
              action={upsertNotification}
              style={{ display: 'grid', gap: 6, maxWidth: 640, flex: 1 }}
            >
              <input type="hidden" name="id" defaultValue={n.id} />
              <label style={{ fontSize: 12, color: '#666' }}>Title</label>
              <input
                name="title"
                defaultValue={n.title}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>URL</label>
              <input
                name="url"
                defaultValue={n.url ?? ''}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Body</label>
              <textarea
                name="body"
                defaultValue={n.body ?? ''}
                rows={2}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Published at</label>
              <input
                name="published_at"
                type="datetime-local"
                defaultValue={n.published_at ? n.published_at.slice(0, 16) : ''}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', maxWidth: 260 }}
              />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" name="is_active" defaultChecked={n.is_active} />
                Active
              </label>
              <button
                type="submit"
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 14, marginTop: 6 }}
              >
                Update notification
              </button>
            </form>
            <form action={deleteNotification} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={n.id} />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 14,
                  backgroundColor: '#fee2e2'
                }}
              >
                Delete
              </button>
            </form>
          </div>
        </section>
      ))}
    </main>
  );
}

