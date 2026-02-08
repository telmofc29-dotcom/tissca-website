'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { brandConfig } from '@/config/brand';
import { useEffect } from 'react';

interface DashboardNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface DashboardShellProps {
  children: ReactNode;
  navItems: DashboardNavItem[];
  title: string;
  role: 'admin' | 'accountant' | 'staff' | 'client';
}

export function DashboardShell({
  children,
  navItems,
  title,
  role,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  // Use singleton client (no creating new instances)
  const supabase = getSupabaseClient();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        console.warn('[DashboardShell] Supabase not configured');
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) {
      console.warn('[DashboardShell] Supabase not configured');
      router.push('/login');
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow transition-all duration-200`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'hidden'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">
                {brandConfig.displayName.charAt(0)}
              </span>
            </div>
            <span className="font-semibold text-gray-900">{brandConfig.displayName}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </div>
                <span className={sidebarOpen ? '' : 'hidden'}>
                  {item.label}
                </span>
                {item.badge && sidebarOpen && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`absolute bottom-0 w-full border-t bg-white p-4 ${sidebarOpen ? '' : 'text-center'}`}>
          <div className={`mb-4 rounded-lg bg-gray-100 p-3 ${!sidebarOpen && 'hidden'}`}>
            <p className="text-xs font-medium text-gray-600">Logged in as</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {userEmail}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 ${
              sidebarOpen ? '' : 'justify-center'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {sidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b bg-white px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1 text-sm text-gray-600 capitalize">
                {role} Dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="rounded-lg p-2 hover:bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <button className="rounded-lg p-2 hover:bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
