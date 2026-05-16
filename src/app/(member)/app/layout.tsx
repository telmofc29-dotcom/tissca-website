// src/app/(member)/app/layout.tsx v1.9
//
// PURPOSE:
// - Shared layout for all /app/* member routes.
// - Provides member app shell UI (sidebar + top bar + user dropdown).
//
// CHANGES (v1.9):
// - WIRE: Bell badge now reads real unread count from
//   get_business_notification_unread_count RPC via useBusinessNotifications.
// - Bell click toggles BusinessNotificationPanel dropdown.
// - Chat badge remains from useChatUnreadCount (chat-only, no change).
// - Separation: bell = business only, chat = chat only. No cross-surface leakage.
//
// VERSION HISTORY:
// - v1.3: Switch member web shell to a light SaaS theme
// - v1.4 (2026-03-01): Hamburger user menu button + readability tweaks
// - v1.5 (2026-03-02): Use GlobalHeader dropdown (same as dashboard)
// - v1.6 (2026-03-02): tone="light" for /app header hamburger button
// - v1.7 (2026-03-25): 4-tier PlanBadge (Free/Pro/Team Starter/Team Pro)
// - v1.8 (2026-04-06): Bell + Chat badge icons in header (notification unification)
// - v1.9 (2026-04-06): Bell wired to business_notifications backend + panel

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { GlobalHeader } from '@/components/GlobalHeader';
import { useLanguage } from '@/i18n';
import { FloatingChatProvider, useFloatingChat } from '@/contexts/FloatingChatContext';
import { FloatingChatPanel } from '@/components/chat/FloatingChatPanel';
import { FloatingChatLauncher } from '@/components/chat/FloatingChatLauncher';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useBusinessNotifications } from '@/hooks/useBusinessNotifications';
import { BusinessNotificationPanel } from '@/components/BusinessNotificationPanel';
import { normalizePlanTier, formatPlanLabel, hasTissChatAccess, isPro } from '@/lib/plans';
import { isAccountantHubRoleAllowed } from '@/lib/accountant-hub-shared';

type MemberAppLayoutProps = {
  children: ReactNode;
};

const navKeys: { key: string; href: string }[] = [
  { key: 'overview', href: '/app/overview' },
  { key: 'leads', href: '/app/leads' },
  { key: 'jobs', href: '/app/jobs' },
  { key: 'quotes', href: '/app/quotes' },
  { key: 'invoices', href: '/app/invoices' },
  { key: 'history', href: '/app/history' },
  { key: 'chat', href: '/app/chat' },
  { key: 'tools', href: '/app/tools' },
  { key: 'planner', href: '/app/planner' },
  { key: 'calendar', href: '/app/calendar' },
  { key: 'tasks', href: '/app/tasks' },
  { key: 'assets', href: '/app/assets' },
  { key: 'projects', href: '/app/projects' },
  { key: 'accountant', href: '/app/accountant' },
  { key: 'settings', href: '/app/settings' },
];

/**
 * Chat header button — toggles floating panel open/closed.
 * Must be rendered inside FloatingChatProvider.
 */
function ChatHeaderButton({ chatUnread }: { chatUnread: number }) {
  const pathname = usePathname();
  const { isOpen, toggle } = useFloatingChat();
  const isOnChatPage = pathname === '/app/chat' || pathname.startsWith('/app/chat/');

  const handleClick = () => {
    if (isOnChatPage) return; // already on full chat page — no-op
    toggle(); // open/close floating panel
  };

  return (
    <button
      type="button"
      title={chatUnread > 0 ? `${chatUnread} unread message${chatUnread !== 1 ? 's' : ''}` : 'TissChat'}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
        isOpen && !isOnChatPage
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-500 hover:bg-gray-100 hover:text-slate-700'
      }`}
      onClick={handleClick}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 12c0 4.4-3.6 8-8 8-1.1 0-2.2-.2-3.2-.6L4 20l.9-4.3c-.6-1.1-.9-2.3-.9-3.7 0-4.4 3.6-8 8-8s8 3.6 8 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 12h8M8 9h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {chatUnread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
          {chatUnread > 99 ? '99+' : chatUnread}
        </span>
      )}
    </button>
  );
}

export default function MemberAppLayout({ children }: MemberAppLayoutProps) {
  const pathname = usePathname();
  const [planLabel, setPlanLabel] = useState('Free');
  const [teamTier, setTeamTier] = useState(false);
  const [showAccountant, setShowAccountant] = useState(false);
  const { t } = useLanguage();
  const chatUnread = useChatUnreadCount();
  const { unreadCount: bellUnread } = useBusinessNotifications();
  const [bellOpen, setBellOpen] = useState(false);

  const navItems = navKeys
    .filter((n) => {
      // Hide Accountant Hub nav for users without access
      if (n.key === 'accountant' && !showAccountant) return false;
      return true;
    })
    .map((n) => ({
      label: (t.member.nav as Record<string, string>)[n.key] ?? n.key,
      href: n.href,
    }));

  const current = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  const title = current?.label ?? t.member.nav.overview;

  useEffect(() => {
    const loadPlanProof = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setPlanLabel('Free');
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          setPlanLabel('Free');
          return;
        }

        const response = await fetch('/api/user/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          setPlanLabel('Free');
          return;
        }

        const json = await response.json();

        const tierCandidate =
          json?.plan_tier ??
          json?.workspace?.plan_tier ??
          json?.current_workspace?.plan_tier ??
          json?.profile?.plan_tier;

        const normalized = normalizePlanTier(tierCandidate);
        setPlanLabel(formatPlanLabel(normalized));
        setTeamTier(hasTissChatAccess(normalized));

        // Accountant Hub visibility: plan tier + workspace role
        const workspaceRole = (json?.role ?? json?.profile?.role ?? 'member').toLowerCase();
        if (isPro(normalized)) {
          setShowAccountant(isAccountantHubRoleAllowed(normalized, workspaceRole));
        } else {
          setShowAccountant(false);
        }
      } catch (error) {
        console.warn('[MemberAppLayout] Failed to prove plan tier:', error);
        setPlanLabel('Free');
      }
    };

    loadPlanProof();
  }, []);

  return (
    <FloatingChatProvider>
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:block">
          <div className="mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              TISSCA
            </p>
            <p className="text-sm text-slate-700">Member App</p>
          </div>

          <nav className="space-y-1" aria-label="Member app navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
          <header className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="text-sm text-slate-600">Everything you need in one place.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-slate-800">
                  Plan: {planLabel}
                </span>

                {/* ─── Bell icon — business/system notifications ─────────── */}
                <div className="relative">
                  <button
                    type="button"
                    title={bellUnread > 0 ? `${bellUnread} notification${bellUnread !== 1 ? 's' : ''}` : 'Business notifications'}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-gray-100 hover:text-slate-700"
                    onClick={() => setBellOpen((v) => !v)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {bellUnread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {bellUnread > 99 ? '99+' : bellUnread}
                      </span>
                    )}
                  </button>
                  {bellOpen && (
                    <BusinessNotificationPanel onClose={() => setBellOpen(false)} />
                  )}
                </div>

                {/* ─── Chat icon — TissChat unread badge + floating toggle ── */}
                <ChatHeaderButton chatUnread={chatUnread} />

                {/* Same dropdown menu as /dashboard, but with light-tone button for light headers */}
                <GlobalHeader mode="button" buttonPlacement="inline" tone="light" />
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
      <FloatingChatLauncher isTeamTier={teamTier} chatUnread={chatUnread} />
      <FloatingChatPanel />
    </div>
    </FloatingChatProvider>
  );
}