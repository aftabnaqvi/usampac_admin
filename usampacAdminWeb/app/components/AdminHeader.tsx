import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function AdminHeader() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  return (
    <header className="headerBar">
      <div className="headerInner">
      <nav className="navLinks">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/pending">Pending</Link>
        <Link href="/approved">Approved</Link>
        <Link href="/elected">Elected</Link>
        <Link href="/rejected">Rejected</Link>
        <Link href="/polls">Polls</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/notifications">Notifications</Link>
      </nav>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <span className="pill">
          {user ? user.email : 'Not signed in'}
        </span>
        {user ? <Link className="pill" href="/logout">Sign out</Link> : <Link className="pill" href="/login">Login</Link>}
      </div>
      </div>
    </header>
  );
}


