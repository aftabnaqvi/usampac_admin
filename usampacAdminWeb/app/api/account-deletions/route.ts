import { NextResponse } from 'next/server';
import { processDueAccountDeletions } from '@/lib/accountDeletion';
import { isCronAuthorized } from '@/lib/pendingNotify';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processDueAccountDeletions(supabaseAdmin() as any);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('account-deletions cron failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Deletion run failed' }, { status: 500 });
  }
}
