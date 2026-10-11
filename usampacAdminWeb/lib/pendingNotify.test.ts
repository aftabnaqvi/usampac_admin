import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPendingApprovalStatus,
  pendingCandidateFromRow,
  shouldNotifyPendingRow
} from './pendingNotify';

describe('pendingNotify', () => {
  it('maps a profile row without inventing office fields', () => {
    assert.deepEqual(
      pendingCandidateFromRow({
        display_name: 'Jane Doe',
        email: 'jane@example.com',
        office_name: 'Governor',
        office_level: 'STATE',
        city_name: 'Sacramento',
        state_code: 'CA',
        cycle: 2026
      }),
      {
        display_name: 'Jane Doe',
        email: 'jane@example.com',
        office_name: 'Governor',
        office_level: 'STATE',
        office_type: null,
        city_name: 'Sacramento',
        state_code: 'CA',
        cycle: 2026
      }
    );
  });

  it('treats only pending as notifyable', () => {
    assert.equal(isPendingApprovalStatus('pending'), true);
    assert.equal(isPendingApprovalStatus('PENDING'), true);
    assert.equal(isPendingApprovalStatus('approved'), false);
    assert.equal(isPendingApprovalStatus(null), false);
  });

  it('skips soft-deleted and stale pending rows on the cron backup', () => {
    const now = new Date('2026-10-11T08:00:00.000Z');
    assert.equal(shouldNotifyPendingRow({ deleted_at: '2026-10-11T07:00:00.000Z' }, now), false);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: null }, now), true);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: '2026-10-10T10:00:00.000Z' }, now), true);
    assert.equal(shouldNotifyPendingRow({ last_user_edit_at: '2026-10-09T08:00:00.000Z' }, now), false);
  });
});
