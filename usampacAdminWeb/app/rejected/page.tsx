import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';

export default async function Rejected() {
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
    .eq('approval_status', 'rejected');

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Rejected Candidates</h2>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <span style={{ color: '#666' }}>Logged in as {user?.email}</span>
        </nav>
      </header>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {!error && (!data || data.length === 0) && (
        <p>No rejected candidates.</p>
      )}
      {data?.map((row: any) => (
        <article key={row.user_id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
            <div style={{ color: '#666', marginTop: 4 }}>
              {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
              | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
            </div>
            {row.reviewer_notes && (
              <div style={{ color: '#444', marginTop: 6 }}>Notes: {row.reviewer_notes}</div>
            )}
            {row.approved_at && (
              <div style={{ color: '#444', marginTop: 4 }}>Reviewed at: {new Date(row.approved_at).toLocaleString()}</div>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}


