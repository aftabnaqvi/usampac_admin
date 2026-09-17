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
    '/dashboard/:path*',
    '/pending/:path*',
    '/approved/:path*',
    '/rejected/:path*',
    '/elected/:path*',
    '/manage/:path*',
    '/admins/:path*',
    '/polls/:path*',
    '/quiz/:path*',
    '/notifications/:path*'
  ]
};
