import { NextResponse } from 'next/server';
import { processDueAccountDeletions } from '@/lib/accountDeletion';
import { notifyUnannouncedDeletionRequests } from '@/lib/deletionNotify';
import { isCronAuthorized } from '@/lib/pendingNotify';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const admin = supabaseAdmin() as any;
    const notify = await notifyUnannouncedDeletionRequests(admin);
    const result = await processDueAccountDeletions(admin);
    return NextResponse.json({ ok: true, ...result, notify });
  } catch (error: any) {
    console.error('account-deletions cron failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Deletion run failed' }, { status: 500 });
  }
}
