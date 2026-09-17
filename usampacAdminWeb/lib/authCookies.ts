export const ACCESS_COOKIE = 'usampac-at';
export const REFRESH_COOKIE = 'usampac-rt';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7
};

export function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function userFromAccessToken(token: string | undefined | null): { id: string; email?: string } | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return { id: payload.sub, email: payload.email };
}

type CookieSetter = {
  set: (name: string, value: string, options: typeof AUTH_COOKIE_OPTIONS) => void;
};

export function writeAuthCookies(
  setter: CookieSetter,
  session: { access_token: string; refresh_token: string }
) {
  setter.set(ACCESS_COOKIE, session.access_token, AUTH_COOKIE_OPTIONS);
  setter.set(REFRESH_COOKIE, session.refresh_token, AUTH_COOKIE_OPTIONS);
}

export function expireAuthCookies(setter: CookieSetter) {
  const expired = { ...AUTH_COOKIE_OPTIONS, maxAge: 0 };
  setter.set(ACCESS_COOKIE, '', expired);
  setter.set(REFRESH_COOKIE, '', expired);
}
