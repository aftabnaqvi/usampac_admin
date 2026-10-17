import AdminHeader from '@/app/components/AdminHeader';
import ListSearch from '@/app/components/ListSearch';
import ConfirmButton from '@/app/manage/ConfirmButton';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_DELETION_SQL_HINT,
  deletionSkipReason,
  isDeletionDue,
  isMissingDeletionSchema,
  skipReasonLabel,
  type DeletionRequestRow
} from '@/lib/accountDeletion';
import { listSearchQuery, matchesListQuery } from '@/lib/listSearch';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdminApi } from '@/lib/supabaseAdmin';
import { cancelDeletionRequest, deleteAccountNow } from './actions';

type ArchiveRow = {
  id: string;
  display_name: string | null;
  party: string | null;
  office_level: string | null;
  office_name: string | null;
  state_code: string | null;
  city_name: string | null;
  cycle: string | null;
  archived_at: string;
};

function when(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default async function DeletionsPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string; q?: string };
}) {
  await requireAdmin('/deletions');
  const db = supabaseAdminApi();
  const query = listSearchQuery(searchParams?.q);

  const requestsResult = await db
    .from('account_deletion_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(1000);
  const archiveResult = await db
    .from('candidate_archive')
    .select('id,display_name,party,office_level,office_name,state_code,city_name,cycle,archived_at')
    .order('archived_at', { ascending: false })
    .limit(1000);

  const schemaMissing =
    isMissingDeletionSchema(requestsResult.error?.message) || isMissingDeletionSchema(archiveResult.error?.message);
  const requests = ((requestsResult.data ?? []) as DeletionRequestRow[]).filter((r) =>
    matchesListQuery({ email: r.email }, query)
  );
  const pending = requests.filter((r) => r.status === 'pending');
  const history = requests.filter((r) => r.status !== 'pending');
  const archive = ((archiveResult.data ?? []) as ArchiveRow[]).filter((a) => matchesListQuery(a, query));

  return (
    <>
      <AdminHeader />
      <main className="container">
        <header className="pageHeader">
          <div>
            <h2>Account Deletions</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Candidates request deletion in the app (Settings → Delete Account). Each request waits{' '}
              {ACCOUNT_DELETION_GRACE_DAYS} days, then a daily job deletes the login and profile. Approved
              listings are kept below as archived history.
            </p>
          </div>
        </header>

        {searchParams?.success === 'deleted' && <p className="flashOk">Account deleted. The listing was archived.</p>}
        {searchParams?.success === 'cancelled' && <p className="flashOk">Deletion request cancelled.</p>}
        {searchParams?.error && <p className="flashErr">Action failed: {searchParams.error}</p>}
        {schemaMissing && <p className="flashErr">{ACCOUNT_DELETION_SQL_HINT}</p>}
        {!schemaMissing && requestsResult.error && <p className="flashErr">{requestsResult.error.message}</p>}

        <ListSearch action="/deletions" query={query} placeholder="Search by email, name, or office" />

        <section className="sectionBlock" style={{ marginTop: 18 }}>
          <h3>Pending requests</h3>
          {pending.length === 0 && <p>No pending deletion requests.</p>}
          {pending.map((r) => {
            const skip = deletionSkipReason(r);
            return (
              <article key={r.user_id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{r.email ?? r.user_id}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      Requested {when(r.requested_at)} · Deletes {when(r.delete_after)}
                      {isDeletionDue(r) ? ' (due now)' : ''}
                    </div>
                    {skip && <div className="muted" style={{ marginTop: 4 }}>{skipReasonLabel(skip)}</div>}
                    {r.last_error && <div className="flashErr" style={{ marginTop: 6 }}>Last attempt: {r.last_error}</div>}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {!skip && (
                      <form
                        action={async () => {
                          'use server';
                          await deleteAccountNow(r.user_id);
                        }}
                      >
                        <ConfirmButton
                          type="submit"
                          confirmMessage="Delete this account now? The login, profile, and photo are removed permanently. An approved listing is kept in the archive."
                          className="btnDanger"
                        >
                          Delete now
                        </ConfirmButton>
                      </form>
                    )}
                    <form
                      action={async () => {
                        'use server';
                        await cancelDeletionRequest(r.user_id);
                      }}
                    >
                      <button type="submit">
                        Cancel request
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="sectionBlock">
          <h3>Archived listings</h3>
          {archive.length === 0 && <p>No archived listings yet.</p>}
          {archive.map((a) => (
            <article key={a.id} className="card">
              <strong>{a.display_name ?? 'Candidate'}</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {(a.office_level ?? '-') + ' — ' + (a.office_name ?? '-')} | {a.city_name ?? '-'}, {a.state_code ?? '-'} |
                Cycle: {a.cycle ?? '-'} | {a.party ?? '-'}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>Archived {when(a.archived_at)}</div>
            </article>
          ))}
        </section>

        <section className="sectionBlock">
          <h3>History</h3>
          {history.length === 0 && <p>No completed or cancelled requests.</p>}
          {history.map((r) => (
            <article key={r.user_id} className="card">
              <strong>{r.email ?? 'Deleted account'}</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {r.status === 'completed' ? `Deleted ${when(r.completed_at)}` : `Cancelled ${when(r.cancelled_at)}`} ·
                Requested {when(r.requested_at)}
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
