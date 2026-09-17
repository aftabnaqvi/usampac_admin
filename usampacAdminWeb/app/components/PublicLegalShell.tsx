import Link from 'next/link';

export default function PublicLegalShell({
  title,
  active,
  children
}: {
  title: string;
  active: 'privacy' | 'support';
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="headerBar">
        <div className="headerInner">
          <a className="brand" href="https://usampac.org">
            USAMPAC
          </a>
          <div className="navGroups">
            <div className="navGroup">
              <Link href="/privacy" className={active === 'privacy' ? 'active' : undefined}>
                Privacy Policy
              </Link>
              <Link href="/support" className={active === 'support' ? 'active' : undefined}>
                Support
              </Link>
            </div>
          </div>
          <div className="headerActions">
            <a className="pill" href="https://usampac.org">
              usampac.org
            </a>
          </div>
        </div>
      </header>
      <main className="container narrow">
        <header className="pageHeader">
          <div>
            <h2>{title}</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              USAMPAC — American Muslim Public Affairs Committee
            </p>
          </div>
        </header>
        <article className="card legalCard">{children}</article>
      </main>
    </>
  );
}
