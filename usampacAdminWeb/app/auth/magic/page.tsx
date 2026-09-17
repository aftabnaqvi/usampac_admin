'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function MagicSignIn() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');
  const started = useRef(false);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    if (!tokenHash) {
      setMessage('Missing sign-in token.');
      return;
    }
    if (started.current) return;
    started.current = true;

    (async () => {
      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink'
      });
      if (error) {
        setMessage(error.message || 'Sign-in link failed.');
        return;
      }
      window.location.assign('/dashboard');
    })();
  }, [searchParams]);

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
