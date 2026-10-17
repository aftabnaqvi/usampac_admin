import { isProtectedPerson } from '@/lib/protectedPeople';

export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const ACCOUNT_DELETION_SQL_HINT =
  'Run sql/account_deletion.sql in the Supabase SQL Editor to enable account deletion requests.';
export const PROFILE_PHOTO_BUCKET = 'profiles';

/** Apple App Review signs in with this account; deleting it breaks the next review. */
export const APP_REVIEW_USER_ID = '7cfc8257-06ed-4859-a6de-ed488e78497b';
export const APP_REVIEW_EMAIL = 'naqviasyed+applereview@gmail.com';

export type DeletionRequestRow = {
  user_id: string;
  email: string | null;
  requested_at: string;
  delete_after: string;
  status: 'pending' | 'cancelled' | 'completed' | string;
  cancelled_at?: string | null;
  completed_at?: string | null;
  last_error?: string | null;
};

export type DeletionSkipReason = 'protected' | 'app_review';

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isAppReviewAccount(userId: string | null | undefined, email?: string | null): boolean {
  return norm(userId) === APP_REVIEW_USER_ID || norm(email) === APP_REVIEW_EMAIL;
}

export function deletionSkipReason(row: Pick<DeletionRequestRow, 'user_id' | 'email'>): DeletionSkipReason | null {
  if (isProtectedPerson(row.user_id, row.email)) return 'protected';
  if (isAppReviewAccount(row.user_id, row.email)) return 'app_review';
  return null;
}

export function skipReasonLabel(reason: DeletionSkipReason): string {
  return reason === 'protected'
    ? 'Protected account. It is never deleted.'
    : 'Apple App Review demo account. Not deleted automatically.';
}

export function isDeletionDue(row: Pick<DeletionRequestRow, 'status' | 'delete_after'>, now: Date = new Date()): boolean {
  if (row.status !== 'pending') return false;
  const due = Date.parse(row.delete_after);
  return Number.isFinite(due) && due <= now.getTime();
}

export function profilePhotoPaths(userId: string): string[] {
  return [`${userId}/profile.jpg`];
}

export function isMissingDeletionSchema(message: string | null | undefined): boolean {
  const text = norm(message);
  return (
    (text.includes('account_deletion_requests') || text.includes('archive_and_remove_account_rows')) &&
    (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))
  );
}

export type DeletionOutcome =
  | { userId: string; result: 'deleted' }
  | { userId: string; result: 'skipped'; reason: DeletionSkipReason | 'not_pending' }
  | { userId: string; result: 'failed'; error: string };

type AdminClient = {
  schema?: (name: string) => any;
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> } };
  auth: { admin: { deleteUser: (id: string) => Promise<{ error: { message: string } | null }> } };
};

function api(admin: AdminClient) {
  return typeof admin.schema === 'function' ? admin.schema('api') : admin;
}

async function loadRequest(admin: AdminClient, userId: string): Promise<DeletionRequestRow | null> {
  const { data, error } = await api(admin)
    .from('account_deletion_requests')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(isMissingDeletionSchema(error.message) ? ACCOUNT_DELETION_SQL_HINT : error.message);
  return (data ?? null) as DeletionRequestRow | null;
}

async function recordError(admin: AdminClient, userId: string, message: string) {
  await api(admin).from('account_deletion_requests').update({ last_error: message }).eq('user_id', userId);
}

/**
 * Archives an approved listing, removes the profile, app user row, photo, and Auth login.
 * Protected people and the App Review account are always skipped.
 */
export async function processAccountDeletion(admin: AdminClient, userId: string): Promise<DeletionOutcome> {
  const row = await loadRequest(admin, userId);
  if (!row || row.status !== 'pending') return { userId, result: 'skipped', reason: 'not_pending' };

  const skip = deletionSkipReason(row);
  if (skip) return { userId, result: 'skipped', reason: skip };

  try {
    const { error: rowsError } = await api(admin).rpc('archive_and_remove_account_rows', { p_user_id: userId });
    if (rowsError) throw new Error(rowsError.message);

    try {
      await admin.storage.from(PROFILE_PHOTO_BUCKET).remove(profilePhotoPaths(userId));
    } catch {
      // A missing photo should not block deleting the login.
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError && !/not found/i.test(authError.message)) throw new Error(authError.message);

    const { error: doneError } = await api(admin)
      .from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), email: null, last_error: null })
      .eq('user_id', userId);
    if (doneError) throw new Error(doneError.message);

    return { userId, result: 'deleted' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordError(admin, userId, message);
    return { userId, result: 'failed', error: message };
  }
}

export async function processDueAccountDeletions(admin: AdminClient, now: Date = new Date()) {
  const { data, error } = await api(admin)
    .from('account_deletion_requests')
    .select('*')
    .eq('status', 'pending')
    .lte('delete_after', now.toISOString());
  if (error) throw new Error(isMissingDeletionSchema(error.message) ? ACCOUNT_DELETION_SQL_HINT : error.message);

  const outcomes: DeletionOutcome[] = [];
  for (const row of (data ?? []) as DeletionRequestRow[]) {
    if (!isDeletionDue(row, now)) continue;
    outcomes.push(await processAccountDeletion(admin, row.user_id));
  }
  return {
    deleted: outcomes.filter((o) => o.result === 'deleted').length,
    skipped: outcomes.filter((o) => o.result === 'skipped').length,
    failed: outcomes.filter((o) => o.result === 'failed').length,
    outcomes
  };
}
