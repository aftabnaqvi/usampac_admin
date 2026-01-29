import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { deleteCandidate, deleteElected, restoreCandidate, restoreElected } from './actions';
import ConfirmButton from './ConfirmButton';

export default async function ManagePage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string; q?: string };
}) {
  const supabase = supabaseServer();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) {
    redirect('/login');
  }
  try {
    const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(pub, user.id);
    if (!ok) redirect('/login');
  } catch {}

  const query = (searchParams?.q ?? '').trim();
  const searchPattern = query ? `%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%` : null;

  let candidatesQuery = db
    .from('candidate_profiles_admin')
    .select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approval_status')
    .order('display_name', { ascending: true })
    .limit(5000);
  if (searchPattern) {
    candidatesQuery = candidatesQuery.or(
      `display_name.ilike.${searchPattern},email.ilike.${searchPattern},office_name.ilike.${searchPattern},city_name.ilike.${searchPattern}`
    );
  }
  const { data: candidates, error: candidatesError } = await candidatesQuery;

  // Prefer active_elected_public when present.
  let electedAttempt = await db
    .from('active_elected_public')
    .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end')
    .order('candidate_name', { ascending: true })
    .limit(5000);
  if (!electedAttempt.error && searchPattern) {
    electedAttempt = await db
      .from('active_elected_public')
      .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end')
      .or(
        `candidate_name.ilike.${searchPattern},office_name.ilike.${searchPattern},jurisdiction_name.ilike.${searchPattern}`
      )
      .order('candidate_name', { ascending: true })
      .limit(5000);
  }

  const electedFallback = electedAttempt.error
    ? await (async () => {
        let q = db
          .from('active_elected')
          .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end')
          .order('candidate_name', { ascending: true })
          .limit(5000);
        if (searchPattern) {
          q = q.or(
            `candidate_name.ilike.${searchPattern},office_name.ilike.${searchPattern},jurisdiction_name.ilike.${searchPattern}`
          );
        }
        return q;
      })()
    : null;

  const electedRows = (electedAttempt.error ? electedFallback?.data : electedAttempt.data) ?? [];
  const electedError = electedAttempt.error ? electedFallback?.error : null;

  const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  let deletedCandidatesQuery = pub
    .from('deleted_candidates_admin')
    .select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,deleted_at')
    .order('deleted_at', { ascending: false })
    .limit(5000);
  if (searchPattern) {
    deletedCandidatesQuery = deletedCandidatesQuery.or(
      `display_name.ilike.${searchPattern},email.ilike.${searchPattern},office_name.ilike.${searchPattern},city_name.ilike.${searchPattern}`
    );
  }
  const { data: deletedCandidates, error: deletedCandidatesError } = await deletedCandidatesQuery;

  let deletedElectedQuery = pub
    .from('deleted_elected_terms_admin')
    .select('user_id,candidate_name,office_name,level,jurisdiction_name,state_code,deleted_at')
    .order('deleted_at', { ascending: false })
    .limit(5000);
  if (searchPattern) {
    deletedElectedQuery = deletedElectedQuery.or(
      `candidate_name.ilike.${searchPattern},office_name.ilike.${searchPattern},jurisdiction_name.ilike.${searchPattern}`
    );
  }
  const { data: deletedElected, error: deletedElectedError } = await deletedElectedQuery;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Tools</h2>
          <p style={{ color: '#aaa', margin: '6px 0 0' }}>
            Delete or restore candidates and elected officials.
          </p>
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/elected">Elected</Link>
        </nav>
      </header>

      {searchParams?.success && (
        <p style={{ color: 'green' }}>
          {searchParams.success === 'candidate' && 'Candidate deleted.'}
          {searchParams.success === 'elected' && 'Elected official deleted.'}
          {searchParams.success === 'restore_candidate' && 'Candidate restored.'}
          {searchParams.success === 'restore_elected' && 'Elected official restored.'}
        </p>
      )}
      {searchParams?.error && <p style={{ color: 'red' }}>Action failed: {searchParams.error}</p>}

      <form method="get" style={{ margin: '12px 0 18px', display: 'flex', gap: 8 }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search candidates or elected officials..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
        />
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 8 }}>Search</button>
      </form>

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Candidates</h3>
        {candidatesError && <p style={{ color: 'red' }}>{candidatesError.message}</p>}
        {(!candidates || candidates.length === 0) && !candidatesError && <p>No candidates found.</p>}
        {candidates?.map((row: any) => (
          <article key={row.user_id} style={{ border: '1px solid #2b2b2b', padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{row.display_name ?? row.email ?? 'Candidate'}</strong>
                <div style={{ color: '#9a9a9a', marginTop: 4 }}>
                  {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                  | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
                </div>
                <div style={{ color: '#777', marginTop: 4 }}>
                  Status: {row.approval_status ?? '—'}
                </div>
              </div>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const uid = String(fd.get('user_id'));
                  await deleteCandidate(uid);
                }}
              >
                <input type="hidden" name="user_id" value={row.user_id} />
                <ConfirmButton
                  type="submit"
                  confirmMessage="Delete this candidate? You can restore it later from the Deleted Candidates list."
                  style={{ padding: '8px 12px', borderRadius: 6, background: '#8b1d1d', color: '#fff' }}
                  title="Delete candidate (moves to deleted list)"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Elected Officials</h3>
        {electedError && <p style={{ color: 'red' }}>{electedError.message}</p>}
        {(electedRows.length === 0) && !electedError && <p>No elected officials found.</p>}
        {electedRows.map((r: any) => (
          <article key={r.id} style={{ border: '1px solid #2b2b2b', padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{r.candidate_name ?? '—'}</strong>
                <div style={{ color: '#9a9a9a', marginTop: 4 }}>
                  {(r.level ?? '-') + ' — ' + (r.office_name ?? '-')}{' '}
                  | {(r.jurisdiction_name ?? '-')} {r.state_code ? `, ${r.state_code}` : ''}
                </div>
              </div>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const uid = String(fd.get('user_id'));
                  await deleteElected(uid);
                }}
              >
                <input type="hidden" name="user_id" value={r.id} />
                <ConfirmButton
                  type="submit"
                  confirmMessage="Delete this elected official? You can restore it later from the Deleted Elected list."
                  style={{ padding: '8px 12px', borderRadius: 6, background: '#8b1d1d', color: '#fff' }}
                  title="Delete elected official (moves to deleted list)"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 30 }}>
        <h3 style={{ marginBottom: 8 }}>Deleted Candidates</h3>
        {deletedCandidatesError && <p style={{ color: 'red' }}>{deletedCandidatesError.message}</p>}
        {(!deletedCandidates || deletedCandidates.length === 0) && !deletedCandidatesError && <p>No deleted candidates.</p>}
        {deletedCandidates?.map((row: any) => (
          <article key={row.user_id} style={{ border: '1px solid #2b2b2b', padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{row.display_name ?? row.email ?? 'Candidate'}</strong>
                <div style={{ color: '#9a9a9a', marginTop: 4 }}>
                  {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                  | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
                </div>
                <div style={{ color: '#777', marginTop: 4 }}>
                  Deleted at: {row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '—'}
                </div>
              </div>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const uid = String(fd.get('user_id'));
                  await restoreCandidate(uid);
                }}
              >
                <input type="hidden" name="user_id" value={row.user_id} />
                <button
                  type="submit"
                  style={{ padding: '8px 12px', borderRadius: 6, background: '#2457b2', color: '#fff' }}
                  title="Restore candidate"
                >
                  Restore
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Deleted Elected Officials</h3>
        {deletedElectedError && <p style={{ color: 'red' }}>{deletedElectedError.message}</p>}
        {(!deletedElected || deletedElected.length === 0) && !deletedElectedError && <p>No deleted elected officials.</p>}
        {deletedElected?.map((row: any) => (
          <article key={row.user_id} style={{ border: '1px solid #2b2b2b', padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{row.candidate_name ?? '—'}</strong>
                <div style={{ color: '#9a9a9a', marginTop: 4 }}>
                  {(row.level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                  | {(row.jurisdiction_name ?? '-')} {row.state_code ? `, ${row.state_code}` : ''}
                </div>
                <div style={{ color: '#777', marginTop: 4 }}>
                  Deleted at: {row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '—'}
                </div>
              </div>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const uid = String(fd.get('user_id'));
                  await restoreElected(uid);
                }}
              >
                <input type="hidden" name="user_id" value={row.user_id} />
                <button
                  type="submit"
                  style={{ padding: '8px 12px', borderRadius: 6, background: '#2457b2', color: '#fff' }}
                  title="Restore elected official"
                >
                  Restore
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
