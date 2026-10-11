/** Pending / Approved RPCs. p_user_id is candidate_profiles.user_id, not app_users.user_id. */
export const APPROVE_CANDIDATE_RPC = 'approve_candidate';
export const REJECT_CANDIDATE_RPC = 'reject_candidate';
export const PROMOTE_CANDIDATE_RPC = 'promote_candidate_to_elected';

export function reviewRpcArgs(userId: string, notes?: string): { p_user_id: string; p_notes: string | null } {
  return { p_user_id: userId, p_notes: notes?.trim() ? notes.trim() : null };
}
