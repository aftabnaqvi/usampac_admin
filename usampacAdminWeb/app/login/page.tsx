'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { safeNextPath } from '@/lib/loginRedirect';

function loginErrorMessage(raw: string | undefined) {
  const message = (raw || 'Sign in failed').trim();
  const lower = message.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Supabase is still rate-limiting password sign-in from this network. Wait a few minutes, then try once.';
  }
  return message;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        setErr(loginErrorMessage(error.message));
        return;
      }
      window.location.assign(safeNextPath(searchParams.get('next')));
    } catch (e: any) {
      console.error('Login handler error:', e);
      setErr(loginErrorMessage(e?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginWrap">
      <section className="loginCard">
        <p className="muted" style={{ margin: '0 0 8px', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700 }}>
          USAMPAC
        </p>
        <h2>Admin Login</h2>
        <p className="muted" style={{ margin: 0 }}>Sign in to review candidates and manage content.</p>
        <form onSubmit={onSubmit}>
          <input
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button type="submit" className="btnPrimary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {err && <p className="flashErr">{err}</p>}
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <main className="loginWrap">
          <section className="loginCard">
            <h2>Admin Login</h2>
            <p className="muted">Loading…</p>
          </section>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
