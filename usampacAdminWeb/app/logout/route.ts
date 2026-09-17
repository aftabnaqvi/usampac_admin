import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/clearAuthCookies';
import { AUTH_COOKIE_OPTIONS, expireAuthCookies } from '@/lib/authCookies';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  expireAuthCookies({
    set: (name, value, options) => response.cookies.set(name, value, options)
  });
  for (const cookieName of request.headers.get('cookie')?.split(';').map((part) => part.trim().split('=')[0]) ?? []) {
    if (cookieName.startsWith('sb-')) {
      response.cookies.set(cookieName, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
    }
  }
  try {
    clearAuthCookies();
  } catch {
    // Route handler still expires cookies on the redirect response.
  }
  return response;
}
