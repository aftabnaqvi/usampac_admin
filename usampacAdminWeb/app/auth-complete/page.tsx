import Link from 'next/link';

export default function AuthCompletePage() {
  return (
    <main className="loginWrap">
      <section className="loginCard">
        <p className="muted" style={{ margin: '0 0 8px', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700 }}>
          USAMPAC
        </p>
        <h2>Email confirmed</h2>
        <p>
          Your email address has been successfully verified for the USAMPAC application.
        </p>
        <p className="muted">
          If you installed the USAMPAC mobile app, return to the app and log in with this email to
          continue.
        </p>
        <p className="muted">
          This website is primarily for USAMPAC administrators. Most users can safely close this
          tab after confirming their email.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <Link href="/login" className="btnPrimary" style={{ textDecoration: 'none' }}>
            Admin sign in
          </Link>
          <a href="https://usampac.org" className="pill" style={{ textDecoration: 'none' }}>
            Visit usampac.org
          </a>
        </div>
      </section>
    </main>
  );
}
