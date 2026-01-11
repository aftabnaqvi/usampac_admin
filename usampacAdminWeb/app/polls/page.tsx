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

type PollOptionResult = {
  poll_id: string;
  option_id: string;
  votes: number | null;
  percent: number | null;
  total_votes: number | null;
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

  const [
    { data: polls, error: pollsError },
    { data: options, error: optionsError },
    { data: results, error: resultsError }
  ] = await Promise.all([
    apiClient.from('polls').select('*').order('created_at', { ascending: false }),
    apiClient.from('poll_options').select('*').order('position', { ascending: true }),
    apiClient.from('poll_option_results').select('poll_id,option_id,votes,percent,total_votes')
  ]);

  if (pollsError || optionsError || resultsError) {
    console.error('DEBUG polls.getData error', pollsError, optionsError, resultsError);
    throw new Error(
      pollsError?.message ?? optionsError?.message ?? resultsError?.message ?? 'Failed to load polls'
    );
  }

  const grouped: Record<string, PollOption[]> = {};
  (options ?? []).forEach((opt: PollOption) => {
    if (!grouped[opt.poll_id]) grouped[opt.poll_id] = [];
    grouped[opt.poll_id].push(opt);
  });

  const resultsByPoll: Record<string, Record<string, PollOptionResult>> = {};
  (results ?? []).forEach((r: PollOptionResult) => {
    if (!resultsByPoll[r.poll_id]) resultsByPoll[r.poll_id] = {};
    resultsByPoll[r.poll_id][r.option_id] = r;
  });

  return { polls: (polls ?? []) as Poll[], optionsByPoll: grouped, resultsByPoll };
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
  const { polls, optionsByPoll, resultsByPoll } = await getData();

  return (
    <main className="container">
      <AdminHeader />
      <header className="pageHeader">
        <h2>Polls</h2>
        <nav className="navLinks">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
        </nav>
      </header>

      <section className="card" style={{ marginBottom: 18 }}>
        <h3 className="cardTitle">Create new poll</h3>
        <form action={upsertPoll} style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
          <input type="hidden" name="id" value="" />
          <input
            name="title"
            placeholder="Question title"
          />
          <input
            name="subtitle"
            placeholder="Subtitle (optional)"
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
          />
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <button type="submit" className="btnPrimary" style={{ width: 'fit-content' }}>
            Save poll
          </button>
        </form>
      </section>

      {polls.length === 0 && <p>No polls yet.</p>}

      {polls.map((poll) => (
        <section key={poll.id} className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <form
              action={upsertPoll}
              style={{ display: 'grid', gap: 10, marginBottom: 10, maxWidth: 720, flex: 1 }}
            >
              <input type="hidden" name="id" defaultValue={poll.id} />
              <label>Title</label>
              <input
                name="title"
                defaultValue={poll.title}
              />
              <label>Subtitle</label>
              <input
                name="subtitle"
                defaultValue={poll.subtitle ?? ''}
              />
              <label>Slug</label>
              <input
                name="slug"
                defaultValue={poll.slug ?? ''}
              />
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" name="is_active" defaultChecked={poll.is_active} />
                Active
              </label>
              <button type="submit" className="btnPrimary" style={{ width: 'fit-content' }}>
                Update poll
              </button>
            </form>
            <form action={deletePoll} style={{ margin: 0, alignSelf: 'flex-start' }}>
              <input type="hidden" name="id" value={poll.id} />
              <button type="submit" className="btnDanger">
                Delete
              </button>
            </form>
          </div>

          <div style={{ marginTop: 10 }}>
            <h4 className="cardTitle" style={{ marginBottom: 6 }}>Options</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th style={{ width: 130 }}>Position</th>
                  <th style={{ width: 160 }}>Results</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {(optionsByPoll[poll.id] ?? []).map((opt) => (
                  (() => {
                    const res = resultsByPoll?.[poll.id]?.[opt.id] ?? null;
                    const pct = res?.percent ?? 0;
                    const votes = res?.votes ?? 0;
                    const total = res?.total_votes ?? 0;
                    return (
                  <tr key={opt.id}>
                    <td>
                      <form action={upsertOption} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <input type="hidden" name="poll_id" defaultValue={poll.id} />
                        <input
                          name="label"
                          defaultValue={opt.label}
                          style={{ flex: 1 }}
                        />
                        <input
                          name="position"
                          type="number"
                          defaultValue={opt.position}
                          style={{ width: 110 }}
                        />
                        <button type="submit" className="btnPrimary">
                          Save
                        </button>
                      </form>
                    </td>
                    <td />
                    <td>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ fontWeight: 600 }}>{pct}%</div>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>
                          {votes} / {total} votes
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={deleteOption}>
                        <input type="hidden" name="id" defaultValue={opt.id} />
                        <button type="submit" className="btnDanger">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                    );
                  })()
                ))}
                <tr>
                  <td colSpan={4}>
                    <form
                      action={upsertOption}
                      className="row"
                      style={{ gap: 10, flexWrap: 'nowrap' }}
                    >
                      <input type="hidden" name="poll_id" value={poll.id} />
                      <input
                        name="label"
                        placeholder="New option label"
                        style={{ flex: 1 }}
                      />
                      <input
                        name="position"
                        type="number"
                        placeholder="Pos"
                        style={{ width: 110 }}
                      />
                      <button type="submit" className="btnPrimary">
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


