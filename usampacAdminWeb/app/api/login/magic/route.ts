import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabaseEnv';

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
  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink'
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return response;
}
