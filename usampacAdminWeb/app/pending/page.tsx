import { supabaseServer } from '@/lib/supabaseServer';
import { approveCandidate, rejectCandidate } from './actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';

export default async function Pending() {
  const supabase = supabaseServer();
  const db = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  // Get session; if no user, redirect to login
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) {
    redirect('/login');
  }
  // Optional server-side admin role check
  try {
    const pub: any = (supabase as any).schema ? (supabase as any).schema('public') : supabase;
    const { data: roleRow } = await pub.from('app_users').select('role').eq('auth_sub', user.id).limit(1).single();
    if (!roleRow || roleRow.role !== 'ADMIN') {
      redirect('/login');
    }
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
      {data?.map((row: any) => (
        <article key={row.user_id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0 }}>{row.display_name ?? row.email ?? 'Candidate'}</h3>
              <div style={{ color: '#666', marginTop: 4 }}>
                {(row.office_level ?? '-') + ' — ' + (row.office_name ?? '-')}{' '}
                | {(row.city_name ?? '-')} , {(row.state_code ?? '-')} | Cycle: {(row.cycle ?? '-')}
              </div>
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
      ))}
    </main>
  );
}


