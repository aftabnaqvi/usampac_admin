/**
 * Operator accounts hidden from the public iOS directory by sql/hide_test_candidates.sql.
 * Exact emails only, never a +test@ wildcard. Admin pages still show them, with a badge.
 */
export const HIDDEN_TEST_CANDIDATE_EMAIL = 'naqviasyed+test@gmail.com';
export const HIDDEN_APP_REVIEW_CANDIDATE_EMAIL = 'naqviasyed+applereview@gmail.com';

export type HiddenCandidateKind = 'test' | 'app_review';

export function hiddenCandidateKind(email: string | null | undefined): HiddenCandidateKind | null {
  const value = (email ?? '').trim().toLowerCase();
  if (value === HIDDEN_TEST_CANDIDATE_EMAIL) return 'test';
  if (value === HIDDEN_APP_REVIEW_CANDIDATE_EMAIL) return 'app_review';
  return null;
}

export function isHiddenTestCandidateEmail(email: string | null | undefined): boolean {
  return hiddenCandidateKind(email) !== null;
}

export function hiddenCandidateBadge(kind: HiddenCandidateKind): { label: string; title: string } {
  return kind === 'test'
    ? { label: 'TEST', title: 'Operator test account. Hidden from the public directory.' }
    : { label: 'APP REVIEW', title: 'Apple App Review demo account. Hidden from the public directory. Do not delete.' };
}
