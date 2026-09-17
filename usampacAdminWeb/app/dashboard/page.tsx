import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';

function DashTable({
  title,
  count,
  link,
  linkLabel,
  columns,
  rows
}: {
  title: string;
  count: number | null;
  link: string;
  linkLabel: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <section className="card">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3 className="cardTitle" style={{ margin: 0 }}>{title}</h3>
          <p className="muted" style={{ margin: '4px 0 0' }}>Total: {count ?? 0}</p>
        </div>
        <Link href={link}>{linkLabel}</Link>
      </header>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={`${title}-${i}`}>
                {cells.map((cell, j) => (
                  <td key={`${i}-${j}`}>{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="muted">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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

    const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
      db.from('candidate_profiles_pending').select('*', { count: 'exact', head: true }),
      db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      db.from('candidate_profiles_admin').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected')
    ]);

    const [{ data: pending }, { data: approved }, { data: rejected }] = await Promise.all([
      db.from('candidate_profiles_pending').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle').limit(10),
      db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at').eq('approval_status', 'approved').limit(10),
      db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at,reviewer_notes').eq('approval_status', 'rejected').limit(10)
    ]);

    const [{ data: elected, count: electedCount }] = await Promise.all([
      db
        .from('active_elected')
        .select('id,candidate_name,office_name,level,term_start,term_end', { count: 'exact' })
        .order('candidate_name', { ascending: true })
        .limit(10)
    ]);

    const [
      { data: polls, error: pollsError, count: pollsCount },
      { data: quizQuestions, error: quizError, count: quizCount },
      { data: notifications, error: notifError, count: notifCount }
    ] = await Promise.all([
      db
        .from('polls')
        .select('id,title,is_active,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('quiz_questions')
        .select('id,prompt,is_active,position', { count: 'exact' })
        .order('position', { ascending: true })
        .limit(10),
      db
        .from('notifications')
        .select('id,title,is_active,published_at', { count: 'exact' })
        .order('published_at', { ascending: false })
        .limit(10)
    ]);

    if (pollsError || quizError || notifError) {
      console.error('DEBUG dashboard content error', { pollsError, quizError, notifError });
    }

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

    const location = (r: any) =>
      [r.city_name, r.state_code].filter(Boolean).join(', ') || '—';

    const candidateName = (r: any) => r.display_name ?? r.email ?? 'Candidate';

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
          <div className="dashSections">
            <DashTable
              title="Pending"
              count={pendingCount ?? 0}
              link="/pending"
              linkLabel="View all"
              columns={['Name', 'Office', 'Location', 'Election Year']}
              rows={(pending ?? []).map((r: any) => [
                candidateName(r),
                `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                location(r),
                r.cycle ?? '—'
              ])}
            />
            <DashTable
              title="Approved"
              count={approvedCount ?? 0}
              link="/approved"
              linkLabel="View all"
              columns={['Name', 'Office', 'Location', 'Election Year']}
              rows={(approved ?? []).map((r: any) => [
                candidateName(r),
                `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                location(r),
                r.cycle ?? '—'
              ])}
            />
            <DashTable
              title="Rejected"
              count={rejectedCount ?? 0}
              link="/rejected"
              linkLabel="View all"
              columns={['Name', 'Office', 'Location', 'Election Year']}
              rows={(rejected ?? []).map((r: any) => [
                candidateName(r),
                `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                location(r),
                r.cycle ?? '—'
              ])}
            />
            <DashTable
              title="Elected Officials"
              count={electedCount ?? 0}
              link="/elected"
              linkLabel="Manage"
              columns={['Name', 'Office', 'Level', 'Term']}
              rows={(elected ?? []).map((r: any) => [
                r.candidate_name ?? 'Elected',
                r.office_name ?? '—',
                r.level ?? '—',
                termLabel(r.term_start, r.term_end)
              ])}
            />
            <DashTable
              title="Polls"
              count={pollsCount ?? 0}
              link="/polls"
              linkLabel="Manage"
              columns={['Title', 'Status', 'Created']}
              rows={(polls ?? []).map((r: any) => [
                r.title ?? 'Untitled',
                r.is_active ? 'Active' : 'Inactive',
                r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'
              ])}
            />
            <DashTable
              title="Quiz Questions"
              count={quizCount ?? 0}
              link="/quiz"
              linkLabel="Manage"
              columns={['Prompt', 'Position', 'Status']}
              rows={(quizQuestions ?? []).map((r: any) => [
                (r.prompt ?? 'Untitled').slice(0, 80),
                r.position ?? '—',
                r.is_active ? 'Active' : 'Inactive'
              ])}
            />
            <DashTable
              title="Notifications"
              count={notifCount ?? 0}
              link="/notifications"
              linkLabel="Manage"
              columns={['Title', 'Status', 'Published']}
              rows={(notifications ?? []).map((r: any) => [
                r.title ?? 'Untitled',
                r.is_active ? 'Active' : 'Inactive',
                r.published_at ? new Date(r.published_at).toLocaleDateString() : '—'
              ])}
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
