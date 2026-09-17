import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import AdminNav from './AdminNav';

export default async function AdminHeader() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  return (
    <header className="headerBar">
      <div className="headerInner">
        <Link href="/dashboard" className="brand">
          USAMPAC
        </Link>
        <AdminNav />
        <div className="headerActions">
          <span className="pill">{user ? user.email : 'Not signed in'}</span>
          {user ? (
            <Link className="pill" href="/logout">
              Sign out
            </Link>
          ) : (
            <Link className="pill" href="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
