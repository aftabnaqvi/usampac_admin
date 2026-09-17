import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const hasAuthCookie = req.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    return res;
  }

  const originalAuthCookies = req.cookies.getAll().filter((cookie) => cookie.name.startsWith('sb-'));
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      for (const cookie of originalAuthCookies) {
        res.cookies.set(cookie.name, cookie.value);
      }
    }
  } catch {
    // Keep existing cookies if refresh fails (rate limit, network, etc.).
  }
  return res;
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
