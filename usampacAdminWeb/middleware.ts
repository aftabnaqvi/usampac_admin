import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, decodeJwtPayload, writeAuthCookies } from '@/lib/authCookies';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access || !refresh) {
    return response;
  }

  const payload = decodeJwtPayload(access);
  const expMs = (payload?.exp ?? 0) * 1000;
  if (expMs > Date.now() + 30_000) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  try {
    const refreshRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refresh })
    });
    if (!refreshRes.ok) {
      return response;
    }
    const data = (await refreshRes.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) {
      return response;
    }
    writeAuthCookies(
      {
        set: (name, value, options) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
      { access_token: data.access_token, refresh_token: data.refresh_token }
    );
  } catch {
    // Keep existing cookies if refresh fails.
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/pending',
    '/pending/:path*',
    '/approved',
    '/approved/:path*',
    '/rejected',
    '/rejected/:path*',
    '/elected',
    '/elected/:path*',
    '/manage',
    '/manage/:path*',
    '/admins',
    '/admins/:path*',
    '/polls',
    '/polls/:path*',
    '/quiz',
    '/quiz/:path*',
    '/notifications',
    '/notifications/:path*'
  ]
};
