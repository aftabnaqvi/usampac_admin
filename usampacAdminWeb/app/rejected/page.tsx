import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

export default async function Rejected() {
  const supabase = supabaseServer();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
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
      {!error && (!data || data.length === 0) && (
        <p>No rejected candidates.</p>
      )}
      {data?.map((row: any) => (
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
      ))}
      </main>
    </>
  );
}


