import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { promoteCandidateToElected } from './actions';

export default async function Approved({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const supabase = supabaseServer();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) {
    redirect('/login');
  }
  try {
    const pub: any = (supabase as any).schema ? (supabase as any).schema('public') : supabase;
    const { data: roleRow } = await pub.from('app_users').select('role').eq('auth_sub', user.id).limit(1).single();
    if (!roleRow || roleRow.role !== 'ADMIN') {
      redirect('/login');
    }
  } catch {}
  const { data, error } = await (db as any)
    .from('candidate_profiles_admin')
    .select('*')
    .eq('approval_status', 'approved');

  // Also fetch current elected ids so we can mark “Promoted” in the approved list.
  const { data: electedRows } = await (db as any)
    .from('active_elected')
    .select('id')
    .limit(5000);
  const electedIds = new Set<string>((electedRows ?? []).map((r: any) => String(r.id)));

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Approved Candidates</h2>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/rejected">Rejected</Link>
          <span style={{ color: '#666' }}>Logged in as {user?.email}</span>
        </nav>
      </header>
      {searchParams?.success && (
        <p style={{ color: 'green' }}>Promoted to elected successfully.</p>
      )}
      {searchParams?.error && (
        <p style={{ color: 'red' }}>Promote failed: {searchParams.error}</p>
      )}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {!error && (!data || data.length === 0) && (
        <p>No approved candidates.</p>
      )}
      {data?.map((row: any) => (
        <article key={row.user_id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          {(() => {
            const isElected = electedIds.has(String(row.user_id));
            return (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
                    {isElected && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: 'rgba(46, 204, 113, 0.18)',
                          border: '1px solid rgba(46, 204, 113, 0.35)',
                          color: '#2ecc71'
                        }}
                      >
                        Promoted
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#666', marginTop: 4 }}>
                    {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                    | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
                  </div>
                  {row.reviewer_notes && (
                    <div style={{ color: '#444', marginTop: 6 }}>Notes: {row.reviewer_notes}</div>
                  )}
                  {row.approved_at && (
                    <div style={{ color: '#444', marginTop: 4 }}>Approved at: {new Date(row.approved_at).toLocaleString()}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <form
                    action={async (fd: FormData) => {
                      'use server';
                      const uid = String(fd.get('user_id'));
                      const notes = String(fd.get('notes') || '');
                      await promoteCandidateToElected(uid, notes || undefined);
                    }}
                  >
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <input
                      name="notes"
                      placeholder="Promotion notes (optional)"
                      style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, marginRight: 6 }}
                      disabled={isElected}
                    />
                    <button
                      type="submit"
                      style={{ padding: '8px 12px', borderRadius: 6, opacity: isElected ? 0.55 : 1 }}
                      disabled={isElected}
                      title={isElected ? 'Already promoted to elected' : 'Promote to elected'}
                    >
                      {isElected ? 'Already Elected' : 'Promote to Elected'}
                    </button>
                  </form>
                </div>
              </>
            );
          })()}
        </article>
      ))}
    </main>
  );
}


