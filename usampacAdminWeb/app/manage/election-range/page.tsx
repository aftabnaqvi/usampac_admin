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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 12px' }}>
      <AdminHeader />
      <header style={{ margin: '16px 0 20px' }}>
        <h2>Election Range</h2>
        <p style={{ color: '#555', marginTop: 4 }}>
          This controls the <strong>ELECTION YYYY-YYYY</strong> text shown on the USAMPAC mobile app home screen.
        </p>
      </header>

      <section
        style={{
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 16
        }}
      >
        <h3 style={{ marginTop: 0 }}>Configure current cycle</h3>
        <form action={saveElectionRange} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <label style={{ fontSize: 14, color: '#444' }}>Election range (e.g. 2026-2028)</label>
          <input
            name="election_range"
            defaultValue={current}
            placeholder="2026-2028"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'monospace' }}
          />
          <p style={{ fontSize: 12, color: '#666', margin: '4px 0 8px' }}>
            Use a simple format like <code>2026-2028</code>. The mobile app will automatically show this range under
            the word ELECTION.
          </p>
          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: 6,
              backgroundColor: '#111827',
              color: 'white',
              fontWeight: 600
            }}
          >
            Save
          </button>
        </form>
      </section>
    </main>
  );
}

