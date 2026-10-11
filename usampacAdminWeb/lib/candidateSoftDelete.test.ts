import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOFT_DELETE_SQL_HINT,
  excludeSoftDeletedRows,
  isActiveCandidateRow,
  isMissingDeletedAtColumn,
  queryMaybeExcludingDeleted,
  setCandidateDeletedAt
} from './candidateSoftDelete';

describe('candidateSoftDelete', () => {
  it('treats a missing deleted_at value as still active', () => {
    assert.equal(isActiveCandidateRow({ deleted_at: null }), true);
    assert.equal(isActiveCandidateRow({ deleted_at: '' }), true);
    assert.equal(isActiveCandidateRow({}), true);
    assert.equal(isActiveCandidateRow({ deleted_at: '2026-10-11T07:00:00.000Z' }), false);
    assert.equal(isActiveCandidateRow(null), false);
    assert.deepEqual(
      excludeSoftDeletedRows([
        { user_id: 'a', deleted_at: null },
        { user_id: 'b', deleted_at: '2026-10-11T07:00:00.000Z' }
      ]).map((row) => row.user_id),
      ['a']
    );
  });

  it('detects a missing deleted_at column so Manage can show a SQL hint', () => {
    assert.equal(isMissingDeletedAtColumn('column "deleted_at" does not exist'), true);
    assert.equal(isMissingDeletedAtColumn('Could not find the deleted_at column in the schema cache'), true);
    assert.equal(isMissingDeletedAtColumn('column "user_id" does not exist'), false);
    assert.equal(SOFT_DELETE_SQL_HINT.includes('deleted_at'), true);
  });

  it('retries the query without the flag when the column is not there yet', async () => {
    const result = await queryMaybeExcludingDeleted(async (excludeDeleted) => {
      if (excludeDeleted) {
        return { data: null, error: { message: 'column "deleted_at" does not exist' } };
      }
      return { data: [{ user_id: 'a' }], error: null };
    });
    assert.equal(result.error, null);
    assert.deepEqual(result.data, [{ user_id: 'a' }]);
  });

  it('does not treat the old app_users user_id error as a missing deleted_at column', async () => {
    const result = await queryMaybeExcludingDeleted(async () => ({
      data: null,
      error: { message: 'column "user_id" does not exist' }
    }));
    assert.equal(result.error?.message, 'column "user_id" does not exist');
  });

  it('tells Manage to run SQL when deleted_at is missing', async () => {
    const admin = {
      from() {
        return {
          update() {
            return {
              eq() {
                return {
                  select() {
                    return {
                      maybeSingle: async () => ({
                        data: null,
                        error: { message: 'column "deleted_at" does not exist' }
                      })
                    };
                  }
                };
              }
            };
          },
          delete() {
            throw new Error('hard delete is not allowed');
          }
        };
      }
    };
    await assert.rejects(
      () => setCandidateDeletedAt(admin, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
      (error: unknown) => error instanceof Error && error.message === SOFT_DELETE_SQL_HINT
    );
  });

  it('refuses to hide a row that is not there', async () => {
    const admin = {
      from() {
        return {
          update() {
            return {
              eq() {
                return {
                  select() {
                    return {
                      maybeSingle: async () => ({ data: null, error: null })
                    };
                  }
                };
              }
            };
          }
        };
      }
    };
    await assert.rejects(
      () => setCandidateDeletedAt(admin, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
      /Candidate not found/
    );
  });

  it('sets and clears deleted_at and never sends a delete', async () => {
    const calls: Array<{ table: string; payload: unknown; userId: string }> = [];
    const admin = {
      from(table: string) {
        return {
          update(payload: unknown) {
            return {
              eq(_column: string, userId: string) {
                calls.push({ table, payload, userId });
                return {
                  select() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          user_id: userId,
                          deleted_at: (payload as { deleted_at: string | null }).deleted_at
                        },
                        error: null
                      })
                    };
                  }
                };
              }
            };
          }
        };
      }
    };

    await setCandidateDeletedAt(admin, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
    await setCandidateDeletedAt(admin, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].table, 'candidate_profiles');
    assert.equal(calls[0].table !== 'app_users', true);
    assert.equal(typeof (calls[0].payload as { deleted_at: string }).deleted_at, 'string');
    assert.equal((calls[1].payload as { deleted_at: string | null }).deleted_at, null);
    assert.equal(Object.prototype.hasOwnProperty.call(calls[0].payload as object, 'user_id'), false);
  });
});
