'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GROUPS = [
  {
    label: 'Review',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/pending', label: 'Pending' },
      { href: '/approved', label: 'Approved' },
      { href: '/elected', label: 'Elected' },
      { href: '/rejected', label: 'Rejected' }
    ]
  },
  {
    label: 'Content',
    links: [
      { href: '/polls', label: 'Polls' },
      { href: '/quiz', label: 'Quiz' },
      { href: '/notifications', label: 'Notifications' }
    ]
  },
  {
    label: 'Admin',
    links: [
      { href: '/manage', label: 'Manage' },
      { href: '/admins', label: 'Admins' }
    ]
  }
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/manage') return pathname === '/manage' || pathname.startsWith('/manage/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname() || '';

  return (
    <div className="navGroups">
      {GROUPS.map((group) => (
        <div key={group.label} className="navGroup">
          <span className="navGroupLabel">{group.label}</span>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={isActive(pathname, link.href) ? 'active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
