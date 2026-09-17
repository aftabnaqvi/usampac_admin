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
            <form action="/logout" method="POST">
              <button type="submit" className="pill">
                Sign out
              </button>
            </form>
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
