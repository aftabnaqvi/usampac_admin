import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  APP_REVIEW_USER_ID,
  deletionSkipReason,
  isDeletionDue,
  isMissingDeletionSchema,
  pendingDeletionsByUser,
  processAccountDeletion,
  processDueAccountDeletions,
  profilePhotoPaths,
  type DeletionRequestRow
} from './accountDeletion';

const DUMMY_ID = '2769dd0e-2bc5-4e74-9336-a8fcb1970011';

function pendingRow(overrides: Partial<DeletionRequestRow> = {}): DeletionRequestRow {
  return {
    user_id: DUMMY_ID,
    email: 'naqviasyed+test@gmail.com',
    requested_at: '2026-10-01T00:00:00Z',
    delete_after: '2026-10-31T00:00:00Z',
    status: 'pending',
    ...overrides
  };
}

type Call = { op: string; args: unknown[] };

function fakeAdmin(rows: DeletionRequestRow[], opts: { rpcError?: string; authError?: string } = {}) {
  const calls: Call[] = [];
  const table = new Map(rows.map((r) => [r.user_id, { ...r }]));

  function query() {
    const filters: Array<(r: DeletionRequestRow) => boolean> = [];
    let patch: Partial<DeletionRequestRow> | null = null;
    const builder: any = {
      select: () => builder,
      limit: () => builder,
      update: (values: Partial<DeletionRequestRow>) => {
        patch = values;
        return builder;
      },
      eq: (col: keyof DeletionRequestRow, value: unknown) => {
        filters.push((r) => r[col] === value);
        return builder;
      },
      lte: (col: keyof DeletionRequestRow, value: string) => {
        filters.push((r) => String(r[col]) <= value);
        return builder;
      },
      maybeSingle: async () => ({
        data: [...table.values()].find((r) => filters.every((f) => f(r))) ?? null,
        error: null
      }),
      then: (resolve: (v: unknown) => void) => {
        const matched = [...table.values()].filter((r) => filters.every((f) => f(r)));
        if (patch) {
          for (const r of matched) Object.assign(r, patch);
          calls.push({ op: 'update', args: [patch] });
        }
        resolve({ data: matched, error: null });
      }
    };
    return builder;
  }

  const client = {
    from: (_name: string) => query(),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ op: 'rpc', args: [fn, args] });
      return { error: opts.rpcError ? { message: opts.rpcError } : null };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          calls.push({ op: 'storage.remove', args: [bucket, paths] });
          return {};
        }
      })
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          calls.push({ op: 'auth.deleteUser', args: [id] });
          return { error: opts.authError ? { message: opts.authError } : null };
        }
      }
    }
  };
  return { client, calls, table };
}

