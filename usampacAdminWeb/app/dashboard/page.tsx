import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';

export default async function Dashboard() {
  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;

  if (!user) {
    redirect('/login');
  }
  // Optional: enforce ADMIN role from app_users
  try {
    const db: any = (supabase as any).schema ? (supabase as any).schema('public') : supabase;
    const { data: roleRow } = await db.from('app_users').select('role').eq('auth_sub', user.id).limit(1).single();
    if (!roleRow || roleRow.role !== 'ADMIN') {
      redirect('/login');
    }
  } catch {
    // rely on RLS if this check fails
  }

  const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  // Counts
  const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
    db.from('candidate_profiles_pending').select('*', { count: 'exact', head: true }),
    db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected')
  ]);

  // Sample lists (top 10)
  const [{ data: pending }, { data: approved }, { data: rejected }] = await Promise.all([
    db.from('candidate_profiles_pending').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle').limit(10),
    db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at').eq('approval_status', 'approved').limit(10),
    db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at,reviewer_notes').eq('approval_status', 'rejected').limit(10)
  ]);

  const Card = ({ title, count, link, rows }: { title: string; count: number | null; link: string; rows: any[] | null }) => (
    <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, flex: 1, minWidth: 260 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <Link href={link}>View all</Link>
      </header>
      <p style={{ color: '#666', marginTop: 6 }}>Total: {count ?? 0}</p>
      <ul style={{ paddingLeft: 18 }}>
        {(rows ?? []).map((r) => (
          <li key={r.user_id}>
            {(r.display_name ?? r.email ?? 'Candidate')} — {(r.office_level ?? '-')}/{(r.office_name ?? '-')}
          </li>
        ))}
        {(!rows || rows.length === 0) && <li style={{ color: '#888' }}>No items</li>}
      </ul>
    </section>
  );

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Admin Dashboard</h2>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/pending">Pending</Link>
          <Link href="/approved">Approved</Link>
          <Link href="/rejected">Rejected</Link>
          {user && <span style={{ color: '#666' }}>Logged in as {user.email}</span>}
        </nav>
      </header>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card title="Pending" count={pendingCount ?? 0} link="/pending" rows={pending ?? []} />
        <Card title="Approved" count={approvedCount ?? 0} link="/approved" rows={approved ?? []} />
        <Card title="Rejected" count={rejectedCount ?? 0} link="/rejected" rows={rejected ?? []} />
      </div>
    </main>
  );
}


