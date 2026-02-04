import { supabaseServer } from '@/lib/supabaseServer';
import { approveCandidate, rejectCandidate } from './actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';

export default async function Pending() {
  try {
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

    const { data, error } = await (db as any)
      .from('candidate_profiles_pending')
      .select('*');

    return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Pending Candidates</h2>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
          {user && <span style={{ color: '#666' }}>Logged in as {user.email}</span>}
        </nav>
      </header>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {!error && (!data || data.length === 0) && (
        <p>No pending candidates.</p>
      )}
      {data?.map((row: any) => {
        const level = String(row.office_level ?? row.office_type ?? row.level ?? '').trim().toUpperCase();
        const stateCode = (row.state_code ?? '').toUpperCase();
        const fec = row.fec_filing_number?.trim?.() ?? '';
        const stateFiling = row.state_filing_number?.trim?.() ?? '';
        const agency = row.election_agency_number?.trim?.() ?? '';
        const complianceLines: { label: string; value: string }[] = [];
        if (level === 'FEDERAL') {
          complianceLines.push({ label: 'FEC Filing Doc. Num.', value: fec || 'Not provided' });
        } else if (level === 'STATE') {
          if (stateCode === 'CA') {
            complianceLines.push({ label: 'FPPC Filing Number', value: stateFiling || 'Not provided' });
          } else {
            complianceLines.push({ label: 'Election Committee/Agency #', value: agency || 'Not provided' });
          }
        }

        const showCompliance = level === 'FEDERAL' || level === 'STATE';

        return (
        <article key={row.user_id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
              <div style={{ color: '#666', marginTop: 4 }}>
                {(row.office_level ?? row.office_type ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
              </div>
              {showCompliance && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#f0f4f8', border: '1px solid #dde', borderRadius: 6, fontSize: 14 }}>
                  <strong style={{ color: '#333' }}>Filing / compliance (verify before approving)</strong>
                  {complianceLines.map(({ label, value }) => (
                    <div key={label} style={{ marginTop: 4 }}>
                      <span style={{ color: '#555' }}>{label}:</span>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: value === 'Not provided' ? '#c00' : '#1a1a1a' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <form action={async (fd: FormData) => {
              'use server';
              const uid = String(fd.get('user_id'));
              const notes = String(fd.get('notes') || '');
              await approveCandidate(uid, notes || undefined);
            }}>
              <input type="hidden" name="user_id" value={row.user_id} />
              <input name="notes" placeholder="Reviewer notes (optional)" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, marginRight: 6 }} />
              <button type="submit" style={{ padding: '8px 12px', borderRadius: 6 }}>Approve</button>
            </form>
            <form action={async (fd: FormData) => {
              'use server';
              const uid = String(fd.get('user_id'));
              const notes = String(fd.get('notes') || '');
              await rejectCandidate(uid, notes || undefined);
            }}>
              <input type="hidden" name="user_id" value={row.user_id} />
              <input name="notes" placeholder="Reviewer notes (optional)" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, marginRight: 6 }} />
              <button type="submit" style={{ padding: '8px 12px', borderRadius: 6 }}>Reject</button>
            </form>
          </div>
        </article>
        );
      })}
    </main>
  );
  } catch (err: any) {
    if (err?.digest === 'NEXT_REDIRECT' || err?.digest === 'NEXT_NOT_FOUND') throw err;
    const message = err?.message ?? String(err);
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <h2 style={{ color: '#c00' }}>Pending page error</h2>
        <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 8 }}>{message}</p>
        <p style={{ color: '#666', marginTop: 16 }}>
          Check .env.local and that api.candidate_profiles_pending (or api.app_users_admin) exists in Supabase.
        </p>
      </main>
    );
  }
}


