import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  isCronAuthorized,
  isWebhookAuthorized,
  loadPendingCandidate,
  notifyAdminsOfPendingCandidate,
  notifyUnnotifiedPendingCandidates,
  shouldNotifyWebhookBody,
  type PendingCandidatePayload
} from '@/lib/pendingNotify';

type Auth =
  | { kind: 'webhook' }
  | { kind: 'user'; userId: string };

async function authorize(request: Request): Promise<Auth | null> {
  if (isWebhookAuthorized(request.headers)) return { kind: 'webhook' };

  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user?.id) return null;
    return { kind: 'user', userId: data.user.id };
  } catch (error) {
    console.error('pending-notify: jwt verify failed', error);
    return null;
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers) && !isWebhookAuthorized(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await notifyUnnotifiedPendingCandidates();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('pending-notify poll failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Notify failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let record: PendingCandidatePayload | null = null;
  if (auth.kind === 'user') {
    record = await loadPendingCandidate(auth.userId);
    if (!record) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'not_pending' });
    }
  } else {
    if (!shouldNotifyWebhookBody(body)) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    record = (body.record ?? body.candidate ?? body) as PendingCandidatePayload;
  }

  try {
    const result = await notifyAdminsOfPendingCandidate(record);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('pending-notify failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Notify failed' }, { status: 500 });
  }
}
