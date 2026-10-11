export const SOFT_DELETE_SQL_HINT =
  'Run sql/candidate_soft_delete.sql in Supabase first. Delete only sets deleted_at; it does not remove the row.';

export function isMissingDeletedAtColumn(message: string | null | undefined): boolean {
  const text = (message ?? '').toLowerCase();
  return (
    text.includes('deleted_at') &&
    (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))
  );
}

export function isActiveCandidateRow(row: { deleted_at?: string | null } | null | undefined): boolean {
  if (!row) return false;
  const flag = row.deleted_at;
  return flag == null || flag === '';
}

export function excludeSoftDeletedRows<T extends { deleted_at?: string | null }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((row) => isActiveCandidateRow(row));
}

export async function queryMaybeExcludingDeleted<T>(build: (excludeDeleted: boolean) => PromiseLike<{ data: T; error: { message: string } | null; count?: number | null }>): Promise<{
  data: T;
  error: { message: string } | null;
  count?: number | null;
}> {
  const filtered = await build(true);
  if (filtered.error && isMissingDeletedAtColumn(filtered.error.message)) {
    return build(false);
  }
  return filtered;
}

export async function setCandidateDeletedAt(
  admin: { from: (table: string) => any },
  userId: string,
  deleted: boolean
): Promise<void> {
  const { data, error } = await admin
    .from('candidate_profiles')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('user_id', userId)
    .select('user_id,deleted_at')
    .maybeSingle();

  if (error) {
    throw new Error(isMissingDeletedAtColumn(error.message) ? SOFT_DELETE_SQL_HINT : error.message);
  }
  if (!data) {
    throw new Error('Candidate not found.');
  }
}
