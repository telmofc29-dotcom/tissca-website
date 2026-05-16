// src/components/member/MemberAppShell.tsx v1.1
//
// PURPOSE:
// - Shared member app shell for /app/* routes.
// - Provides left navigation, top bar title, and user dropdown actions.
//
// CHANGES (v1.1):
// - FIX: Switch /app/* shell to light SaaS theme so text is readable (black/dark text).
// - UX: Replace "User menu" pill with a hamburger icon button (top-right).
// - Keep Support Mode proof + banner, but style it for light UI.
// - Preserve existing routing + logout behaviour (no logic refactors).

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { clearAllDraftsForUser } from '@/lib/tools/tool-types';

type MemberAppShellProps = {
  children: ReactNode;
};

type SupportModeState = {
  active: boolean;
  workspaceId: string | null;
};

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: 'Overview', href: '/app/overview' },
  { label: 'Leads', href: '/app/leads' },
  { label: 'Jobs', href: '/app/jobs' },
  { label: 'Quotes', href: '/app/quotes' },
  { label: 'Invoices', href: '/app/invoices' },
  { label: 'History', href: '/app/history' },
  { label: 'TissChat', href: '/app/chat' },
  { label: 'Tasks', href: '/app/tasks' },
  { label: 'Assets', href: '/app/assets' },
  { label: 'Settings', href: '/app/settings' },
];

const pageTitleByPath: Record<string, string> = {
  '/app/overview': 'Overview',
  '/app/leads': 'Leads',
  '/app/jobs': 'Jobs',
  '/app/quotes': 'Quotes',
  '/app/invoices': 'Invoices',
  '/app/history': 'History',
  '/app/chat': 'TissChat',
  '/app/tasks': 'Tasks',
  '/app/assets': 'Assets',
  '/app/settings': 'Settings',
};

export default function MemberAppShell({ children }: MemberAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { supportMode: ctxSupportMode, refresh } = useWorkspace();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExitingSupportMode, setIsExitingSupportMode] = useState(false);
  const [supportMode, setSupportMode] = useState<SupportModeState>({
    active: false,
    workspaceId: null,
  });

  const pageTitle = useMemo(() => {
    return pageTitleByPath[pathname] ?? 'Member App';
  }, [pathname]);

  // Derive support mode from WorkspaceContext (eliminates redundant /api/user/me call)
  useEffect(() => {
    setSupportMode({
      active: ctxSupportMode.active,
      workspaceId: ctxSupportMode.workspace_id,
    });
  }, [ctxSupportMode]);

  const handleLogOut = async () => {
    try {
      setIsLoggingOut(true);
      console.log('[MemberAppShell] logout — clearing server cookies');

      // 0) Capture current user ID BEFORE clearing session (for scoped cleanup)
      const supabase = getSupabaseClient();
      let currentUserId: string | null = null;
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        currentUserId = user?.id ?? null;
      }

      // 1) Clear server-side httpOnly cookies
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
      } catch { /* non-critical */ }

      // 2) Clear client-side Supabase session
      if (supabase) {
        await supabase.auth.signOut();
      }

      // 3) Clear scoped tool drafts for the logged-out user
      if (currentUserId) {
        clearAllDraftsForUser(currentUserId);
      }

      // 4) Single navigation — no refresh
      console.log('[MemberAppShell] logout — navigating to /sign-in');
      router.replace('/sign-in');
    } catch (error) {
      console.error('[MemberAppShell] Failed to log out:', error);
      router.replace('/sign-in');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleExitSupportMode = async () => {
    try {
      setIsExitingSupportMode(true);
      await fetch('/api/admin/support/clear-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      setSupportMode({ active: false, workspaceId: null });
      // Re-fetch workspace context (picks up cleared support cookie)
      await refresh();
    } catch (error) {
      console.error('[MemberAppShell] Failed to exit support mode:', error);
    } finally {
      setIsExitingSupportMode(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-6 lg:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] lg:flex">
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">TISSCA</p>
            <p className="text-sm text-slate-700">Member App</p>
          </div>

          <nav className="flex-1 space-y-1" aria-label="Member app navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'border border-gray-200 bg-gray-50 text-slate-900'
                      : 'border border-transparent text-slate-600 hover:border-gray-200 hover:bg-gray-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {supportMode.active && supportMode.workspaceId && (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div>
                <p className="font-semibold text-amber-900">
                  Support Mode – Viewing as Workspace: {supportMode.workspaceId}
                </p>
                <p className="mt-1 text-sm text-amber-900/80">
                  You are viewing the member experience for support and troubleshooting.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExitSupportMode}
                disabled={isExitingSupportMode}
                className="shrink-0 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-60"
              >
                {isExitingSupportMode ? 'Exiting…' : 'Exit Support Mode'}
              </button>
            </div>
          )}

          <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_22px_70px_rgba(15,23,42,0.10)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
                <p className="text-sm text-slate-600">Everything you need in one place.</p>
              </div>

              <details className="group relative">
                <summary
                  className="list-none cursor-pointer rounded-xl border border-gray-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-gray-50"
                  aria-label="Open menu"
                >
                  <span className="sr-only">Open menu</span>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </summary>

                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_26px_90px_rgba(15,23,42,0.18)]">
                  <div className="p-2">
                    <Link
                      href="/dashboard"
                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/app/settings"
                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                    >
                      Account
                    </Link>
                    <Link
                      href="/app/settings"
                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                    >
                      Settings
                    </Link>

                    <div className="my-2 h-px bg-gray-200" />

                    <button
                      type="button"
                      onClick={handleLogOut}
                      disabled={isLoggingOut}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Logging out…' : 'Log out'}
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </header>

          <section>{children}</section>
        </div>
      </div>
    </div>
  );
}