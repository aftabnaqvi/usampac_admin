import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabaseEnv';
import { AUTH_COOKIE_OPTIONS, writeAuthCookies } from '@/lib/authCookies';
import { confirmAdminRole } from '@/lib/confirmAdminRole';
import { NOT_ADMIN_LOGIN_MESSAGE } from '@/lib/adminAccess';

export async function POST(request: NextRequest) {
  let body: { token_hash?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const tokenHash = String(body.token_hash ?? '').trim();
  if (!tokenHash) {
    return NextResponse.json({ error: 'Missing sign-in token' }, { status: 400 });
  }

  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink'
  });
  if (error || !data.session?.access_token || !data.session.refresh_token || !data.user?.id) {
    return NextResponse.json({ error: error?.message || 'Sign-in link failed' }, { status: 401 });
  }

  const isAdmin = await confirmAdminRole(data.user.id, data.session.access_token);
  if (!isAdmin) {
    await supabase.auth.signOut().catch(() => undefined);
    return NextResponse.json({ error: NOT_ADMIN_LOGIN_MESSAGE }, { status: 403 });
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
