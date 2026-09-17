import { cookies } from 'next/headers';
import { ACCESS_COOKIE, AUTH_COOKIE_OPTIONS, REFRESH_COOKIE } from '@/lib/authCookies';

export function clearAuthCookies() {
  const store = cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name === ACCESS_COOKIE || cookie.name === REFRESH_COOKIE) {
      store.set(cookie.name, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
    }
  }
}
