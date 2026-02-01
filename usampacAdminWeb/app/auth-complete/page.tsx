import Link from 'next/link';

export default function AuthCompletePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <section
        style={{
          maxWidth: 520,
          width: '100%',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.25)',
          background:
            'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 55%), rgba(15,23,42,0.96)',
          color: 'white'
        }}
      >
        <h1 style={{ fontSize: 26, margin: '0 0 12px' }}>Email confirmed</h1>
        <p style={{ margin: '0 0 8px', fontSize: 15, lineHeight: 1.5 }}>
          Your email address has been successfully verified for the USAMPAC application.
        </p>
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5, color: '#CBD5F5' }}>
          If you installed the USAMPAC mobile app, return to the app and log in with this email to
          continue.
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: 1.5, color: '#9CA3AF' }}>
          This website is primarily for USAMPAC administrators. Most users can safely close this
          tab after confirming their email.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              backgroundColor: '#F97316',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none'
            }}
          >
            Admin sign in
          </Link>
          <a
            href="https://usampac.org"
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.6)',
              color: '#E5E7EB',
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none'
            }}
          >
            Visit usampac.org
          </a>
        </div>
      </section>
    </main>
  );
}

