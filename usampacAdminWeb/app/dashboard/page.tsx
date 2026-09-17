import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';

export default async function Dashboard() {
  try {
    const supabase = supabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user ?? null;

    if (!user) {
      redirect('/login');
    }
    try {
      const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
      const ok = await isAdminUser(dbPublic, user.id);
      if (!ok) redirect('/login');
    } catch {
      // rely on RLS if this check fails
    }

    const db: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

    // Candidate counts
    const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
    db.from('candidate_profiles_pending').select('*', { count: 'exact', head: true }),
    db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected')
  ]);

  // Candidate sample lists (top 10)
  const [{ data: pending }, { data: approved }, { data: rejected }] = await Promise.all([
    db.from('candidate_profiles_pending').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle').limit(10),
    db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at').eq('approval_status', 'approved').limit(10),
    db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at,reviewer_notes').eq('approval_status', 'rejected').limit(10)
  ]);

  // Elected officials summary (top 10)
  const [{ data: elected, count: electedCount }] = await Promise.all([
    db
      .from('active_elected')
      .select('id,candidate_name,office_name,term_start,term_end', { count: 'exact' })
      .order('candidate_name', { ascending: true })
      .limit(10)
  ]);

  // Polls, quiz, notifications summaries (top 5 each)
  const [
    { data: polls, error: pollsError, count: pollsCount },
    { data: quizQuestions, error: quizError, count: quizCount },
    { data: notifications, error: notifError, count: notifCount }
  ] = await Promise.all([
    db
      .from('polls')
      .select('id,title,is_active,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('quiz_questions')
      .select('id,prompt,is_active,position', { count: 'exact' })
      .order('position', { ascending: true })
      .limit(5),
    db
      .from('notifications')
      .select('id,title,is_active,published_at', { count: 'exact' })
      .order('published_at', { ascending: false })
      .limit(5)
  ]);

  if (pollsError || quizError || notifError) {
    console.error('DEBUG dashboard content error', { pollsError, quizError, notifError });
  }

  const Card = ({ title, count, link, rows }: { title: string; count: number | null; link: string; rows: any[] | null }) => (
    <section className="card">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="cardTitle" style={{ margin: 0 }}>{title}</h3>
        <Link href={link}>View all</Link>
      </header>
      <p className="muted" style={{ marginTop: 6 }}>Total: {count ?? 0}</p>
      <ul style={{ paddingLeft: 18 }}>
        {(rows ?? []).map((r) => (
          <li key={r.user_id}>
            {(r.display_name ?? r.email ?? 'Candidate')} — {(r.office_level ?? '-')}/{(r.office_name ?? '-')}
          </li>
        ))}
        {(!rows || rows.length === 0) && <li className="muted">No items</li>}
      </ul>
    </section>
  );

  const SimpleCard = ({
    title,
    count,
    link,
    rows,
    getLabel
  }: {
    title: string;
    count: number | null;
    link: string;
    rows: any[] | null;
    getLabel: (row: any) => string;
  }) => (
    <section className="card">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="cardTitle" style={{ margin: 0 }}>{title}</h3>
        <Link href={link}>Manage</Link>
      </header>
      <p className="muted" style={{ marginTop: 6 }}>Total: {count ?? 0}</p>
      <ul style={{ paddingLeft: 18 }}>
        {(rows ?? []).map((r) => (
          <li key={r.id ?? r.slug ?? JSON.stringify(r)}>{getLabel(r)}</li>
        ))}
        {(!rows || rows.length === 0) && <li className="muted">No items</li>}
      </ul>
    </section>
  );

  const yearFrom = (raw: any): number | null => {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.getUTCFullYear();
    const y = Number.parseInt(s.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  };

  const termLabel = (start: any, end: any) => {
    const DEFAULT_TERM_YEARS = 4;
    const sy = yearFrom(start);
    const ey = yearFrom(end);
    if (sy != null && ey != null) return sy === ey ? String(sy) : `${sy}–${ey}`;
    if (sy != null) return `${sy}–${sy + DEFAULT_TERM_YEARS}`;
    return '—';
  };

  return (
    <>
      <AdminHeader />
      <main className="container">
      <header className="pageHeader">
        <h2>Admin Dashboard</h2>
        <nav className="pageNav">
          <Link href="/">Home</Link>
          <Link href="/manage/election-range">Election range</Link>
          {user && <span className="muted">Logged in as {user.email}</span>}
        </nav>
      </header>
      <div className="gridCards">
        <Card title="Pending" count={pendingCount ?? 0} link="/pending" rows={pending ?? []} />
        <Card title="Approved" count={approvedCount ?? 0} link="/approved" rows={approved ?? []} />
        <Card title="Rejected" count={rejectedCount ?? 0} link="/rejected" rows={rejected ?? []} />
      </div>
      <div className="gridCards" style={{ marginTop: 24 }}>
        <SimpleCard
          title="Elected Officials"
          count={electedCount ?? 0}
          link="/elected"
          rows={elected ?? []}
          getLabel={(r) => `${r.candidate_name ?? 'Elected'} — ${r.office_name ?? '-'} (${termLabel(r.term_start, r.term_end)})`}
        />
        <SimpleCard
          title="Polls"
          count={pollsCount ?? 0}
          link="/polls"
          rows={polls ?? []}
          getLabel={(r) => `${r.title ?? 'Untitled'}${r.is_active ? ' (active)' : ''}`}
        />
        <SimpleCard
          title="Quiz Questions"
          count={quizCount ?? 0}
          link="/quiz"
          rows={quizQuestions ?? []}
          getLabel={(r) => `${r.prompt?.slice(0, 60) ?? 'Untitled'}${r.is_active ? ' (active)' : ''}`}
        />
        <SimpleCard
          title="Notifications"
          count={notifCount ?? 0}
          link="/notifications"
          rows={notifications ?? []}
          getLabel={(r) => `${r.title ?? 'Untitled'}${r.is_active ? ' (active)' : ''}`}
        />
      </div>
      </main>
    </>
  );
  } catch (err: any) {
    if (String(err?.digest ?? '').startsWith('NEXT_REDIRECT') || String(err?.digest ?? '').startsWith('NEXT_NOT_FOUND')) throw err;
    const message = err?.message ?? String(err);
    const details = err?.details ?? err?.hint ?? '';
    return (
      <main className="errorPanel card">
        <h2>Dashboard error</h2>
        <p className="errorCode">
          {message}
          {details ? `\n${details}` : ''}
        </p>
        <p className="muted">
          Check server logs for full stack. Common causes: missing .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY),
          or a view/table missing in the api schema (candidate_profiles_pending, candidate_profiles_admin, app_users_admin, active_elected, etc.).
        </p>
      </main>
    );
  }
}


