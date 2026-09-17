import Link from 'next/link';

export default function Home() {
  return (
    <main className="loginWrap">
      <section className="loginCard">
        <p className="muted" style={{ margin: '0 0 8px', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700 }}>
          USAMPAC
        </p>
        <h2>Admin</h2>
        <p>
          Go to{' '}
          <Link href="/pending">Pending</Link>
          {' · '}
          <Link href="/approved">Approved</Link>
          {' · '}
          <Link href="/rejected">Rejected</Link>
          {' · '}
          <Link href="/login">Login</Link>
          .
        </p>
        <p className="muted">
          Public pages for the iOS app:{' '}
          <Link href="/privacy">Privacy Policy</Link>
          {' · '}
          <Link href="/support">Support</Link>
        </p>
      </section>
    </main>
  );
}
