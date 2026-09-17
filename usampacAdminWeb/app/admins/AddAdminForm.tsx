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
        const successParam = result.emailSent ? 'email' : result.invitedBySupabase ? 'invite' : '1';
        router.push(`/admins?success=${successParam}`);
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
    <form onSubmit={handleSubmit} className="formInline">
      {error && <p className="flashErr" style={{ width: '100%', margin: '0 0 8px' }}>{error}</p>}
      <input
        name="email"
        type="email"
        required
        placeholder="admin@example.com"
      />
      <label className="checkRow">
        <input name="invite" type="checkbox" defaultChecked />
        Invite if missing
      </label>
      <button type="submit" className="btnPrimary" disabled={pending}>
        {pending ? 'Adding…' : 'Add Admin'}
      </button>
    </form>
  );
}
