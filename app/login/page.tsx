'use client';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) setErr(error.message);
    else window.location.href = '/dashboard';
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


