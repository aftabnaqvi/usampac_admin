import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'USAMPAC Admin',
  description: 'Admin review and approval'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
