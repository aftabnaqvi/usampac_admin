export const metadata = {
  title: 'USAMPAC Admin',
  description: 'Admin review and approval'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
        {children}
      </body>
    </html>
  );
}


