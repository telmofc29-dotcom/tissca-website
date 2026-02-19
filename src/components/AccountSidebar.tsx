'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  {
    label: 'Overview',
    href: '/account',
    icon: '📊',
  },
  {
    label: 'Invoices',
    href: '/account/invoices',
    icon: '📄',
  },
  {
    label: 'Quotes',
    href: '/account/quotes',
    icon: '📋',
  },
  {
    label: 'Statements',
    href: '/account/statements',
    icon: '📈',
  },
  {
    label: 'Profile',
    href: '/account/profile',
    icon: '👤',
  },
  {
    label: 'Settings',
    href: '/account/settings',
    icon: '⚙️',
  },
];

export function AccountSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/account') {
      return pathname === '/account';
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
      <nav className="p-6 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-blue-50 text-primary font-medium border-l-2 border-primary'
                : 'text-secondary hover:bg-gray-50'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
