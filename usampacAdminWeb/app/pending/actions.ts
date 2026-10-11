'use server';
import { revalidatePath } from 'next/cache';
import { APPROVE_CANDIDATE_RPC, REJECT_CANDIDATE_RPC, reviewRpcArgs } from '@/lib/adminReview';
import { requireAdminAction } from '@/lib/requireAdmin';

export async function approveCandidate(userId: string, notes?: string) {
  const { supabase } = await requireAdminAction();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await client.rpc(APPROVE_CANDIDATE_RPC, reviewRpcArgs(userId, notes));
  if (error) throw new Error(error.message);
  revalidatePath('/pending');
}

export async function rejectCandidate(userId: string, notes?: string) {
  const { supabase } = await requireAdminAction();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await client.rpc(REJECT_CANDIDATE_RPC, reviewRpcArgs(userId, notes));
  if (error) throw new Error(error.message);
  revalidatePath('/pending');
}


