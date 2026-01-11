export const metadata = {
  title: 'USAMPAC Admin',
  description: 'Admin review and approval'
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}


