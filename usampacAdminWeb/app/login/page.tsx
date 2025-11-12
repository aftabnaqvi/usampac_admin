'use client';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Trim to avoid accidental spaces/newlines in env values
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
      const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
      // Debug: confirm envs are present in this build
      // (won't print secrets; only booleans)
      console.log('Supabase env present →', { url: !!url, key: !!key });
      if (!url || !key) {
        setErr('Missing Supabase environment variables');
        return;
      }
      // Basic format guard to catch bad copies before constructing client
      if (!/^https?:\/\//i.test(url)) {
        setErr('Invalid supabaseUrl: Must start with http(s)://');
        return;
      }
      const supabase = createClient(url, key);
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        console.error('signIn error', error);
        setErr(error.message || 'Sign in failed');
        return;
      }
      window.location.href = '/dashboard';
    } catch (e: any) {
      console.error('Login handler error:', e);
      setErr(e?.message || 'Unexpected error while signing in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto' }}>
      <h2>Admin Login</h2>
      <form onSubmit={onLogin} style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={e=>setPw(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10, borderRadius: 6 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}
    </main>
  );
}


