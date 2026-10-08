import { redirect } from 'next/navigation';
import { safeNextPath } from './safeNextPath';

export { safeNextPath };

export function redirectToLogin(next: string): never {
  redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
}
