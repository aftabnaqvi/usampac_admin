import Link from 'next/link';
import AdminNav from './AdminNav';
import { getServerUser } from '@/lib/supabaseServer';

export default async function AdminHeader() {
  const { user } = await getServerUser();

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
