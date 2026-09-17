import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/clearAuthCookies';

export async function GET(request: Request) {
  clearAuthCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}
