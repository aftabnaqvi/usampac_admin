import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from '@/lib/supabaseEnv';

export { supabaseEnv } from '@/lib/supabaseEnv';

export function supabaseServer() {
  const { url, key } = supabaseEnv();
  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot persist cookies; middleware does that.
        }
      }
    }
  });
}

export const getServerUser = cache(async () => {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user?.id) {
    return { supabase, user: null };
  }
  return {
    supabase,
    user: {
      id: session.user.id,
      email: session.user.email
    }
  };
});
