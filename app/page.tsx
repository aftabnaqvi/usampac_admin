import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: '80px auto' }}>
      <h2>USAMPAC Admin</h2>
      <p>
        Go to{' '}
        <Link href="/pending">Pending</Link>{' '}
        | <Link href="/approved">Approved</Link>{' '}
        | <Link href="/rejected">Rejected</Link>{' '}
        | <Link href="/login">Login</Link>.
      </p>
    </main>
  );
}


