import { NextResponse } from 'next/server';
import { notifyAdminsOfDeletion, parseDeletionEvent } from '@/lib/deletionNotify';
import { isWebhookAuthorized } from '@/lib/pendingNotify';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * The iOS app calls this right after request/cancel with the candidate's own JWT,
 * so admins hear about it immediately. The daily cron re-sends anything missed.
 * Body: { "event": "requested" | "cancelled", "user_id"?: string (webhook only) }
 */
export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const event = parseDeletionEvent(body?.event);

  let userId: string | null = null;
  if (isWebhookAuthorized(request.headers)) {
    userId = String(body?.user_id ?? body?.record?.user_id ?? '').trim() || null;
  } else {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (token) {
      try {
        const { data, error } = await supabaseAdmin().auth.getUser(token);
        if (!error && data.user?.id) userId = data.user.id;
      } catch (error) {
        console.error('account-deletions/notify: jwt verify failed', error);
      }
    }
  }
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await notifyAdminsOfDeletion(userId, event);
    return NextResponse.json({ ok: true, event, ...result });
  } catch (error: any) {
    console.error('account-deletions/notify failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Notify failed' }, { status: 500 });
  }
}
