'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AddAdminResult } from './actions';

type Props = {
  addAdminByEmail: (email: string, inviteIfMissing: boolean) => Promise<AddAdminResult>;
};

export default function AddAdminForm({ addAdminByEmail }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const email = String(form.email?.value ?? '').trim();
    const invite = (form as any).invite?.checked ?? false;
    try {
      const result = await addAdminByEmail(email, invite);
      if (result.ok) {
        router.push('/admins?success=1');
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {error && <p style={{ color: 'red', width: '100%', margin: '0 0 8px' }}>{error}</p>}
      <input
        name="email"
        type="email"
        required
        placeholder="admin@example.com"
        style={{ flex: 1, minWidth: 220, padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input name="invite" type="checkbox" defaultChecked />
        Invite if missing
      </label>
      <button type="submit" disabled={pending} style={{ padding: '10px 14px', borderRadius: 8 }}>
        {pending ? 'Adding…' : 'Add Admin'}
      </button>
    </form>
  );
}
