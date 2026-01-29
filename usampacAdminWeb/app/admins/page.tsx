import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminUser, listAdmins } from '@/lib/appUsers';
import { addAdminByEmail, removeAdminById } from './actions';
import ConfirmButton from '@/app/manage/ConfirmButton';

export default async function AdminsPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) {
    redirect('/login');
  }
  try {
    const pub: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(pub, user.id);
    if (!ok) redirect('/login');
  } catch {}

  const admin = supabaseAdmin();
  const db = (admin as any).schema ? (admin as any).schema('api') : admin;
  const { data: adminRows, error, idColumn } = await listAdmins(db);

  // Map auth_sub -> email for display (best-effort)
  let emailById = new Map<string, string>();
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data.users ?? []) {
      if (u.id && u.email) emailById.set(u.id, u.email);
    }
  } catch {
    // ignore, show IDs only
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 12px' }}>
        <h2>Admins</h2>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/manage">Manage</Link>
        </nav>
      </header>

      {searchParams?.success && (
        <p style={{ color: 'green' }}>
          {searchParams.success === '1' && 'Admin added.'}
          {searchParams.success === 'removed' && 'Admin removed.'}
        </p>
      )}
      {searchParams?.error && <p style={{ color: 'red' }}>Error: {searchParams.error}</p>}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      <section style={{ border: '1px solid #333', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Add Admin</h3>
        <form
          action={async (fd: FormData) => {
            'use server';
            const email = String(fd.get('email') ?? '');
            const invite = String(fd.get('invite') ?? '') === 'on';
            await addAdminByEmail(email, invite);
          }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
        >
          <input
            name="email"
            type="email"
            required
            placeholder="admin@example.com"
            style={{ flex: 1, minWidth: 220, padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="invite" defaultChecked />
            Invite if missing
          </label>
          <button type="submit" style={{ padding: '10px 14px', borderRadius: 8 }}>
            Add Admin
          </button>
        </form>
      </section>

      <section>
        <h3>Current Admins</h3>
        {(adminRows ?? []).length === 0 && !error && <p>No admins found.</p>}
        <ul>
          {(adminRows ?? []).map((row: any) => {
            const userId = row[idColumn] ?? row.auth_sub ?? row.user_id ?? row.id;
            const rowEmail = row.email ?? emailById.get(userId);
            return (
            <li key={userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{rowEmail ?? userId}</span>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const uid = String(fd.get('user_id'));
                  await removeAdminById(uid);
                }}
              >
                <input type="hidden" name="user_id" value={userId} />
                <ConfirmButton
                  type="submit"
                  confirmMessage="Remove admin access for this user?"
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#8b1d1d', color: '#fff' }}
                  title="Remove admin"
                >
                  Remove
                </ConfirmButton>
              </form>
            </li>
          );
          })}
        </ul>
      </section>
    </main>
  );
}
