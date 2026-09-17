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
