import { getServerUser } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { promoteCandidateToElected } from './actions';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import ListSearch from '@/app/components/ListSearch';

export default async function Approved({
  searchParams
}: {
  searchParams?: { success?: string; error?: string; q?: string };
}) {
  try {
    const { supabase, user } = await getServerUser();
    const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    if (!user) {
      redirectToLogin('/approved');
    }
    try {
      const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
      const ok = await isAdminUser(pub, user.id);
      if (!ok) redirectToLogin('/approved');
    } catch {}
    const { data, error } = await (db as any)
    .from('candidate_profiles_admin')
    .select('*')
    .eq('approval_status', 'approved');
    const query = listSearchQuery(searchParams?.q);
    const rows = (data ?? []).filter((row: any) => matchesListQuery(row, query));

  // Also fetch current elected ids so we can mark “Promoted” in the approved list.
  const { data: electedRows } = await (db as any)
    .from('active_elected')
    .select('id')
    .limit(5000);
  const electedIds = new Set<string>((electedRows ?? []).map((r: any) => String(r.id)));

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Approved Candidates</h2>
        <nav className="pageNav">
          <Link href="/">Home</Link>
          <span className="muted">Logged in as {user?.email}</span>
        </nav>
      </header>
      <ListSearch action="/approved" query={query} placeholder="Search by name, office, city, state, or year" />
      {query && (
        <p className="muted" style={{ marginTop: -8 }}>
          Showing {rows.length} result{rows.length === 1 ? '' : 's'} for “{query}”.
        </p>
      )}
      {searchParams?.success && (
        <p className="flashOk">Promoted to elected successfully.</p>
      )}
      {searchParams?.error && (
        <p className="flashErr">Promote failed: {searchParams.error}</p>
      )}
      {error && <p className="flashErr">{error.message}</p>}
      {!error && rows.length === 0 && (
        <p>{query ? 'No approved candidates match that search.' : 'No approved candidates.'}</p>
      )}
      {rows.map((row: any) => {
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
        const isElected = electedIds.has(String(row.user_id));
        return (
        <article key={row.user_id} className="card">
              <>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  {row.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.photo_url} alt="" className="avatar" />
                  ) : (
                    <div className="avatarFallback">?</div>
                  )}
                <div>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
                    {isElected && (
                      <span className="badge">
                        Promoted
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {(row.office_level ?? row.office_type ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                    | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Election Year: {(row.cycle ?? '-')}
                  </div>
                  {showCompliance && (
                    <div className="complianceBox">
                      <strong>Filing / compliance</strong>
                      {complianceLines.map(({ label, value }) => (
                        <div key={label} style={{ marginTop: 4 }}>
                          <span className="muted">{label}:</span>{' '}
                          <span className={value === 'Not provided' ? 'mono missing' : 'mono'}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {row.reviewer_notes && (
                    <div style={{ marginTop: 6 }}>Notes: {row.reviewer_notes}</div>
                  )}
                  {row.approved_at && (
                    <div className="muted" style={{ marginTop: 4 }}>Approved at: {new Date(row.approved_at).toLocaleString()}</div>
                  )}
                </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <form
                    action={async (fd: FormData) => {
                      'use server';
                      const uid = String(fd.get('user_id'));
                      const notes = String(fd.get('notes') || '');
                      await promoteCandidateToElected(uid, notes || undefined);
                    }}
                    className="formInline"
                  >
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <input
                      name="notes"
                      placeholder="Promotion notes (optional)"
                      disabled={isElected}
                    />
                    <button
                      type="submit"
                      className="btnPrimary"
                      disabled={isElected}
                      title={isElected ? 'Already promoted to elected' : 'Promote to elected'}
                    >
                      {isElected ? 'Already Elected' : 'Promote to Elected'}
                    </button>
                  </form>
                </div>
              </>
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
        <h2>Approved page error</h2>
        <p className="errorCode">{message}</p>
        <p className="muted">
          Check .env.local and that api.candidate_profiles_admin and api.active_elected exist in Supabase.
        </p>
      </main>
    );
  }
}

