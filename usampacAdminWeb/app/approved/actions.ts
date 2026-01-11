'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function promoteCandidateToElected(userId: string, notes?: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc('promote_candidate_to_elected', {
    p_user_id: userId,
    p_notes: notes ?? null
  });

  if (error) {
    redirect(`/approved?error=${encodeURIComponent(error.message)}`);
  }

  // refresh approved list and (optional) elected list page if you add it later
  revalidatePath('/approved');
  redirect('/approved?success=1');
}

