'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { processAccountDeletion, skipReasonLabel } from '@/lib/accountDeletion';
import { requireAdminAction } from '@/lib/requireAdmin';
import { supabaseAdmin, supabaseAdminApi } from '@/lib/supabaseAdmin';

export async function deleteAccountNow(userId: string) {
  await requireAdminAction();
  const outcome = await processAccountDeletion(supabaseAdmin() as any, userId);
  revalidatePath('/deletions');

  if (outcome.result === 'deleted') redirect('/deletions?success=deleted');
  if (outcome.result === 'failed') redirect(`/deletions?error=${encodeURIComponent(outcome.error)}`);
  const message =
    outcome.reason === 'not_pending' ? 'This request is no longer pending.' : skipReasonLabel(outcome.reason);
  redirect(`/deletions?error=${encodeURIComponent(message)}`);
}

export async function cancelDeletionRequest(userId: string) {
  await requireAdminAction();
  const { error } = await supabaseAdminApi()
    .from('account_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'pending');
  revalidatePath('/deletions');
  if (error) redirect(`/deletions?error=${encodeURIComponent(error.message)}`);
  redirect('/deletions?success=cancelled');
}
