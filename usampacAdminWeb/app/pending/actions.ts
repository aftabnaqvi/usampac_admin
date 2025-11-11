'use server';
import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function approveCandidate(userId: string, notes?: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await client.rpc('approve_candidate', { p_user_id: userId, p_notes: notes ?? null });
  if (error) throw new Error(error.message);
  revalidatePath('/pending');
}

export async function rejectCandidate(userId: string, notes?: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;
  const { error } = await client.rpc('reject_candidate', { p_user_id: userId, p_notes: notes ?? null });
  if (error) throw new Error(error.message);
  revalidatePath('/pending');
}


