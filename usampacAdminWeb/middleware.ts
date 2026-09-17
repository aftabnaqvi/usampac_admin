import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const hasAuthCookie = req.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
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
