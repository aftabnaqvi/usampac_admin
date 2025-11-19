import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'poll'
  );
}

type Poll = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  created_at: string;
};

type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
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
    // fall back to RLS
  }
  return supabase;
}

async function getData() {
  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const [{ data: polls, error: pollsError }, { data: options, error: optionsError }] =
    await Promise.all([
      apiClient.from('polls').select('*').order('created_at', { ascending: false }),
      apiClient.from('poll_options').select('*').order('position', { ascending: true })
    ]);

  if (pollsError || optionsError) {
    console.error('DEBUG polls.getData error', pollsError, optionsError);
    throw new Error(pollsError?.message ?? optionsError?.message ?? 'Failed to load polls');
  }

  const grouped: Record<string, PollOption[]> = {};
  (options ?? []).forEach((opt: PollOption) => {
    if (!grouped[opt.poll_id]) grouped[opt.poll_id] = [];
    grouped[opt.poll_id].push(opt);
  });

  return { polls: (polls ?? []) as Poll[], optionsByPoll: grouped };
}

async function upsertPoll(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const title = (formData.get('title') as string | null) ?? null;
  const subtitle = (formData.get('subtitle') as string | null) ?? null;
  const slugRaw = (formData.get('slug') as string | null) ?? null;
  const isActive = formData.get('is_active') === 'on';

  if (!title || title.trim() === '') return;

  const normalizedTitle = title.trim();
  const effectiveSlug =
    slugRaw && slugRaw.trim() !== '' ? slugRaw.trim() : slugify(normalizedTitle);

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const payload: Partial<Poll> = {
    title: normalizedTitle,
    subtitle: subtitle && subtitle.trim() !== '' ? subtitle.trim() : null,
    slug: effectiveSlug,
    is_active: isActive
  };

  let error;
  if (id && id.trim() !== '') {
    ({ error } = await apiClient.from('polls').update(payload).eq('id', id));
  } else {
    ({ error } = await apiClient.from('polls').insert(payload));
  }

  if (error) {
    console.error('DEBUG polls.upsertPoll error', error);
    throw new Error(error.message);
  }

  revalidatePath('/polls');
}

async function deletePoll(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await apiClient.from('polls').delete().eq('id', id);
  if (error) {
    console.error('DEBUG polls.deletePoll error', error);
    throw new Error(error.message);
  }
  revalidatePath('/polls');
}

async function upsertOption(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  const pollId = (formData.get('poll_id') as string | null) ?? null;
  const label = (formData.get('label') as string | null) ?? null;
  const positionRaw = (formData.get('position') as string | null) ?? null;

  if (!pollId || !label) return;

  const position = positionRaw ? parseInt(positionRaw, 10) || 0 : 0;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const payload: Partial<PollOption> = {
    poll_id: pollId,
    label: label.trim(),
    position
  } as any;

  let error;
  if (id && id.trim() !== '') {
    ({ error } = await apiClient.from('poll_options').update(payload).eq('id', id));
  } else {
    ({ error } = await apiClient.from('poll_options').insert(payload));
  }

  if (error) {
    console.error('DEBUG polls.upsertOption error', error);
    throw new Error(error.message);
  }

  revalidatePath('/polls');
}

async function deleteOption(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string | null) ?? null;
  if (!id) return;

  const supabase = await requireAdmin();
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await apiClient.from('poll_options').delete().eq('id', id);
  if (error) {
    console.error('DEBUG polls.deleteOption error', error);
    throw new Error(error.message);
  }
  revalidatePath('/polls');
}

export default async function PollsPage() {
  const { polls, optionsByPoll } = await getData();

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
        <h2>Polls</h2>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
        </nav>
      </header>

      <section
        style={{
          border: '1px solid #eee',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create new poll</h3>
        <form action={upsertPoll} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <input type="hidden" name="id" value="" />
          <input
            name="title"
            placeholder="Question title"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <input
            name="subtitle"
            placeholder="Subtitle (optional)"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button
            type="submit"
            style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 6 }}
          >
            Save poll
          </button>
        </form>
      </section>

      {polls.length === 0 && <p>No polls yet.</p>}

      {polls.map((poll) => (
        <section
          key={poll.id}
          style={{
            border: '1px solid #eee',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <form
              action={upsertPoll}
              style={{ display: 'grid', gap: 6, marginBottom: 10, maxWidth: 520, flex: 1 }}
            >
              <input type="hidden" name="id" defaultValue={poll.id} />
              <label style={{ fontSize: 12, color: '#666' }}>Title</label>
              <input
                name="title"
                defaultValue={poll.title}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Subtitle</label>
              <input
                name="subtitle"
                defaultValue={poll.subtitle ?? ''}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ fontSize: 12, color: '#666' }}>Slug</label>
              <input
                name="slug"
                defaultValue={poll.slug ?? ''}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" name="is_active" defaultChecked={poll.is_active} />
                Active
              </label>
              <button
                type="submit"
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 14, marginTop: 6 }}
              >
                Update poll
              </button>
            </form>
            <form action={deletePoll} style={{ margin: 0 }}>
              <input type="hidden" name="id" value={poll.id} />
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

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>Options</h4>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Label</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', width: 90 }}>Position</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {(optionsByPoll[poll.id] ?? []).map((opt) => (
                  <tr key={opt.id}>
                    <td style={{ padding: '4px 6px' }}>
                      <form action={upsertOption} style={{ display: 'flex', gap: 8 }}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <input type="hidden" name="poll_id" defaultValue={poll.id} />
                        <input
                          name="label"
                          defaultValue={opt.label}
                          style={{
                            flex: 1,
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                          }}
                        />
                        <input
                          name="position"
                          type="number"
                          defaultValue={opt.position}
                          style={{
                            width: 70,
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                          }}
                        />
                        <button
                          type="submit"
                          style={{ padding: '4px 10px', borderRadius: 4 }}
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td />
                    <td style={{ textAlign: 'right', paddingRight: 6 }}>
                      <form action={deleteOption}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <button
                          type="submit"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: '#fee2e2',
                            fontSize: 12
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ paddingTop: 8 }}>
                    <form
                      action={upsertOption}
                      style={{ display: 'flex', gap: 8, marginTop: 4 }}
                    >
                      <input type="hidden" name="poll_id" value={poll.id} />
                      <input
                        name="label"
                        placeholder="New option label"
                        style={{
                          flex: 1,
                          padding: 4,
                          borderRadius: 4,
                          border: '1px solid #ddd'
                        }}
                      />
                      <input
                        name="position"
                        type="number"
                        placeholder="Pos"
                        style={{
                          width: 70,
                          padding: 4,
                          borderRadius: 4,
                          border: '1px solid #ddd'
                        }}
                      />
                      <button
                        type="submit"
                        style={{ padding: '4px 10px', borderRadius: 4 }}
                      >
                        Add
                      </button>
                    </form>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}


