import { NextResponse } from 'next/server';
import { AUTH_COOKIE_OPTIONS, expireAuthCookies } from '@/lib/authCookies';

function expireAllAuthCookies(request: Request, response: NextResponse) {
  expireAuthCookies({
    set: (name, value, options) => response.cookies.set(name, value, options)
  });
  for (const cookieName of request.headers.get('cookie')?.split(';').map((part) => part.trim().split('=')[0]) ?? []) {
    if (cookieName.startsWith('sb-')) {
      response.cookies.set(cookieName, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
    }
  }
}

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  expireAllAuthCookies(request, response);
  return response;
}

export async function GET(request: Request) {
  // Prefetch of <Link href="/logout"> must not sign the user out.
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
