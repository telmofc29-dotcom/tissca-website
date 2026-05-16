// src/components/layout/DashboardShell.tsx v1.2
//
// CHANGES (v1.2):
// - UI overhaul only: match TISSCA premium espresso + warm glow + glass surfaces (mobile screenshots).
// - Keep all auth/proof logic unchanged (Supabase singleton, supportMode props, exit handler).
// - Replace white/blue sidebar + header with dark glass + subtle borders + gold/warm accents.
// - Keep layout structure the same (sidebar + header + content) — no refactors, minimal touch.
//
// NOTE (LOCKED):
// - No new features added.
// - No backend wiring changes.
// - Support Mode banner remains proof-based (driven by props).

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

type DashboardRole = 'admin' | 'accountant' | 'staff' | 'client';

interface SupportModeInfo {
  workspaceId: string;
  workspaceLabel?: string; // optional display label (e.g. name); if not provided we show the id
}

interface DashboardShellProps {
  children: ReactNode;
  navItems: DashboardNavItem[];
  title: string;
  role: DashboardRole;

  /**
   * Support Mode (Option B)
   * - This component does NOT try to read cookies directly (proof-based; server decides).
   * - When wiring is ready, pages/layouts can pass supportMode to show the banner.
   */
  supportMode?: SupportModeInfo | null;

  /**
   * Optional handler for "Exit Support Mode".
   * (Wired later to admin-only API route that clears the cookie.)
   */
  onExitSupportMode?: () => Promise<void> | void;
}

export function DashboardShell({
  children,
  navItems,
  title,
  role,
  supportMode = null,
  onExitSupportMode,
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
      router.push('/sign-in');
      return;
    }
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  const handleExitSupportMode = async () => {
    try {
      if (onExitSupportMode) {
        await onExitSupportMode();
      } else {
        // No assumptions: default to navigating the admin to the Support Mode section.
        // The actual cookie clear is wired via onExitSupportMode later.
        router.push('/dashboard/admin#support-mode');
      }
    } catch (e) {
      console.error('[DashboardShell] Exit Support Mode failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
          <p className="text-slate-200/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-slate-950 text-slate-100">
      {/* Ambient background (global) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute -top-40 right-[-220px] h-[520px] w-[520px] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute top-[18%] left-[-240px] h-[520px] w-[520px] rounded-full bg-orange-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),rgba(0,0,0,0))]" />
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } relative border-r border-white/10 bg-white/5 backdrop-blur shadow-[0_30px_80px_-50px_rgba(0,0,0,0.85)] transition-all duration-200`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'hidden'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-200/10">
              <span className="text-sm font-bold text-amber-100">
                {brandConfig.displayName.charAt(0)}
              </span>
            </div>
            <span className="font-semibold text-slate-100">{brandConfig.displayName}</span>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5 text-slate-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border border-amber-200/20 bg-amber-200/10 text-amber-100'
                    : 'border border-transparent text-slate-100/80 hover:border-white/10 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center">{item.icon}</div>
                <span className={sidebarOpen ? '' : 'hidden'}>{item.label}</span>

                {item.badge && sidebarOpen && (
                  <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-100/90">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div
          className={`absolute bottom-0 w-full border-t border-white/10 bg-white/5 backdrop-blur p-4 ${
            sidebarOpen ? '' : 'text-center'
          }`}
        >
          <div className={`mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 ${!sidebarOpen && 'hidden'}`}>
            <p className="text-xs font-medium text-slate-200/60">Logged in as</p>
            <p className="truncate text-sm font-semibold text-slate-100">{userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-red-200/90 hover:bg-white/10 ${
              sidebarOpen ? '' : 'justify-center'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <header className="border-b border-white/10 bg-white/5 backdrop-blur px-8 py-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h1>
              <p className="mt-1 text-sm text-slate-200/60 capitalize">{role} Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                <svg className="h-5 w-5 text-slate-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              <button className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                <svg className="h-5 w-5 text-slate-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Support Mode Banner (Option B) */}
            {supportMode ? (
              <div className="mb-6 rounded-2xl border border-amber-200/20 bg-amber-200/10 backdrop-blur px-4 py-3 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.9)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      Support Mode – Viewing as Workspace:{' '}
                      <span className="font-mono text-amber-100/90">
                        {supportMode.workspaceLabel || supportMode.workspaceId}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-amber-100/70">
                      This is a simulator view to guide users and troubleshoot. You are not becoming the user.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExitSupportMode}
                      className="rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-200/15"
                    >
                      Exit Support Mode
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}