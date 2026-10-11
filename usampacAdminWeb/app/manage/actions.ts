'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { electedRpcArgs, RESTORE_ELECTED_RPC, SOFT_DELETE_ELECTED_RPC } from '@/lib/adminReview';
import { requireAdminAction } from '@/lib/requireAdmin';
import { setCandidateDeletedAt } from '@/lib/candidateSoftDelete';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function fail(message: string): never {
  redirect(`/manage?error=${encodeURIComponent(message)}`);
}

function refreshCandidatePages() {
  revalidatePath('/manage');
  revalidatePath('/pending');
  revalidatePath('/approved');
  revalidatePath('/rejected');
  revalidatePath('/dashboard');
}

export async function deleteCandidate(userId: string) {
  await requireAdminAction();
  try {
    await setCandidateDeletedAt(supabaseAdmin(), userId, true);
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Could not soft-delete candidate.');
  }

  refreshCandidatePages();
  redirect('/manage?success=candidate');
}

export async function deleteElected(userId: string) {
  const { supabase } = await requireAdminAction();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc(SOFT_DELETE_ELECTED_RPC, electedRpcArgs(userId));

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/elected');
  revalidatePath('/dashboard');
  redirect('/manage?success=elected');
}

export async function restoreCandidate(userId: string) {
  await requireAdminAction();
  try {
    await setCandidateDeletedAt(supabaseAdmin(), userId, false);
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Could not restore candidate.');
  }

  refreshCandidatePages();
  redirect('/manage?success=restore_candidate');
}

export async function restoreElected(userId: string) {
  const { supabase } = await requireAdminAction();
  const client: any = (supabase as any).schema ? (supabase as any).schema('api') : supabase;

  const { error } = await client.rpc(RESTORE_ELECTED_RPC, electedRpcArgs(userId));

  if (error) {
    redirect(`/manage?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/manage');
  revalidatePath('/elected');
  revalidatePath('/dashboard');
  redirect('/manage?success=restore_elected');
}
