import PublicLegalShell from '../components/PublicLegalShell';

export const metadata = {
  title: 'Support — USAMPAC',
  description: 'Get help with the USAMPAC iOS app'
};

export default function SupportPage() {
  return (
    <PublicLegalShell title="App Support">
      <p>
        This page is for people using the USAMPAC iOS app — guests browsing candidates, and
        candidates or elected officials who registered in the app.
      </p>

      <h2>Common questions</h2>
      <p>
        <strong>I only want to look up candidates.</strong> Open the app and tap Continue without
        checking “Are you a political candidate?” You can browse by state, switch to Elected
        Officials, vote in polls, and take the quiz without an account.
      </p>
      <p>
        <strong>I am a candidate and do not see my listing.</strong> Profiles appear after an
        administrator approves them. Sign in, open Settings (gear), and check whether your
        profile is pending, approved, or rejected.
      </p>
      <p>
        <strong>I need to change my public email or phone.</strong> Sign in, open your profile
        Settings, and update those fields. Email and phone on an approved profile are shown
        publicly so voters can contact you. Leave phone blank if you do not want it listed.
      </p>
      <p>
        <strong>I forgot my password.</strong> Use Forgot Password on the app login screen. The
        reset email is sent to the address you registered with.
      </p>
      <p>
        <strong>Donations.</strong> The app opens USAMPAC’s donation page. It does not process
        payments itself:{' '}
        <a href="https://usampac.org/donate-us">usampac.org/donate-us</a>.
      </p>

      <h2>How to reach us</h2>
      <p>
        For app problems, listing corrections, or to ask that a profile be removed, use the
        organization site:
      </p>
      <ul>
        <li>
          <a href="https://usampac.org">usampac.org</a> — home
        </li>
        <li>
          <a href="https://usampac.org/about">usampac.org/about</a> — about USAMPAC
        </li>
      </ul>
      <p>
        Include the email you use in the app and a short description of the issue. We use that
        information only to respond to your request.
      </p>

      <h2>Privacy</h2>
      <p>
        How the app collects and uses information is explained on the{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </PublicLegalShell>
  );
}
