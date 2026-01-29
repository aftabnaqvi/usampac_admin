'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteCandidate(userId: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc('admin_soft_delete_candidate', { p_user_id: userId });

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/pending');
  revalidatePath('/approved');
  revalidatePath('/rejected');
  revalidatePath('/dashboard');
  redirect('/manage?success=candidate');
}

export async function deleteElected(userId: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc('admin_soft_delete_elected', { p_user_id: userId });

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/elected');
  revalidatePath('/dashboard');
  redirect('/manage?success=elected');
}

export async function restoreCandidate(userId: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc('admin_restore_candidate', { p_user_id: userId });

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/pending');
  revalidatePath('/approved');
  revalidatePath('/rejected');
  revalidatePath('/dashboard');
  redirect('/manage?success=restore_candidate');
}

export async function restoreElected(userId: string) {
  const supabase = supabaseServer();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc('admin_restore_elected', { p_user_id: userId });

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/elected');
  revalidatePath('/dashboard');
  redirect('/manage?success=restore_elected');
}
