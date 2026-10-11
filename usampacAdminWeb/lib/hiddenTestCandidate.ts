/** The only dummy hidden from the public iOS directory. Exact email, not +test@. */
export const HIDDEN_TEST_CANDIDATE_EMAIL = 'naqviasyed+test@gmail.com';

export function isHiddenTestCandidateEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === HIDDEN_TEST_CANDIDATE_EMAIL;
}
