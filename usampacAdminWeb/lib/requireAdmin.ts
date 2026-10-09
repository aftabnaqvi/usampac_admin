import { getServerUser } from '@/lib/supabaseServer';
import { isAdminUser } from '@/lib/appUsers';
import { redirectToLogin } from '@/lib/loginRedirect';

export async function requireAdmin(next: string) {
  const { supabase, user } = await getServerUser();
  if (!user) redirectToLogin(next);
  const ok = await isAdminUser(supabase, user.id);
  if (!ok) redirectToLogin(next);
  return { supabase, user };
}

export async function requireAdminAction() {
  const { supabase, user } = await getServerUser();
  if (!user) {
    throw new Error('Sign in as an admin to continue.');
  }
  const ok = await isAdminUser(supabase, user.id);
  if (!ok) {
    throw new Error('This account is not an admin.');
  }
  return { supabase, user };
}
