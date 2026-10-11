import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listAdmins } from '@/lib/appUsers';

export type PendingCandidatePayload = {
  display_name?: string | null;
  email?: string | null;
  office_name?: string | null;
  office_level?: string | null;
  office_type?: string | null;
  city_name?: string | null;
  state_code?: string | null;
  cycle?: string | number | null;
};

export function adminAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (url) return url.startsWith('http') ? url : `https://${url}`;
  return 'https://usampac-admin-sigma.vercel.app';
}

export async function adminNotifyEmails(): Promise<string[]> {
  const emails = new Set(
    (process.env.ADMIN_NOTIFY_EMAIL ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  try {
    const admin = supabaseAdmin();
    const db = (admin as any).schema ? (admin as any).schema('api') : admin;
    const { data } = await listAdmins(db);
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map((users.users ?? []).map((user) => [user.id, user.email?.toLowerCase()]));
    for (const row of data ?? []) {
      const id = String((row as any).auth_sub ?? (row as any).user_id ?? (row as any).id ?? '');
      const email = String((row as any).email ?? emailById.get(id) ?? '')
        .trim()
        .toLowerCase();
      if (email) emails.add(email);
    }
  } catch (error) {
    console.error('pending-notify: could not load admin emails', error);
  }

  return [...emails];
}

function candidateLabel(candidate: PendingCandidatePayload) {
  const name = String(candidate.display_name ?? candidate.email ?? 'A candidate').trim() || 'A candidate';
  const office = [candidate.office_level ?? candidate.office_type, candidate.office_name].filter(Boolean).join(' / ');
  const place = [candidate.city_name, candidate.state_code].filter(Boolean).join(', ');
  const year = candidate.cycle != null && String(candidate.cycle).trim() ? String(candidate.cycle) : '';
  return { name, office, place, year };
}

/** Cron backup for a missed iOS/webhook call. Do not re-email the whole pending queue every day. */
export const PENDING_NOTIFY_LOOKBACK_HOURS = 26;

export function pendingCandidateFromRow(row: {
  display_name?: string | null;
  email?: string | null;
  office_name?: string | null;
  office_level?: string | null;
  office_type?: string | null;
  city_name?: string | null;
  state_code?: string | null;
  cycle?: string | number | null;
}): PendingCandidatePayload {
  return {
    display_name: row.display_name ?? null,
    email: row.email ?? null,
    office_name: row.office_name ?? null,
    office_level: row.office_level ?? null,
    office_type: row.office_type ?? null,
    city_name: row.city_name ?? null,
    state_code: row.state_code ?? null,
    cycle: row.cycle ?? null
  };
}

export function isPendingApprovalStatus(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === 'pending';
}

export function shouldNotifyPendingRow(
  row: { last_user_edit_at?: string | null; deleted_at?: string | null },
  now = new Date()
): boolean {
  if (row.deleted_at) return false;
  const edited = row.last_user_edit_at?.trim();
  if (!edited) return true;
  const at = Date.parse(edited);
  if (Number.isNaN(at)) return true;
  return now.getTime() - at <= PENDING_NOTIFY_LOOKBACK_HOURS * 60 * 60 * 1000;
}

export async function loadPendingCandidate(userId: string): Promise<PendingCandidatePayload | null> {
  const id = userId.trim();
  if (!id) return null;

  const admin = supabaseAdmin();
  const db = (admin as any).schema ? (admin as any).schema('api') : admin;
  const { data, error } = await db
    .from('candidate_profiles')
    .select('display_name,email,office_name,office_level,city_name,state_code,cycle,approval_status,deleted_at')
    .eq('user_id', id)
    .maybeSingle();

  if (error || !data || data.deleted_at || !isPendingApprovalStatus(data.approval_status)) {
    return null;
  }
  return pendingCandidateFromRow(data);
}

export async function notifyUnnotifiedPendingCandidates(): Promise<{
  checked: number;
  notified: number;
}> {
  const admin = supabaseAdmin();
  const db = (admin as any).schema ? (admin as any).schema('api') : admin;
  const { data, error } = await db
    .from('candidate_profiles_pending')
    .select('display_name,email,office_name,office_level,city_name,state_code,cycle,approval_status,deleted_at,last_user_edit_at');

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter((row: { deleted_at?: string | null; last_user_edit_at?: string | null }) =>
    shouldNotifyPendingRow(row)
  );
  let notified = 0;
  for (const row of rows) {
    await notifyAdminsOfPendingCandidate(pendingCandidateFromRow(row));
    notified += 1;
  }
  return { checked: data?.length ?? 0, notified };
}

export async function notifyAdminsOfPendingCandidate(candidate: PendingCandidatePayload) {
  const { name, office, place, year } = candidateLabel(candidate);
  const pendingUrl = `${adminAppUrl()}/pending`;
  const details = [office, place, year ? `Election Year ${year}` : ''].filter(Boolean).join(' · ');
  const subject = `USAMPAC: ${name} is pending approval`;
  const text = [
    `${name} just submitted a candidate profile and is waiting for approval.`,
    details,
    candidate.email ? `Candidate email: ${candidate.email}` : '',
    `Review: ${pendingUrl}`
  ]
    .filter(Boolean)
    .join('\n');

  const emails = await adminNotifyEmails();
  const phones = (process.env.ADMIN_NOTIFY_PHONE ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const emailSent = await sendResendEmail(emails, subject, text, pendingUrl, name, details);
  const smsSent = await sendTwilioSms(phones, `USAMPAC: ${name} is pending approval. ${pendingUrl}`);

  return {
    emails,
    phones,
    emailSent,
    smsSent
  };
}

async function sendResendEmail(
  to: string[],
  subject: string,
  text: string,
  pendingUrl: string,
  name: string,
  details: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_NOTIFY_FROM;
  if (!apiKey || !from || to.length === 0) return false;

  const html = `
    <p><strong>${escapeHtml(name)}</strong> submitted a candidate profile and is waiting for approval.</p>
    ${details ? `<p>${escapeHtml(details)}</p>` : ''}
    <p><a href="${escapeHtml(pendingUrl)}">Open pending candidates</a></p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, text, html })
  });
  if (!response.ok) {
    const body = await response.text();
    console.error('pending-notify: Resend failed', response.status, body);
    return false;
  }
  return true;
}

async function sendTwilioSms(to: string[], body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from || to.length === 0) return false;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  let sent = false;
  for (const phone of to) {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: phone, From: from, Body: body })
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('pending-notify: Twilio failed', phone, response.status, text);
    } else {
      sent = true;
    }
  }
  return sent;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
