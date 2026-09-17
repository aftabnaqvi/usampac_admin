import { cookies } from 'next/headers';

export function clearAuthCookies() {
  const store = cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      store.delete(cookie.name);
    }
  }
}
