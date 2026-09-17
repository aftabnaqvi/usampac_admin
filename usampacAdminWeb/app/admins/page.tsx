import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminUser, listAdmins } from '@/lib/appUsers';
import { addAdminByEmail, removeAdminById } from './actions';
import AddAdminForm from './AddAdminForm';
import RemoveAdminButton from './RemoveAdminButton';

export default async function AdminsPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  try {
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
    } catch (e: any) {
      if (String(e?.digest ?? '').startsWith('NEXT_REDIRECT') || String(e?.digest ?? '').startsWith('NEXT_NOT_FOUND')) throw e;
    }

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
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Admins</h2>
      </header>

      {searchParams?.success && (
        <p className="flashOk">
          {searchParams.success === '1' && 'Admin added. (Existing user — they can log in at the admin site.)'}
          {searchParams.success === 'email' && 'Admin added. Invite email sent.'}
          {searchParams.success === 'invite' && 'Admin added. Supabase invite email sent for new user — check inbox/spam.'}
          {searchParams.success === 'removed' && 'Admin removed.'}
        </p>
      )}
      {searchParams?.error && <p className="flashErr">Error: {searchParams.error}</p>}
      {error && <p className="flashErr">{error.message}</p>}

      <section className="card">
        <h3 className="cardTitle">Add Admin</h3>
        <AddAdminForm addAdminByEmail={addAdminByEmail} />
      </section>

      <section className="sectionBlock">
        <h3>Current Admins</h3>
        {(adminRows ?? []).length === 0 && !error && <p>No admins found.</p>}
        <ul>
          {(adminRows ?? []).map((row: any, index: number) => {
            const col = idColumn ?? 'id';
            const userId = row[col] ?? row.auth_sub ?? row.user_id ?? row.id ?? `row-${index}`;
            const rowEmail = row.email ?? emailById.get(String(userId));
            return (
            <li key={String(userId)} className="row" style={{ marginBottom: 8 }}>
              <span>{rowEmail ?? userId}</span>
              <RemoveAdminButton userId={String(userId)} removeAdminById={removeAdminById} />
            </li>
          );
          })}
        </ul>
      </section>
      </main>
    </>
  );
  } catch (err: any) {
    if (String(err?.digest ?? '').startsWith('NEXT_REDIRECT') || String(err?.digest ?? '').startsWith('NEXT_NOT_FOUND')) throw err;
    const message = err?.message ?? String(err);
    return (
      <main className="errorPanel card">
        <h2>Admins page error</h2>
        <p className="errorCode">{message}</p>
        <p className="muted">
          On Vercel, add <strong>SUPABASE_SERVICE_ROLE_KEY</strong> in Project Settings → Environment Variables (same value as in .env.local).
        </p>
      </main>
    );
  }
}
