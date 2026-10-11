/**
 * Never hard-delete these people (Auth / row remove).
 * Manage soft-delete only sets deleted_at and can be restored.
 */
export const PROTECTED_USER_IDS = [
  '68d5d58a-066a-4f79-a56d-c7095c335abf', // Qasim Lodhi
  'ab7ca576-1089-4c3f-acf7-19ac54f773e3', // Kashif Wasim
  '7b966ddf-a3e6-41c8-ab1d-31645ef11f0b', // naqviasyed@gmail.com
  '712b3698-adfe-4411-b3ee-770812c6c31e' // istafazaidi@yahoo.com
] as const;

export const PROTECTED_EMAILS = [
  'info@lodhi2026.com',
  'kashifwasim4u@gmail.com',
  'naqviasyed@gmail.com',
  'istafazaidi@yahoo.com'
] as const;

/** The only accounts Manage may remove. Exact emails only. */
export const REMOVABLE_DUMMY_EMAILS = [
  'naqviasyed+test@gmail.com',
  'naqviasyed+1@gmail.com',
  'naqviasyed+2@gmail.com'
] as const;

export const PROTECTED_DELETE_MESSAGE =
  'This account cannot be hard-deleted. Use Manage soft-delete (deleted_at) if you need to hide a listing.';

function normEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isProtectedPerson(userId: string | null | undefined, email?: string | null): boolean {
  const id = (userId ?? '').trim().toLowerCase();
  if (id && PROTECTED_USER_IDS.includes(id as (typeof PROTECTED_USER_IDS)[number])) {
    return true;
  }
  const mail = normEmail(email);
  return Boolean(mail) && PROTECTED_EMAILS.includes(mail as (typeof PROTECTED_EMAILS)[number]);
}

export function isRemovableDummyEmail(email: string | null | undefined): boolean {
  return REMOVABLE_DUMMY_EMAILS.includes(normEmail(email) as (typeof REMOVABLE_DUMMY_EMAILS)[number]);
}

export type DeleteCandidatePath = 'soft';

/** Manage never hard-deletes. Every candidate listing can be hidden and restored. */
export function deleteCandidatePath(
  _userId?: string | null,
  _email?: string | null
): DeleteCandidatePath {
  return 'soft';
}
