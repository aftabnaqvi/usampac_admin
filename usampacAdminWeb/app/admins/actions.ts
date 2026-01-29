'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertAdmin, removeAdmin } from '@/lib/appUsers';

async function findUserIdByEmail(email: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message);
  }
  const match = (data.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

export async function addAdminByEmail(emailRaw: string, inviteIfMissing: boolean) {
  const email = String(emailRaw ?? '').trim().toLowerCase();
  if (!email) {
    redirect('/admins?error=Email%20is%20required');
  }

  const admin = supabaseAdmin();
  let userId = await findUserIdByEmail(email);

  if (!userId && inviteIfMissing) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) {
      redirect(`/admins?error=${encodeURIComponent(error.message)}`);
    }
    userId = data?.user?.id ?? null;
  }

  if (!userId) {
    redirect('/admins?error=User%20not%20found%20(try%20Invite)');
  }

  const db = (admin as any).schema ? (admin as any).schema('api') : admin;
  const { error } = await upsertAdmin(db, userId);

  if (error) {
    redirect(`/admins?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admins');
  redirect('/admins?success=1');
}

export async function removeAdminById(userIdRaw: string) {
  const userId = String(userIdRaw ?? '').trim();
  if (!userId) {
    redirect('/admins?error=User%20id%20is%20required');
  }

  const admin = supabaseAdmin();
  const db = (admin as any).schema ? (admin as any).schema('api') : admin;
  const { error } = await removeAdmin(db, userId);

  if (error) {
    redirect(`/admins?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admins');
  redirect('/admins?success=removed');
}
