'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Suspense } from 'react';

function MagicSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    if (!tokenHash) {
      setMessage('Missing sign-in token.');
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClientComponentClient({ isSingleton: false });
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink'
      });
      if (cancelled) return;
      if (error) {
        setMessage(error.message || 'Sign-in link failed.');
        return;
      }
      router.replace('/dashboard');
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="loginWrap">
      <section className="loginCard">
        <h2>Admin Login</h2>
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

export default function MagicSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="loginWrap">
          <section className="loginCard">
            <h2>Admin Login</h2>
            <p className="muted">Signing you in…</p>
          </section>
        </main>
      }
    >
      <MagicSignIn />
    </Suspense>
  );
}
