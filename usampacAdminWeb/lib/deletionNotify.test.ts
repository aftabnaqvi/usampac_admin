import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deletionEmail,
  formatDeletionDate,
  needsDeletionNotice,
  notifyAdminsOfDeletion,
  notifyUnannouncedDeletionRequests,
  parseDeletionEvent
} from './deletionNotify';

type Row = Record<string, unknown>;

/** Minimal PostgREST-style fake: one table of deletion requests, one of profiles. */
function fakeAdmin(requests: Row[], profiles: Row[] = []) {
  const updates: Array<{ patch: Row; user_id: unknown }> = [];
  const tables: Record<string, Row[]> = { account_deletion_requests: requests, candidate_profiles: profiles };
  function query(name: string) {
    const rows = tables[name] ?? [];
    const filters: Array<(r: Row) => boolean> = [];
    let patch: Row | null = null;
    const builder: any = {
      select: () => builder,
      update: (values: Row) => ((patch = values), builder),
      eq: (col: string, value: unknown) => (filters.push((r) => r[col] === value), builder),
      is: (col: string, value: unknown) => (filters.push((r) => (r[col] ?? null) === value), builder),
      maybeSingle: async () => ({ data: rows.find((r) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => {
        const matched = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) {
          for (const r of matched) {
            Object.assign(r, patch);
            updates.push({ patch, user_id: r.user_id });
          }
        }
        resolve({ data: matched, error: null });
      }
    };
    return builder;
  }
  return { client: { from: query }, updates };
}

const request = {
  email: 'naqviasyed+test@gmail.com',
  requested_at: '2026-10-17T05:43:17.543Z',
  delete_after: '2026-11-16T05:43:17.543Z'
};

const candidate = {
  display_name: 'Syed Naqvi',
  email: 'naqviasyed+test@gmail.com',
  office_level: 'LOCAL',
  office_name: 'School Board',
  city_name: 'Adelanto',
  state_code: 'CA',
  cycle: 2026
};

describe('deletionNotify', () => {
  it('treats anything but "cancelled" as a new request', () => {
    assert.equal(parseDeletionEvent('cancelled'), 'cancelled');
    assert.equal(parseDeletionEvent(' Cancelled '), 'cancelled');
    assert.equal(parseDeletionEvent('requested'), 'requested');
    assert.equal(parseDeletionEvent(undefined), 'requested');
    assert.equal(parseDeletionEvent('delete'), 'requested');
  });

  it('shows the deletion date in Pacific time, matching what the app shows the candidate', () => {
    // 05:43 UTC on Nov 16 is still Nov 15 in California.
    assert.equal(formatDeletionDate('2026-11-16T05:43:17.543Z'), 'November 15, 2026');
    assert.equal(formatDeletionDate(null), 'in 30 days');
    assert.equal(formatDeletionDate('garbage'), 'in 30 days');
  });

  it('builds a request email with name, office, date, and a link to the Deletions page', () => {
    const mail = deletionEmail('requested', request, candidate, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: Syed Naqvi asked to delete their account');
    assert.match(mail.text, /deleted automatically on November 15, 2026/);
    assert.match(mail.text, /30-day waiting period/);
    assert.match(mail.text, /LOCAL \/ School Board · Adelanto, CA · Election Year 2026/);
    assert.match(mail.text, /Account email: naqviasyed\+test@gmail.com/);
    assert.match(mail.text, /https:\/\/admin\.example\/deletions/);
    assert.match(mail.html, /<a href="https:\/\/admin\.example\/deletions">/);
  });

  it('builds a restore email that says nothing will be deleted', () => {
    const mail = deletionEmail('cancelled', request, candidate, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: Syed Naqvi restored their account');
    assert.match(mail.text, /Nothing will be deleted/);
    assert.doesNotMatch(mail.text, /deleted automatically/);
  });

  it('falls back to the account email when there is no profile', () => {
    const mail = deletionEmail('requested', request, null, 'https://admin.example');
    assert.equal(mail.subject, 'USAMPAC: naqviasyed+test@gmail.com asked to delete their account');
    assert.doesNotMatch(mail.text, /Election Year/);
  });

  it('escapes candidate-controlled text in the HTML body', () => {
    const mail = deletionEmail('requested', request, { ...candidate, display_name: '<img src=x>' }, 'https://a');
    assert.doesNotMatch(mail.html, /<img/);
    assert.match(mail.html, /&lt;img src=x&gt;/);
  });

  const admins = async () => ['admin1@example.com', 'admin2@example.com'];
  function stubSender(outcome: boolean) {
    const sent: Array<{ to: string[]; subject: string }> = [];
    const send = async (to: string[], subject: string) => {
      sent.push({ to, subject });
      return outcome;
    };
    return { send, sent };
  }

  it('refuses to announce a request that is not in the state the event claims', async () => {
    const pending = { user_id: 'u1', email: 'a@example.com', status: 'pending', delete_after: request.delete_after };
    const cancelled = { user_id: 'u2', email: 'b@example.com', status: 'cancelled', delete_after: request.delete_after };
    const { client } = fakeAdmin([pending, cancelled]);
    const { send, sent } = stubSender(true);
    assert.deepEqual(await notifyAdminsOfDeletion('nobody', 'requested', client, send, admins), { sent: false, skipped: 'no_request' });
    assert.deepEqual(await notifyAdminsOfDeletion('u2', 'requested', client, send, admins), { sent: false, skipped: 'not_pending' });
    assert.deepEqual(await notifyAdminsOfDeletion('u1', 'cancelled', client, send, admins), { sent: false, skipped: 'not_cancelled' });
    assert.equal(sent.length, 0);
  });

  it('emails every admin and stamps notified_at once the email went out', async () => {
    const row = { user_id: 'u1', email: 'a@example.com', status: 'pending', delete_after: request.delete_after, notified_at: null };
    const { client, updates } = fakeAdmin([row], [{ user_id: 'u1', display_name: 'Syed Naqvi' }]);
    const { send, sent } = stubSender(true);
    const result = await notifyAdminsOfDeletion('u1', 'requested', client, send, admins);
    assert.equal(result.sent, true);
    assert.deepEqual(sent[0].to, ['admin1@example.com', 'admin2@example.com']);
    assert.equal(sent[0].subject, 'USAMPAC: Syed Naqvi asked to delete their account');
    assert.equal(updates.length, 1);
    assert.ok(row.notified_at, 'notified_at stamped');
  });

  it('does not stamp notified_at when no email went out, so the cron retries it', async () => {
    const row = { user_id: 'u1', email: 'a@example.com', status: 'pending', delete_after: request.delete_after, notified_at: null };
    const { client, updates } = fakeAdmin([row]);
    const { send } = stubSender(false);
    const result = await notifyAdminsOfDeletion('u1', 'requested', client, send, admins);
    assert.equal(result.sent, false);
    assert.equal(updates.length, 0);
    assert.equal(row.notified_at, null);
  });

  it('a restore email never touches notified_at', async () => {
    const row = { user_id: 'u1', email: 'a@example.com', status: 'cancelled', delete_after: request.delete_after, notified_at: null };
    const { client, updates } = fakeAdmin([row]);
    const { send, sent } = stubSender(true);
    const result = await notifyAdminsOfDeletion('u1', 'cancelled', client, send, admins);
    assert.equal(result.sent, true);
    assert.match(sent[0].subject, /restored their account/);
    assert.equal(updates.length, 0);
  });

  it('cron fallback emails only pending rows with no notified_at', async () => {
    const rows = [
      { user_id: 'fresh', email: 'a@example.com', status: 'pending', delete_after: request.delete_after, notified_at: null },
      { user_id: 'told', email: 'b@example.com', status: 'pending', delete_after: request.delete_after, notified_at: '2026-10-17T06:00:00Z' },
      { user_id: 'gone', email: 'c@example.com', status: 'cancelled', delete_after: request.delete_after, notified_at: null }
    ];
    const { client } = fakeAdmin(rows);
    const { send, sent } = stubSender(true);
    const result = await notifyUnannouncedDeletionRequests(client, send, admins);
    assert.equal(result.checked, 1);
    assert.equal(result.notified, 1);
    assert.equal(sent.length, 1);
    assert.ok(rows[0].notified_at);
    assert.equal(rows[2].notified_at, null);
  });

  it('cron fallback only re-sends pending requests that were never announced', () => {
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: null }), true);
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: undefined }), true);
    assert.equal(needsDeletionNotice({ status: 'pending', notified_at: '2026-10-17T06:00:00Z' }), false);
    assert.equal(needsDeletionNotice({ status: 'cancelled', notified_at: null }), false);
    assert.equal(needsDeletionNotice({ status: 'completed', notified_at: null }), false);
  });
});
