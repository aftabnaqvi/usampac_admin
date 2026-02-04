'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ConfirmButton from '@/app/manage/ConfirmButton';
import type { RemoveAdminResult } from './actions';

type Props = {
  userId: string;
  removeAdminById: (userId: string) => Promise<RemoveAdminResult>;
};

export default function RemoveAdminButton({ userId, removeAdminById }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    try {
      const result = await removeAdminById(userId);
      if (result.ok) {
        router.push('/admins?success=removed');
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err?.message ?? String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmButton
      confirmMessage="Remove admin access for this user?"
      onClick={handleRemove}
      disabled={pending}
      style={{ padding: '4px 8px', borderRadius: 6, background: '#8b1d1d', color: '#fff' }}
      title="Remove admin"
    >
      {pending ? '…' : 'Remove'}
    </ConfirmButton>
  );
}
