import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/appUsers';
import { supabaseAdminApi } from '@/lib/supabaseAdmin';
import { supabaseEnv } from '@/lib/supabaseEnv';

export async function confirmAdminRole(userId: string, accessToken: string, userClient?: any): Promise<boolean> {
  try {
    if (await isAdminUser(supabaseAdminApi(), userId)) return true;
  } catch {
    // No service role, or the admin view is unreachable this way.
  }

  if (userClient && (await isAdminUser(userClient, userId))) return true;

  try {
    const { url, key } = supabaseEnv();
    const authed = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return isAdminUser(authed, userId);
  } catch {
    return false;
  }
}
