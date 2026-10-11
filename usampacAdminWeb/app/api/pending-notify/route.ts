import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  loadPendingCandidate,
  notifyAdminsOfPendingCandidate,
  notifyUnnotifiedPendingCandidates,
  type PendingCandidatePayload
} from '@/lib/pendingNotify';

type Auth =
  | { kind: 'webhook' }
  | { kind: 'user'; userId: string };

function webhookAuthorized(request: Request) {
  const secret = process.env.PENDING_NOTIFY_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  const headerSecret = request.headers.get('x-webhook-secret') ?? '';
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

async function authorize(request: Request): Promise<Auth | null> {
  if (webhookAuthorized(request)) return { kind: 'webhook' };

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

function shouldNotify(body: any) {
  const record = (body?.record ?? body?.candidate ?? body) as PendingCandidatePayload & {
    approval_status?: string | null;
  };
  const oldRecord = body?.old_record as { approval_status?: string | null } | undefined;
  if (String(record?.approval_status ?? '').toLowerCase() !== 'pending') return false;
  if (oldRecord && String(oldRecord.approval_status ?? '').toLowerCase() === 'pending') {
    return false;
  }
  return true;
}

function cronAuthorized(request: Request) {
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  return Boolean(cronSecret) && auth === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!cronAuthorized(request) && !webhookAuthorized(request)) {
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
    if (!shouldNotify(body)) {
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
