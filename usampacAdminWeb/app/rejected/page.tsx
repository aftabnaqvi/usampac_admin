import { getServerUser } from '@/lib/supabaseServer';
import Link from 'next/link';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

function photoUrlOf(row: any): string | null {
  const value = row?.photo_url ?? row?.photo ?? row?.image_url;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default async function Rejected() {
  const { supabase, user } = await getServerUser();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  if (!user) {
    redirectToLogin('/rejected');
  }
  try {
    const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(pub, user.id);
    if (!ok) redirectToLogin('/rejected');
  } catch {}
  const { data, error } = await (db as any)
    .from('candidate_profiles_admin')
    .select('*')
    .eq('approval_status', 'rejected');

  let rows = data ?? [];
  const missingIds = rows.filter((row: any) => !photoUrlOf(row)).map((row: any) => String(row.user_id));
  if (missingIds.length > 0) {
    const { data: profiles } = await db
      .from('candidate_profiles')
      .select('user_id,photo_url')
      .in('user_id', missingIds.slice(0, 1000));
    const photoById = new Map<string, string>(
      (profiles ?? [])
        .filter((p: any) => photoUrlOf(p))
        .map((p: any) => [String(p.user_id), photoUrlOf(p) as string])
    );
    rows = rows.map((row: any) =>
      photoUrlOf(row) ? row : { ...row, photo_url: photoById.get(String(row.user_id)) ?? row.photo_url }
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Rejected Candidates</h2>
        <nav className="pageNav">
          <Link href="/">Home</Link>
          <span className="muted">Logged in as {user?.email}</span>
        </nav>
      </header>
      {error && <p className="flashErr">{error.message}</p>}
      {!error && rows.length === 0 && (
        <p>No rejected candidates.</p>
      )}
      {rows.map((row: any) => {
        const name = row.display_name ?? row.email ?? 'Candidate';
        const photo = photoUrlOf(row);
        return (
        <article key={row.user_id} className="card">
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="avatar" />
            ) : (
              <div className="avatarFallback">{(name.trim()[0] || '?').toUpperCase()}</div>
            )}
            <div>
              <h3 style={{ margin: 0 }}>{name}</h3>
              <div className="muted" style={{ marginTop: 4 }}>
                {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Election Year: {(row.cycle ?? '-')}
              </div>
              {row.reviewer_notes && (
                <div style={{ marginTop: 6 }}>Notes: {row.reviewer_notes}</div>
              )}
              {row.approved_at && (
                <div className="muted" style={{ marginTop: 4 }}>Reviewed at: {new Date(row.approved_at).toLocaleString()}</div>
              )}
            </div>
          </div>
        </article>
        );
      })}
      </main>
    </>
  );
}
