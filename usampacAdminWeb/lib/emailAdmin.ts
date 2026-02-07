import { Resend } from 'resend';

/**
 * Send an email to an existing user who was granted ADMIN role.
 * Returns true if the email was sent (or attempted) and false if emailing is disabled.
 */
export async function sendAdminInviteEmail(toEmail: string, magicLink: string, appUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping admin email');
    return false;
  }

  const from = process.env.ADMIN_EMAIL_FROM || 'onboarding@resend.dev';
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to: toEmail,
      subject: 'You have been added as an admin',
      text: [
        'Hello,',
        '',
        'You have been granted admin access to the USAMPAC Admin portal.',
        '1) Verify and sign in using the secure link below:',
        magicLink,
        '',
        'If you have not registered yet, this link will also complete your account setup.',
        `After signing in, go to ${appUrl}/dashboard to start approving people.`,
        '',
        `You can always sign in later at ${appUrl}/login with the same email.`,
        '',
        'If you did not expect this email, you can ignore it.'
      ].join('\n')
    });
    return true;
  } catch (err) {
    console.error('Failed to send admin email:', err);
    return false;
  }
}
