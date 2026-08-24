import Link from 'next/link';

export default function PublicLegalShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="headerBar">
        <div className="headerInner">
          <nav className="navLinks">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/support">Support</Link>
          </nav>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <a className="pill" href="https://usampac.org">
              usampac.org
            </a>
          </div>
        </div>
      </header>
      <main className="container" style={{ maxWidth: 760, paddingTop: 28 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>{title}</h1>
        <p className="muted" style={{ margin: '0 0 22px' }}>
          USAMPAC — American Muslim Public Affairs Committee
        </p>
        <article className="card" style={{ lineHeight: 1.65, fontSize: 15 }}>
          {children}
        </article>
      </main>
    </>
  );
}
