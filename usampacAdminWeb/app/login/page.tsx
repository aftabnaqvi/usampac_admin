'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Core login routine used by both submit and click
  async function doLogin() {
    setErr(null);
    setLoading(true);
    try {
      // Use auth-helpers client to sync cookies (required for server checks)
      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        setErr(error.message || 'Sign in failed');
        return;
      }
      try {
        router.replace('/dashboard');
      } catch {
        window.location.href = '/dashboard';
      }
    } catch (e: any) {
      console.error('Login handler error:', e);
      setErr(e?.message || 'Unexpected error while signing in');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin();
  }

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    await doLogin();
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h2>Admin Login</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={e=>setPw(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button type="button" onClick={onClick} disabled={loading} style={{ padding: 10, borderRadius: 6 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}
    </main>
  );
}


