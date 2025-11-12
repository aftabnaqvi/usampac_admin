import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function Logout() {
  const supabase = supabaseServer();
  // Best-effort signout; ignore error and redirect
  await supabase.auth.signOut();
  redirect('/login');
}


