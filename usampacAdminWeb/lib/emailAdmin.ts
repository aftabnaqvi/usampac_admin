/**
 * Admin invite email — no-op when no email provider is configured.
 * Add your own implementation (e.g. Resend, SendGrid, Nodemailer) if you want to send emails.
 * Returns true if email was sent, false otherwise.
 */
export async function sendAdminInviteEmail(
  _toEmail: string,
  _magicLink: string,
  _appUrl: string
): Promise<boolean> {
  return false;
}
