import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';

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
    redirect('/login');
  }

  // Optional: enforce ADMIN role from app_users
  try {
    const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(dbPublic, user.id);
    if (!ok) redirect('/login');
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
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />

      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Elected Officials</h2>
          <p style={{ color: '#aaa', margin: '6px 0 0' }}>
            Total: <strong>{count ?? (rows?.length ?? 0)}</strong>
          </p>
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/approved">Approved</Link>
        </nav>
      </header>

      {error && (
        <p style={{ color: 'red' }}>
          Error loading elected officials: {error.message}
        </p>
      )}

      <section style={{ border: '1px solid #333', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Office</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Level</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Party</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Jurisdiction</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Photo</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Email</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Phone</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Term</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.candidate_name ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.office_name ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.level ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.party ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                    {(r.jurisdiction_name ?? '—') + (r.state_code ? `, ${r.state_code}` : '')}
                  </td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                    {r.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo_url}
                        alt=""
                        style={{ width: 34, height: 34, borderRadius: 999, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }}
                      />
                    ) : (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.email ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{r.phone ?? '—'}</td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                    {termLabel(r.term_start, r.term_end)}
                  </td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && (
                <tr>
                  <td colSpan={9} style={{ padding: 16, color: '#aaa' }}>
                    No elected officials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

