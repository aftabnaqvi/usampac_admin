import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDDEN_APP_REVIEW_CANDIDATE_EMAIL,
  HIDDEN_TEST_CANDIDATE_EMAIL,
  hiddenCandidateBadge,
  hiddenCandidateKind,
  isHiddenTestCandidateEmail
} from './hiddenTestCandidate';

describe('hiddenTestCandidate', () => {
  it('matches the operator dummy and the App Review demo, case and space insensitive', () => {
    assert.equal(HIDDEN_TEST_CANDIDATE_EMAIL, 'naqviasyed+test@gmail.com');
    assert.equal(HIDDEN_APP_REVIEW_CANDIDATE_EMAIL, 'naqviasyed+applereview@gmail.com');
    assert.equal(hiddenCandidateKind('naqviasyed+test@gmail.com'), 'test');
    assert.equal(hiddenCandidateKind('  NaqviAsyed+Test@Gmail.com  '), 'test');
    assert.equal(hiddenCandidateKind('naqviasyed+applereview@gmail.com'), 'app_review');
    assert.equal(isHiddenTestCandidateEmail('naqviasyed+applereview@gmail.com'), true);
  });

  it('does not treat other plus-addresses or real people as hidden', () => {
    for (const email of [
      'someone+test@gmail.com',
      'naqviasyed+1@gmail.com',
      'naqviasyed++test@gmail.com',
      'info@lodhi2026.com',
      'kashifwasim4u@gmail.com',
      'naqviasyed@gmail.com',
      null,
      ''
    ]) {
      assert.equal(hiddenCandidateKind(email), null, String(email));
      assert.equal(isHiddenTestCandidateEmail(email), false, String(email));
    }
  });

  it('labels the two kinds differently and warns against deleting the review account', () => {
    assert.equal(hiddenCandidateBadge('test').label, 'TEST');
    assert.equal(hiddenCandidateBadge('app_review').label, 'APP REVIEW');
    assert.match(hiddenCandidateBadge('app_review').title, /Do not delete/);
    assert.match(hiddenCandidateBadge('test').title, /Hidden from the public directory/);
  });
});
