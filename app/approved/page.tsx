import { supabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function Approved() {
  const supabase = supabaseServer();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { data, error } = await (db as any)
    .from('candidate_profiles_admin')
    .select('*')
    .eq('approval_status', 'approved');

  return (
    <main style={{ maxWidth: 960, margin: '30px auto', padding: '0 12px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Approved Candidates</h2>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/rejected">Rejected</Link>
          { (await (await supabase.auth.getUser()).data.user) && <span style={{ color: '#666' }}>Logged in as {(await supabase.auth.getUser()).data.user?.email}</span>}
        </nav>
      </header>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {!error && (!data || data.length === 0) && (
        <p>No approved candidates.</p>
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
              <div style={{ color: '#444', marginTop: 4 }}>Approved at: {new Date(row.approved_at).toLocaleString()}</div>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}


