import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_TEST_CANDIDATE_EMAIL, isHiddenTestCandidateEmail } from './hiddenTestCandidate';

describe('hiddenTestCandidate', () => {
  it('matches only the operator dummy email', () => {
    assert.equal(HIDDEN_TEST_CANDIDATE_EMAIL, 'naqviasyed+test@gmail.com');
    assert.equal(isHiddenTestCandidateEmail('naqviasyed+test@gmail.com'), true);
    assert.equal(isHiddenTestCandidateEmail('  NaqviAsyed+Test@Gmail.com  '), true);
  });

  it('does not treat other plus-addresses as hidden', () => {
    assert.equal(isHiddenTestCandidateEmail('someone+test@gmail.com'), false);
    assert.equal(isHiddenTestCandidateEmail('naqviasyed+1@gmail.com'), false);
    assert.equal(isHiddenTestCandidateEmail('naqviasyed++test@gmail.com'), false);
    assert.equal(isHiddenTestCandidateEmail('info@lodhi2026.com'), false);
    assert.equal(isHiddenTestCandidateEmail('kashifwasim4u@gmail.com'), false);
    assert.equal(isHiddenTestCandidateEmail('naqviasyed@gmail.com'), false);
    assert.equal(isHiddenTestCandidateEmail(null), false);
    assert.equal(isHiddenTestCandidateEmail(''), false);
  });
});
