import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function AdminHeader() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/pending">Pending</Link>
        <Link href="/approved">Approved</Link>
        <Link href="/rejected">Rejected</Link>
        <Link href="/polls">Polls</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/notifications">Notifications</Link>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? <span style={{ color: '#666' }}>{user.email}</span> : <span style={{ color: '#666' }}>Not signed in</span>}
        {user ? <Link href="/logout">Sign out</Link> : <Link href="/login">Login</Link>}
      </div>
    </header>
  );
}


