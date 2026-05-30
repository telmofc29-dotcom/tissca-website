// src/components/AdminShell.tsx v1.4
//
// PURPOSE:
// - Admin area shell (sidebar + top bar + content container).
// - Keep the website layout consistent with the app structure,
//   but with a WHITE desktop-friendly background (no heavy dark pages).
//
// CHANGES (v1.4):
// - KEEP: “Support” removed from the left sidebar navigation (Support Inbox now lives under Engineering).
// - KEEP: "/admin/support" title mapping removed (route no longer a top-level nav destination).
// - HARDEN: Fail-closed pathname handling (avoid null/undefined edge cases).
// - KEEP: Burger toggle behaviour, white surfaces, spacing, and AuthNav in top bar unchanged.
//
// NOTE:
// - Support Inbox is now accessed via Engineering Dashboard (/admin/engineering/*).
// - This keeps the admin IA clean: Engineering is the single gateway for support tooling.

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { brandConfig } from '@/config/brand';
import { AuthNav } from '@/components/AuthNav';
import { getSupabaseClient } from '@/lib/supabase';

interface AdminSidebarItem {
  label: string;
  href: string;
  icon: string;
}

const sidebarItems: AdminSidebarItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Content', href: '/admin/content', icon: '✍️' },
  { label: 'Media', href: '/admin/media', icon: '🖼️' },
  { label: 'Warehouse', href: '/admin/warehouse', icon: '📦' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'Email Intelligence', href: '/admin/email-intelligence', icon: '📧' },
  { label: 'Revenue', href: '/admin/revenue', icon: '💰' },
  { label: 'Reports', href: '/admin/reports', icon: '📄' },
  { label: 'Pricing', href: '/admin/pricing', icon: '💷' },
  { label: 'Documents', href: '/admin/docs', icon: '📚' },
  { label: 'Feedback', href: '/admin/feedback', icon: '💬' },
  { label: 'Notifications', href: '/admin/notifications', icon: '🔔' },
  // REMOVED: Support (Support Inbox lives under Engineering)
  { label: 'Engineering', href: '/admin/engineering', icon: '🛠️' },
  { label: 'Accountant', href: '/admin/accountant', icon: '🧾' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

interface AdminShellProps {
  children: React.ReactNode;
}

function getAdminTitle(pathname: string) {
  if (pathname === '/admin') return 'Admin Dashboard';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/content')) return 'Content';
  if (pathname.startsWith('/admin/media')) return 'Media';
  if (pathname.startsWith('/admin/warehouse')) return 'Warehouse';
  if (pathname.startsWith('/admin/analytics')) return 'Analytics';
  if (pathname.startsWith('/admin/email-intelligence')) return 'Email Intelligence';
  if (pathname.startsWith('/admin/revenue')) return 'Revenue';
  if (pathname.startsWith('/admin/reports')) return 'Reports';
  if (pathname.startsWith('/admin/pricing')) return 'Pricing';
  if (pathname.startsWith('/admin/docs')) return 'Documents';
  if (pathname.startsWith('/admin/feedback')) return 'Feedback';
  if (pathname.startsWith('/admin/notifications')) return 'Notifications';
  // REMOVED: /admin/support title mapping (Support now lives under /admin/engineering/*)
  if (pathname.startsWith('/admin/engineering')) return 'Engineering';
  if (pathname.startsWith('/admin/accountant')) return 'Accountant';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  return 'Admin';
}

export default function AdminShell({ children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUnread, setAdminUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        // Phase 2: poll unified admin_notifications count
        const res = await fetch('/api/admin/notifications/count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data: { count?: number } = await res.json();
        if (!cancelled) setAdminUnread(data.count ?? 0);
      } catch {
        // Non-critical — badge stays at 0
      }
    };
    loadUnread();
    // Poll every 30 seconds
    const interval = setInterval(loadUnread, 30_000);
    // Refresh when browser tab regains focus (e.g. admin switches windows then returns)
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadUnread(); };
    // Refresh immediately when the notifications page marks items as read/dismissed
    const handleCountChanged = () => loadUnread();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('admin-notif-count-changed', handleCountChanged as EventListener);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('admin-notif-count-changed', handleCountChanged as EventListener);
    };
  }, []);

  // HARDEN (fail-closed): ensure pathname is always a string before using startsWith()
  const pathname = usePathname() ?? '';

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const title = getAdminTitle(pathname);

  return (
    <div className="flex h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 ease-in-out hidden md:flex flex-col overflow-y-auto`}
      >
        {/* Brand Section */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
              {brandConfig.displayName.charAt(0)}
            </div>
            {sidebarOpen && <span className="font-bold text-lg">{brandConfig.displayName}</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href) ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <span className="flex flex-1 items-center justify-between font-medium">
                  {item.label}
                  {item.href === '/admin/notifications' && adminUnread > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {adminUnread > 9 ? '9+' : adminUnread}
                    </span>
                  )}
                </span>
              )}
              {!sidebarOpen && item.href === '/admin/notifications' && adminUnread > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-white transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '«' : '»'}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <div className="md:hidden">
        {/* Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white transform transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand Section */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
                {brandConfig.displayName.charAt(0)}
              </div>
              <span className="font-bold text-lg">{brandConfig.displayName}</span>
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-300 hover:text-white"
              aria-label="Close menu"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-6 space-y-2 overflow-y-auto h-[calc(100vh-88px)]">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href) ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className="flex flex-1 items-center justify-between font-medium">
                  {item.label}
                  {item.href === '/admin/notifications' && adminUnread > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {adminUnread > 9 ? '9+' : adminUnread}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Burger (mobile) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 hover:bg-gray-50"
                aria-label="Open menu"
                title="Menu"
              >
                ☰
              </button>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">Your performance at a glance.</p>
              </div>
            </div>

            {/* Real user dropdown (proof-based) */}
            <div className="flex items-center gap-3">
              {/* Notification bell — links to /admin/notifications */}
              <Link
                href="/admin/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title={adminUnread > 0 ? `${adminUnread} unread notification${adminUnread !== 1 ? 's' : ''}` : 'Notifications'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {adminUnread > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                    {adminUnread > 9 ? '9+' : adminUnread}
                  </span>
                )}
              </Link>
              <AuthNav />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white">
          <div className="px-6 md:px-8 py-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}