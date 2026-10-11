import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVE_CANDIDATE_RPC,
  PROMOTE_CANDIDATE_RPC,
  REJECT_CANDIDATE_RPC,
  reviewRpcArgs
} from './adminReview';

describe('adminReview', () => {
  it('approve reject and promote use candidate_profiles.user_id', () => {
    const userId = '2769dd0e-2bc5-4e74-9336-a8fcb1970011';
    assert.equal(APPROVE_CANDIDATE_RPC, 'approve_candidate');
    assert.equal(REJECT_CANDIDATE_RPC, 'reject_candidate');
    assert.equal(PROMOTE_CANDIDATE_RPC, 'promote_candidate_to_elected');
    assert.deepEqual(reviewRpcArgs(userId), { p_user_id: userId, p_notes: null });
    assert.deepEqual(reviewRpcArgs(userId, '  looks good  '), {
      p_user_id: userId,
      p_notes: 'looks good'
    });
    assert.deepEqual(reviewRpcArgs(userId, ''), { p_user_id: userId, p_notes: null });
    assert.equal(Object.prototype.hasOwnProperty.call(reviewRpcArgs(userId), 'user_id'), false);
  });
});
