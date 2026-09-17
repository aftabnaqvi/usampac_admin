'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function loginErrorMessage(raw: string | undefined) {
  const message = (raw || 'Sign in failed').trim();
  const lower = message.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Supabase is still rate-limiting password sign-in from this network. Use the sign-in link if you have one, or wait a few minutes and try once.';
  }
  return message;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await fetch('/api/clear-auth', { method: 'POST', credentials: 'include' });
      const supabase = createClientComponentClient({ isSingleton: false });
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        setErr(loginErrorMessage(error.message));
        return;
      }
      try {
        router.replace('/dashboard');
      } catch {
        window.location.href = '/dashboard';
      }
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
