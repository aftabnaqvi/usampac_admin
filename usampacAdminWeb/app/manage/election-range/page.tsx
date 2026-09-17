import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';

type AppConfigRow = {
  key: string;
  value: string | null;
};

async function requireAdmin() {
  const supabase = supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ?? null;
  if (!user) redirect('/login');

  try {
    const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
    const ok = await isAdminUser(dbPublic, user.id);
    if (!ok) redirect('/login');
  } catch {
    // rely on RLS if this check fails
  }
  return supabase;
}

async function getElectionRange(): Promise<string> {
  const supabase = await requireAdmin();
  const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { data, error } = await db.from('app_config').select('key,value').eq('key', 'election_range').limit(1);
  if (error) {
    console.error('DEBUG election_range get error', error);
    return '2026-2028';
  }
  const row = (data as AppConfigRow[] | null)?.[0];
  return row?.value ?? '2026-2028';
}

async function saveElectionRange(formData: FormData) {
  'use server';
  const supabase = await requireAdmin();
  const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const value = (formData.get('election_range') as string | null)?.trim() ?? '';
  if (!value) return;

  const { error } = await db.from('app_config').upsert({ key: 'election_range', value }, { onConflict: 'key' });
  if (error) {
    console.error('DEBUG election_range save error', error);
    throw new Error(error.message);
  }
  revalidatePath('/manage/election-range');
}

export default async function ElectionRangePage() {
  const current = await getElectionRange();

  return (
    <>
      <AdminHeader />
      <main className="container narrow">
      <header className="pageHeader">
        <div>
          <h2>Election Range</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            This controls the <strong>ELECTION YYYY-YYYY</strong> text shown on the USAMPAC mobile app home screen.
          </p>
        </div>
      </header>

      <section className="card">
        <h3 className="cardTitle">Configure current cycle</h3>
        <form action={saveElectionRange} className="formGrid" style={{ maxWidth: 360 }}>
          <label>Election range (e.g. 2026-2028)</label>
          <input
            name="election_range"
            defaultValue={current}
            placeholder="2026-2028"
            className="mono"
          />
          <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
            Use a simple format like <code>2026-2028</code>. The mobile app will automatically show this range under
            the word ELECTION.
          </p>
          <button type="submit" className="btnPrimary btnFit">
            Save
          </button>
        </form>
      </section>
      </main>
    </>
  );
}

