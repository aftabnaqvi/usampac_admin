'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PROMOTE_CANDIDATE_RPC, reviewRpcArgs } from '@/lib/adminReview';
import { requireAdminAction } from '@/lib/requireAdmin';

export async function promoteCandidateToElected(userId: string, notes?: string) {
  const { supabase } = await requireAdminAction();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc(PROMOTE_CANDIDATE_RPC, reviewRpcArgs(userId, notes));

  if (error) {
    redirect(`/approved?error=${encodeURIComponent(error.message)}`);
  }

  // refresh approved list and (optional) elected list page if you add it later
  revalidatePath('/approved');
  redirect('/approved?success=1');
}

