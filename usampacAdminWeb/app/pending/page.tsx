import { getServerUser } from '@/lib/supabaseServer';
import { approveCandidate, rejectCandidate } from './actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

export default async function Pending() {
  try {
    const { supabase, user } = await getServerUser();
    const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    if (!user) {
      redirectToLogin('/pending');
    }
    try {
      const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
      const ok = await isAdminUser(pub, user.id);
      if (!ok) redirectToLogin('/pending');
    } catch {}

    const { data, error } = await (db as any)
      .from('candidate_profiles_pending')
      .select('*');

    return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Pending Candidates</h2>
        <nav className="pageNav">
          <Link href="/">Home</Link>
          {user && <span className="muted">Logged in as {user.email}</span>}
        </nav>
      </header>
      {error && <p className="flashErr">{error.message}</p>}
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
        <article key={row.user_id} className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
              {row.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.photo_url} alt="" className="avatar" />
              ) : (
                <div className="avatarFallback">?</div>
              )}
              <div>
              <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
              <div className="muted" style={{ marginTop: 4 }}>
                {(row.office_level ?? row.office_type ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Election Year: {(row.cycle ?? '-')}
              </div>
              {showCompliance && (
                <div className="complianceBox">
                  <strong>Filing / compliance (verify before approving)</strong>
                  {complianceLines.map(({ label, value }) => (
                    <div key={label} style={{ marginTop: 4 }}>
                      <span className="muted">{label}:</span>{' '}
                      <span className={value === 'Not provided' ? 'mono missing' : 'mono'}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <form action={async (fd: FormData) => {
              'use server';
              const uid = String(fd.get('user_id'));
              const notes = String(fd.get('notes') || '');
              await approveCandidate(uid, notes || undefined);
            }} className="formInline">
              <input type="hidden" name="user_id" value={row.user_id} />
              <input name="notes" placeholder="Reviewer notes (optional)" />
              <button type="submit" className="btnPrimary">Approve</button>
            </form>
            <form action={async (fd: FormData) => {
              'use server';
              const uid = String(fd.get('user_id'));
              const notes = String(fd.get('notes') || '');
              await rejectCandidate(uid, notes || undefined);
            }} className="formInline">
              <input type="hidden" name="user_id" value={row.user_id} />
              <input name="notes" placeholder="Reviewer notes (optional)" />
              <button type="submit" className="btnDanger">Reject</button>
            </form>
          </div>
        </article>
        );
      })}
    </main>
    </>
  );
  } catch (err: any) {
    if (String(err?.digest ?? '').startsWith('NEXT_REDIRECT') || String(err?.digest ?? '').startsWith('NEXT_NOT_FOUND')) throw err;
    const message = err?.message ?? String(err);
    return (
      <main className="errorPanel card">
        <h2>Pending page error</h2>
        <p className="errorCode">{message}</p>
        <p className="muted">
          Check .env.local and that api.candidate_profiles_pending (or api.app_users_admin) exists in Supabase.
        </p>
      </main>
    );
  }
}


