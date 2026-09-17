import { NextResponse } from 'next/server';
import { notifyAdminsOfPendingCandidate, type PendingCandidatePayload } from '@/lib/pendingNotify';

function isAuthorized(request: Request) {
  const secret = process.env.PENDING_NOTIFY_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  const headerSecret = request.headers.get('x-webhook-secret') ?? '';
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

function shouldNotify(body: any) {
  const record = (body?.record ?? body?.candidate ?? body) as PendingCandidatePayload & {
    approval_status?: string | null;
  };
  const oldRecord = body?.old_record as { approval_status?: string | null } | undefined;
  if (String(record?.approval_status ?? '').toLowerCase() !== 'pending') return false;
  if (oldRecord && String(oldRecord.approval_status ?? '').toLowerCase() === 'pending') return false;
  return true;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!shouldNotify(body)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const record = (body.record ?? body.candidate ?? body) as PendingCandidatePayload;
  try {
    const result = await notifyAdminsOfPendingCandidate(record);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('pending-notify failed', error);
    return NextResponse.json({ ok: false, error: error?.message ?? 'Notify failed' }, { status: 500 });
  }
}
