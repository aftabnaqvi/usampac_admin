'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
      const res = await fetch('/api/login/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_hash: tokenHash })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Sign-in link failed.');
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
