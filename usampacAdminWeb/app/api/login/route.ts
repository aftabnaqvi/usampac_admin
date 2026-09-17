import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabaseEnv';
import { AUTH_COOKIE_OPTIONS, writeAuthCookies } from '@/lib/authCookies';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token || !data.session.refresh_token) {
    return NextResponse.json({ error: error?.message || 'Sign in failed' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  writeAuthCookies(
    {
      set: (name, value, options) => {
        response.cookies.set(name, value, options);
      }
    },
    data.session
  );

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
    }
  }

  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  return response;
}
