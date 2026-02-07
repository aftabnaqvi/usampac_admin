'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertAdmin, removeAdmin } from '@/lib/appUsers';
import { sendAdminInviteEmail } from '@/lib/emailAdmin';

export type AddAdminResult = { ok: true; emailSent: boolean } | { ok: false; error: string };
export type RemoveAdminResult = { ok: true } | { ok: false; error: string };

function getAdminAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (url) {
    return url.startsWith('http') ? url : `https://${url}`;
  }
  return 'http://localhost:3000';
}

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
    const adminAppUrl = getAdminAppUrl();
    const redirectTo = `${adminAppUrl}/auth-complete`;
    let userId = await findUserIdByEmail(email);
    let emailSent = false;

    if (!userId && inviteIfMissing) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_as_admin: true }
      });
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

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${adminAppUrl}/dashboard` }
    });
    if (!linkError && linkData?.properties?.action_link) {
      const sent = await sendAdminInviteEmail(email, linkData.properties.action_link, adminAppUrl);
      emailSent = sent;
    }

    revalidatePath('/admins');
    return { ok: true, emailSent };
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
