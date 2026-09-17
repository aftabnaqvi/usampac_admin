import { supabaseServer } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

export default async function ElectedOfficialsPage() {
  const DEFAULT_TERM_YEARS = 4;

  const yearFrom = (raw: any): number | null => {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    // Works for "YYYY-MM-DD" and ISO strings
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.getUTCFullYear();
    const y = Number.parseInt(s.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  };

  const termLabel = (start: any, end: any) => {
    const sy = yearFrom(start);
    const ey = yearFrom(end);
    if (sy != null && ey != null) return sy === ey ? String(sy) : `${sy}–${ey}`;
    if (sy != null) return `${sy}–${sy + DEFAULT_TERM_YEARS}`;
    return '—';
  };

  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;

  if (!user) {
    redirectToLogin('/elected');
  }

  // Optional: enforce ADMIN role from app_users
  try {
    const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(dbPublic, user.id);
    if (!ok) redirectToLogin('/elected');
  } catch {
    // rely on RLS if this check fails
  }

  const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  // Prefer active_elected_public if present (includes contact fields like email/phone).
  // Fallback to active_elected if the view doesn't exist yet.
  let rows: any[] | null = null;
  let error: any = null;
  let count: number | null = null;

  const attemptPublic = await db
    .from('active_elected_public')
    .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end,email,phone,photo_url', { count: 'exact' })
    .order('candidate_name', { ascending: true })
    .limit(5000);

  if (!attemptPublic.error) {
    rows = attemptPublic.data ?? null;
    error = null;
    count = attemptPublic.count ?? null;
  } else {
    const attemptFallback = await db
      .from('active_elected')
      .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end', { count: 'exact' })
      .order('candidate_name', { ascending: true })
      .limit(5000);
    rows = attemptFallback.data ?? null;
    error = attemptFallback.error ?? null;
    count = attemptFallback.count ?? null;
  }

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <div>
          <h2>Elected Officials</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Total: <strong>{count ?? (rows?.length ?? 0)}</strong>
          </p>
        </div>
      </header>

      {error && (
        <p className="flashErr">
          Error loading elected officials: {error.message}
        </p>
      )}

      <section className="tableWrap">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Office</th>
                <th>Level</th>
                <th>Party</th>
                <th>Jurisdiction</th>
                <th>Photo</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Term</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.candidate_name ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.office_name ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.level ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.party ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {(r.jurisdiction_name ?? '—') + (r.state_code ? `, ${r.state_code}` : '')}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo_url}
                        alt=""
                        className="thumb"
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.email ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.phone ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {termLabel(r.term_start, r.term_end)}
                  </td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && (
                <tr>
                  <td colSpan={9} className="muted">
                    No elected officials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </main>
    </>
  );
}

