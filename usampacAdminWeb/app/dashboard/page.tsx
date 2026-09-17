import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerUser } from '@/lib/supabaseServer';
import AdminHeader from '@/app/components/AdminHeader';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import ListSearch from '@/app/components/ListSearch';

function CandidatePhoto({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="thumb" />
    );
  }
  const initial = (name.trim()[0] || '?').toUpperCase();
  return <div className="avatarFallback">{initial}</div>;
}

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
  rows: ReactNode[][];
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

export default async function Dashboard({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  try {
    const { supabase, user } = await getServerUser();

    if (!user) {
      redirectToLogin('/dashboard');
    }
    try {
      const dbPublic: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
      const ok = await isAdminUser(dbPublic, user.id);
      if (!ok) redirectToLogin('/dashboard');
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
      db.from('candidate_profiles_pending').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,photo_url').limit(10),
      db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at,photo_url').eq('approval_status', 'approved').limit(10),
      db.from('candidate_profiles_admin').select('user_id,display_name,email,office_level,office_name,city_name,state_code,cycle,approved_at,reviewer_notes,photo_url').eq('approval_status', 'rejected').limit(10)
    ]);

    const electedSelect = 'id,candidate_name,office_name,level,term_start,term_end,photo_url';
    const electedPublic = await db
      .from('active_elected_public')
      .select(electedSelect, { count: 'exact' })
      .order('candidate_name', { ascending: true })
      .limit(10);

    let elected = electedPublic.data ?? [];
    let electedCount = electedPublic.count ?? 0;
    if (electedPublic.error) {
      const electedFallback = await db
        .from('active_elected')
        .select(electedSelect, { count: 'exact' })
        .order('candidate_name', { ascending: true })
        .limit(10);
      if (!electedFallback.error) {
        elected = electedFallback.data ?? [];
        electedCount = electedFallback.count ?? 0;
      } else {
        const electedNoPhoto = await db
          .from('active_elected')
          .select('id,candidate_name,office_name,level,term_start,term_end', { count: 'exact' })
          .order('candidate_name', { ascending: true })
          .limit(10);
        elected = electedNoPhoto.data ?? [];
        electedCount = electedNoPhoto.count ?? 0;
      }
    }

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
    const query = listSearchQuery(searchParams?.q);
    const qLink = (href: string) => (query ? `${href}?q=${encodeURIComponent(query)}` : href);
    const pendingRows = (pending ?? []).filter((r: any) => matchesListQuery(r, query));
    const approvedRows = (approved ?? []).filter((r: any) => matchesListQuery(r, query));
    const rejectedRows = (rejected ?? []).filter((r: any) => matchesListQuery(r, query));
    const electedRows = (elected ?? []).filter((r: any) => matchesListQuery(r, query));
    const pollRows = (polls ?? []).filter((r: any) => matchesListQuery({ display_name: r.title }, query));
    const quizRows = (quizQuestions ?? []).filter((r: any) => matchesListQuery({ display_name: r.prompt }, query));
    const notifRows = (notifications ?? []).filter((r: any) => matchesListQuery({ display_name: r.title }, query));

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
          <ListSearch action="/dashboard" query={query} placeholder="Search candidates, officials, polls, or notices" />
          <div className="dashSections">
            <DashTable
              title="Pending"
              count={pendingCount ?? 0}
              link={qLink('/pending')}
              linkLabel="View all"
              columns={['Photo', 'Name', 'Office', 'Location', 'Election Year']}
              rows={pendingRows.map((r: any) => {
                const name = candidateName(r);
                return [
                  <CandidatePhoto key={`p-${r.user_id}`} url={r.photo_url} name={name} />,
                  name,
                  `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                  location(r),
                  r.cycle ?? '—'
                ];
              })}
            />
            <DashTable
              title="Approved"
              count={approvedCount ?? 0}
              link={qLink('/approved')}
              linkLabel="View all"
              columns={['Photo', 'Name', 'Office', 'Location', 'Election Year']}
              rows={approvedRows.map((r: any) => {
                const name = candidateName(r);
                return [
                  <CandidatePhoto key={`a-${r.user_id}`} url={r.photo_url} name={name} />,
                  name,
                  `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                  location(r),
                  r.cycle ?? '—'
                ];
              })}
            />
            <DashTable
              title="Rejected"
              count={rejectedCount ?? 0}
              link={qLink('/rejected')}
              linkLabel="View all"
              columns={['Photo', 'Name', 'Office', 'Location', 'Election Year']}
              rows={rejectedRows.map((r: any) => {
                const name = candidateName(r);
                return [
                  <CandidatePhoto key={`r-${r.user_id}`} url={r.photo_url} name={name} />,
                  name,
                  `${r.office_level ?? '—'} / ${r.office_name ?? '—'}`,
                  location(r),
                  r.cycle ?? '—'
                ];
              })}
            />
            <DashTable
              title="Elected Officials"
              count={electedCount ?? 0}
              link={qLink('/elected')}
              linkLabel="Manage"
              columns={['Photo', 'Name', 'Office', 'Level', 'Term']}
              rows={electedRows.map((r: any) => {
                const name = r.candidate_name ?? 'Elected';
                return [
                  <CandidatePhoto key={`e-${r.id}`} url={r.photo_url} name={name} />,
                  name,
                  r.office_name ?? '—',
                  r.level ?? '—',
                  termLabel(r.term_start, r.term_end)
                ];
              })}
            />
            <DashTable
              title="Polls"
              count={pollsCount ?? 0}
              link="/polls"
              linkLabel="Manage"
              columns={['Title', 'Status', 'Created']}
              rows={pollRows.map((r: any) => [
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
              rows={quizRows.map((r: any) => [
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
              rows={notifRows.map((r: any) => [
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
