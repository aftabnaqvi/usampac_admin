import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseEnv } from '@/lib/supabaseEnv';
import { publicStorageFileUrl } from '@/lib/sharedFile';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = (params.id || '').trim();
  if (!UUID.test(id)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('shared_files')
    .select('storage_path, content_type')
    .eq('id', id)
    .maybeSingle();

  if (error || !data?.storage_path || data.storage_path === 'pending') {
    return new NextResponse('Not found', { status: 404 });
  }

  const target = publicStorageFileUrl(supabaseEnv().url, data.storage_path);
  return NextResponse.redirect(target, 302);
}
