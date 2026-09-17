import { redirect } from 'next/navigation';

const ALLOWED_PREFIXES = [
  '/dashboard',
  '/pending',
  '/approved',
  '/rejected',
  '/elected',
  '/manage',
  '/admins',
  '/polls',
  '/quiz',
  '/notifications'
];

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/dashboard';
  const path = next.split('?')[0];
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard';
  if (ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return path;
  }
  return '/dashboard';
}

export function redirectToLogin(next: string): never {
  redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
}
