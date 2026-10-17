import { ACCOUNT_DELETION_GRACE_DAYS, type DeletionRequestRow } from '@/lib/accountDeletion';
import { adminAppUrl, adminNotifyEmails, escapeHtml, sendAdminEmail } from '@/lib/pendingNotify';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type DeletionEvent = 'requested' | 'cancelled';

export type DeletionNotifyCandidate = {
  display_name?: string | null;
  email?: string | null;
  office_level?: string | null;
  office_name?: string | null;
  city_name?: string | null;
  state_code?: string | null;
  cycle?: string | number | null;
};

export function parseDeletionEvent(value: unknown): DeletionEvent {
  return String(value ?? '').trim().toLowerCase() === 'cancelled' ? 'cancelled' : 'requested';
}

export function formatDeletionDate(value: string | null | undefined, timeZone = 'America/Los_Angeles'): string {
  const at = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(at)) return `in ${ACCOUNT_DELETION_GRACE_DAYS} days`;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone }).format(new Date(at));
}

/** The daily cron emails only pending requests that never got the instant email. */
export function needsDeletionNotice(row: Pick<DeletionRequestRow, 'status' | 'notified_at'>): boolean {
  return row.status === 'pending' && !row.notified_at;
}

export function deletionEmail(
  event: DeletionEvent,
  request: Pick<DeletionRequestRow, 'email' | 'delete_after' | 'requested_at'>,
  candidate: DeletionNotifyCandidate | null,
  appUrl = adminAppUrl()
): { subject: string; text: string; html: string } {
  const name =
    String(candidate?.display_name ?? '').trim() || String(request.email ?? candidate?.email ?? 'A candidate').trim();
  const office = [candidate?.office_level, candidate?.office_name].filter(Boolean).join(' / ');
  const place = [candidate?.city_name, candidate?.state_code].filter(Boolean).join(', ');
  const year = candidate?.cycle != null && String(candidate.cycle).trim() ? `Election Year ${candidate.cycle}` : '';
  const details = [office, place, year].filter(Boolean).join(' · ');
  const email = request.email ?? candidate?.email ?? '';
  const url = `${appUrl}/deletions`;
  const due = formatDeletionDate(request.delete_after);

  if (event === 'cancelled') {
    const subject = `USAMPAC: ${name} restored their account`;
    const lead = `${name} cancelled their account deletion request. Nothing will be deleted.`;
    const text = [lead, details, email ? `Account email: ${email}` : '', `Deletions: ${url}`].filter(Boolean).join('\n');
    const html = `
      <p><strong>${escapeHtml(name)}</strong> cancelled their account deletion request. Nothing will be deleted.</p>
      ${details ? `<p>${escapeHtml(details)}</p>` : ''}
      ${email ? `<p>Account email: ${escapeHtml(email)}</p>` : ''}
      <p><a href="${escapeHtml(url)}">Open account deletions</a></p>
    `;
    return { subject, text, html };
  }

  const subject = `USAMPAC: ${name} asked to delete their account`;
  const lead = `${name} asked to delete their account from the app. It will be deleted automatically on ${due} (${ACCOUNT_DELETION_GRACE_DAYS}-day waiting period) unless they cancel.`;
  const text = [
    lead,
    details,
    email ? `Account email: ${email}` : '',
    'An approved listing is archived as election history; the login, profile, and photo are removed.',
    `Review or delete now: ${url}`
  ]
    .filter(Boolean)
    .join('\n');
  const html = `
    <p><strong>${escapeHtml(name)}</strong> asked to delete their account from the app.</p>
    <p>It will be deleted automatically on <strong>${escapeHtml(due)}</strong> (${ACCOUNT_DELETION_GRACE_DAYS}-day waiting period) unless they cancel.</p>
    ${details ? `<p>${escapeHtml(details)}</p>` : ''}
    ${email ? `<p>Account email: ${escapeHtml(email)}</p>` : ''}
    <p>An approved listing is archived as election history; the login, profile, and photo are removed.</p>
    <p><a href="${escapeHtml(url)}">Review or delete now</a></p>
  `;
  return { subject, text, html };
}

type NotifyAdmin = {
  schema?: (name: string) => any;
  from: (table: string) => any;
};

function api(admin: NotifyAdmin) {
  return typeof admin.schema === 'function' ? admin.schema('api') : admin;
}

async function loadCandidate(admin: NotifyAdmin, userId: string): Promise<DeletionNotifyCandidate | null> {
  const { data } = await api(admin)
    .from('candidate_profiles')
    .select('display_name,email,office_level,office_name,city_name,state_code,cycle')
    .eq('user_id', userId)
    .maybeSingle();
  return (data ?? null) as DeletionNotifyCandidate | null;
}

/**
 * Emails every admin about one request. For `requested` the row must be pending and
 * `notified_at` is stamped afterwards; for `cancelled` the row must be cancelled.
 */
export type AdminEmailSender = (to: string[], subject: string, text: string, html: string) => Promise<boolean>;

export async function notifyAdminsOfDeletion(
  userId: string,
  event: DeletionEvent,
  admin: NotifyAdmin = supabaseAdmin() as any,
  send: AdminEmailSender = sendAdminEmail,
  recipients: () => Promise<string[]> = adminNotifyEmails
): Promise<{ sent: boolean; skipped?: string; emails?: string[] }> {
  const { data: request, error } = await api(admin)
    .from('account_deletion_requests')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = (request ?? null) as DeletionRequestRow | null;
  if (!row) return { sent: false, skipped: 'no_request' };
  if (event === 'requested' && row.status !== 'pending') return { sent: false, skipped: 'not_pending' };
  if (event === 'cancelled' && row.status !== 'cancelled') return { sent: false, skipped: 'not_cancelled' };

  const candidate = await loadCandidate(admin, userId);
  const { subject, text, html } = deletionEmail(event, row, candidate);
  const emails = await recipients();
  const sent = await send(emails, subject, text, html);

  if (event === 'requested' && sent) {
    await api(admin)
      .from('account_deletion_requests')
      .update({ notified_at: new Date().toISOString() })
      .eq('user_id', userId);
  }
  return { sent, emails };
}

/** Cron backup: pending requests the app never managed to announce. */
export async function notifyUnannouncedDeletionRequests(
  admin: NotifyAdmin = supabaseAdmin() as any,
  send: AdminEmailSender = sendAdminEmail,
  recipients: () => Promise<string[]> = adminNotifyEmails
): Promise<{ checked: number; notified: number }> {
  const { data, error } = await api(admin)
    .from('account_deletion_requests')
    .select('user_id,status,notified_at')
    .eq('status', 'pending')
    .is('notified_at', null);
  if (error) {
    // Column missing until account_deletion_notify.sql runs; never block the deletion cron on it.
    console.error('account-deletions: notify fallback skipped', error.message);
    return { checked: 0, notified: 0 };
  }
  const rows = ((data ?? []) as Pick<DeletionRequestRow, 'user_id' | 'status' | 'notified_at'>[]).filter(
    needsDeletionNotice
  );
  let notified = 0;
  for (const row of rows) {
    const result = await notifyAdminsOfDeletion(row.user_id, 'requested', admin, send, recipients);
    if (result.sent) notified += 1;
  }
  return { checked: rows.length, notified };
}