describe('accountDeletion', () => {
  it('waits thirty days before a request is due', () => {
    assert.equal(ACCOUNT_DELETION_GRACE_DAYS, 30);
    const row = pendingRow({ delete_after: '2026-10-31T00:00:00Z' });
    assert.equal(isDeletionDue(row, new Date('2026-10-30T23:59:59Z')), false);
    assert.equal(isDeletionDue(row, new Date('2026-10-31T00:00:00Z')), true);
    assert.equal(isDeletionDue({ ...row, status: 'cancelled' }, new Date('2026-12-01T00:00:00Z')), false);
    assert.equal(isDeletionDue({ ...row, delete_after: 'not a date' }), false);
  });

  it('never deletes protected people or the App Review demo account', () => {
    assert.equal(deletionSkipReason({ user_id: '68d5d58a-066a-4f79-a56d-c7095c335abf', email: null }), 'protected');
    assert.equal(deletionSkipReason({ user_id: 'x', email: 'kashifwasim4u@gmail.com' }), 'protected');
    assert.equal(deletionSkipReason({ user_id: '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b', email: null }), 'protected');
    assert.equal(deletionSkipReason({ user_id: '712b3698-adfe-4411-b3ee-770812c6c31e', email: null }), 'protected');
    assert.equal(deletionSkipReason({ user_id: APP_REVIEW_USER_ID, email: null }), 'app_review');
    assert.equal(deletionSkipReason({ user_id: 'y', email: 'NaqviAsyed+AppleReview@gmail.com' }), 'app_review');
    assert.equal(deletionSkipReason({ user_id: DUMMY_ID, email: 'naqviasyed+test@gmail.com' }), null);
  });

  it('removes the photo at the path the app uploads to', () => {
    assert.deepEqual(profilePhotoPaths(DUMMY_ID), [`${DUMMY_ID}/profile.jpg`]);
  });

  it('recognises a missing migration', () => {
    assert.equal(isMissingDeletionSchema('relation "api.account_deletion_requests" does not exist'), true);
    assert.equal(isMissingDeletionSchema('Could not find the function api.archive_and_remove_account_rows'), true);
    assert.equal(isMissingDeletionSchema('permission denied'), false);
  });

  it('archives rows, removes the photo, deletes the login, then marks the request completed', async () => {
    const { client, calls, table } = fakeAdmin([pendingRow()]);
    const outcome = await processAccountDeletion(client as any, DUMMY_ID);
    assert.deepEqual(outcome, { userId: DUMMY_ID, result: 'deleted' });
    assert.deepEqual(
      calls.map((c) => c.op),
      ['rpc', 'storage.remove', 'auth.deleteUser', 'update']
    );
    assert.deepEqual(calls[0].args, ['archive_and_remove_account_rows', { p_user_id: DUMMY_ID }]);
    const done = table.get(DUMMY_ID)!;
    assert.equal(done.status, 'completed');
    assert.equal(done.email, null);
  });

  it('does not touch a protected person even with a pending request', async () => {
    const id = 'ab7ca576-1089-4c3f-acf7-19ac54f773e3';
    const { client, calls } = fakeAdmin([pendingRow({ user_id: id, email: 'kashifwasim4u@gmail.com' })]);
    const outcome = await processAccountDeletion(client as any, id);
    assert.deepEqual(outcome, { userId: id, result: 'skipped', reason: 'protected' });
    assert.equal(calls.length, 0);
  });

  it('keeps the request pending and records the error when a step fails', async () => {
    const { client, calls, table } = fakeAdmin([pendingRow()], { rpcError: 'boom' });
    const outcome = await processAccountDeletion(client as any, DUMMY_ID);
    assert.deepEqual(outcome, { userId: DUMMY_ID, result: 'failed', error: 'boom' });
    assert.equal(calls.some((c) => c.op === 'auth.deleteUser'), false);
    assert.equal(table.get(DUMMY_ID)!.status, 'pending');
    assert.equal(table.get(DUMMY_ID)!.last_error, 'boom');
  });

  it('Manage flags only candidates with a pending request', async () => {
    const { client } = fakeAdmin([
      pendingRow({ user_id: 'p1', delete_after: '2026-11-15T00:00:00Z' }),
      pendingRow({ user_id: 'c1', status: 'cancelled' }),
      pendingRow({ user_id: 'd1', status: 'completed' })
    ]);
    const flags = await pendingDeletionsByUser(client as any);
    assert.deepEqual([...flags.entries()], [['p1', '2026-11-15T00:00:00Z']]);
  });

  it('daily run only deletes requests past their waiting period', async () => {
    const early = pendingRow({ user_id: 'early', email: 'a@example.com', delete_after: '2026-10-20T00:00:00Z' });
    const due = pendingRow({ user_id: 'due', email: 'b@example.com', delete_after: '2026-10-10T00:00:00Z' });
    const review = pendingRow({ user_id: APP_REVIEW_USER_ID, email: null, delete_after: '2026-10-01T00:00:00Z' });
    const { client, calls } = fakeAdmin([early, due, review]);
    const result = await processDueAccountDeletions(client as any, new Date('2026-10-16T00:00:00Z'));
    assert.equal(result.deleted, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.failed, 0);
    const deletedIds = calls.filter((c) => c.op === 'auth.deleteUser').map((c) => c.args[0]);
    assert.deepEqual(deletedIds, ['due']);
  });
});
