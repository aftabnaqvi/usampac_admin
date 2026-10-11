import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseEnv } from './supabaseEnv';

describe('supabaseEnv', () => {
  it('requires both public Supabase values', () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      assert.throws(() => supabaseEnv(), /NEXT_PUBLIC_SUPABASE_URL/);
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      assert.throws(() => supabaseEnv(), /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
      assert.deepEqual(supabaseEnv(), {
        url: 'https://example.supabase.co',
        key: 'anon'
      });
    } finally {
      if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (key) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
      else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });
});
