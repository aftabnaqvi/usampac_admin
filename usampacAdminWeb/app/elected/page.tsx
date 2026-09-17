import { getServerUser } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

function photoUrlOf(row: any): string | null {
  const value = row?.photo_url ?? row?.photo ?? row?.image_url;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function CandidateAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="avatar" />
    );
  }
  return <div className="avatarFallback">{(name.trim()[0] || '?').toUpperCase()}</div>;
}

export default async function ElectedOfficialsPage() {
  const DEFAULT_TERM_YEARS = 4;

  const yearFrom = (raw: any): number | null => {
    const s = String(raw ?? '').trim();
    if (!s) return null;
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

  const { supabase, user } = await getServerUser();

  if (!user) {
    redirectToLogin('/elected');
  }

  try {
    const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(dbPublic, user.id);
    if (!ok) redirectToLogin('/elected');
  } catch {
    // rely on RLS if this check fails
  }

  const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const electedSelect = 'id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end,email,phone,photo_url';
  let rows: any[] | null = null;
  let error: any = null;
  let count: number | null = null;

  const attemptPublic = await db
    .from('active_elected_public')
    .select(electedSelect, { count: 'exact' })
    .order('candidate_name', { ascending: true })
    .limit(5000);

  if (!attemptPublic.error) {
    rows = attemptPublic.data ?? null;
    count = attemptPublic.count ?? null;
  } else {
    const attemptFallback = await db
      .from('active_elected')
      .select(electedSelect, { count: 'exact' })
      .order('candidate_name', { ascending: true })
      .limit(5000);
    if (!attemptFallback.error) {
      rows = attemptFallback.data ?? null;
      error = null;
      count = attemptFallback.count ?? null;
    } else {
      const attemptNoPhoto = await db
        .from('active_elected')
        .select('id,candidate_name,office_name,level,party,jurisdiction_name,state_code,term_start,term_end,email,phone', { count: 'exact' })
        .order('candidate_name', { ascending: true })
        .limit(5000);
      rows = attemptNoPhoto.data ?? null;
      error = attemptNoPhoto.error ?? null;
      count = attemptNoPhoto.count ?? null;
    }
  }

  const missingPhotoIds = (rows ?? []).filter((r) => !photoUrlOf(r)).map((r) => String(r.id));
  if (missingPhotoIds.length > 0) {
    const { data: profiles } = await db
      .from('candidate_profiles_admin')
      .select('user_id,photo_url')
      .in('user_id', missingPhotoIds.slice(0, 1000));
    const photoById = new Map<string, string>(
      (profiles ?? [])
        .filter((p: any) => photoUrlOf(p))
        .map((p: any) => [String(p.user_id), photoUrlOf(p) as string])
    );
    rows = (rows ?? []).map((r) => (photoUrlOf(r) ? r : { ...r, photo_url: photoById.get(String(r.id)) ?? r.photo_url }));
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
                <th>Official</th>
                <th>Office</th>
                <th>Level</th>
                <th>Party</th>
                <th>Jurisdiction</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Term</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r: any) => {
                const name = r.candidate_name ?? 'Elected';
                return (
                <tr key={r.id}>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                      <CandidateAvatar url={photoUrlOf(r)} name={name} />
                      <strong style={{ whiteSpace: 'nowrap' }}>{name}</strong>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.office_name ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.level ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.party ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {(r.jurisdiction_name ?? '—') + (r.state_code ? `, ${r.state_code}` : '')}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.email ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.phone ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {termLabel(r.term_start, r.term_end)}
                  </td>
                </tr>
                );
              })}
              {(!rows || rows.length === 0) && (
                <tr>
                  <td colSpan={8} className="muted">
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
