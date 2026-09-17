import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/supabaseEnv';
import { ACCESS_COOKIE, userFromAccessToken } from '@/lib/authCookies';

export { supabaseEnv } from '@/lib/supabaseEnv';

export function supabaseServer() {
  const { url, key } = supabaseEnv();
  const accessToken = cookies().get(ACCESS_COOKIE)?.value;
  return createClient(url, key, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export const getServerUser = cache(async () => {
  const supabase = supabaseServer();
  const user = userFromAccessToken(cookies().get(ACCESS_COOKIE)?.value);
  return { supabase, user };
});
