import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseEnv } from '@/lib/supabaseEnv';
import { clearAuthCookies } from '@/lib/clearAuthCookies';

export async function GET(request: Request) {
  const cookieStore = cookies();
  try {
    const { url, key } = supabaseEnv();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    });
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Still clear leftover cookies below.
  }
  clearAuthCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}
