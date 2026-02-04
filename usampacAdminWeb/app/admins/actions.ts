'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertAdmin, removeAdmin } from '@/lib/appUsers';

export type AddAdminResult = { ok: true } | { ok: false; error: string };
export type RemoveAdminResult = { ok: true } | { ok: false; error: string };

async function findUserIdByEmail(email: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message);
  }
  const match = (data.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

export async function addAdminByEmail(emailRaw: string, inviteIfMissing: boolean): Promise<AddAdminResult> {
  const email = String(emailRaw ?? '').trim().toLowerCase();
  if (!email) {
    return { ok: false, error: 'Email is required' };
  }

  try {
    const admin = supabaseAdmin();
    let userId = await findUserIdByEmail(email);

    if (!userId && inviteIfMissing) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) {
        return { ok: false, error: 'Invite failed: ' + error.message };
      }
      userId = data?.user?.id ?? null;
    }

    if (!userId) {
      return { ok: false, error: 'User not found. Have them sign up first, then add without Invite.' };
    }

    const db = (admin as any).schema ? (admin as any).schema('api') : admin;
    const { error } = await upsertAdmin(db, userId);

    if (error) {
      return { ok: false, error: 'Set admin role failed: ' + error.message };
    }

    revalidatePath('/admins');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function removeAdminById(userIdRaw: string): Promise<RemoveAdminResult> {
  const userId = String(userIdRaw ?? '').trim();
  if (!userId) {
    return { ok: false, error: 'User id is required' };
  }

  try {
    const admin = supabaseAdmin();
    const db = (admin as any).schema ? (admin as any).schema('api') : admin;
    const { error } = await removeAdmin(db, userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath('/admins');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
