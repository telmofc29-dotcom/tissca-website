// src/components/GlobalHeader.tsx v4.0
//
// PURPOSE:
// - Global site navigation — app-first SaaS header.
// - Can render as full header OR as hamburger-only (no header chrome).
//
// CHANGES (v4.0):
// - Integrated LanguageSwitcher in desktop + mobile menus.
// - All public nav labels now use i18n translations.
// - Improved burger icon visibility.
//
// VERSION HISTORY:
// - v1.9: Hide identity card when logged out
// - v2.0: Hamburger-only rendering mode
// - v2.1: buttonPlacement + tone + PUBLIC closed by default
// - v2.2: Subscription & Billing -> /app/settings/subscription (localised)
// - v3.0 (2026-03-25): SaaS rebrand — app-first nav, conversion CTAs
// - v4.0 (2026-03-25): i18n integration + LanguageSwitcher + burger fix

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { brandConfig } from '@/config/brand';
import { supabase, getSupabaseEnv } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { trackEvent } from '@/utils/analytics';

type MeResponse = any;

export type GlobalHeaderMode = 'header' | 'button';
export type GlobalHeaderButtonPlacement = 'fixed' | 'inline';
export type GlobalHeaderTone = 'dark' | 'light';

export function GlobalHeader({
  mode = 'header',
  buttonPlacement = 'fixed',
  tone = 'dark',
}: {
  mode?: GlobalHeaderMode;
  buttonPlacement?: GlobalHeaderButtonPlacement;
  tone?: GlobalHeaderTone;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  // Translated public nav items
  const navItems = useMemo(() => {
    return [
      { label: t.nav.features, href: '/#features' },
      { label: t.nav.pricing, href: '/#plans' },
      { label: t.nav.download, href: '/#download' },
    ];
  }, [t]);

  const memberItems = useMemo(
    () => [
      { label: t.member.nav.overview, href: '/app/overview' },
      { label: t.member.nav.leads, href: '/app/leads' },
      { label: t.member.nav.jobs, href: '/app/jobs' },
      { label: t.member.nav.quotes, href: '/app/quotes' },
      { label: t.member.nav.invoices, href: '/app/invoices' },
      { label: t.member.nav.history, href: '/app/history' },
      { label: t.member.nav.chat, href: '/app/chat' },
      { label: (t.member.nav as Record<string, string>).tools || 'Tools', href: '/app/tools' },
      { label: (t.member.nav as Record<string, string>).planner || 'Planner', href: '/app/planner' },
      { label: (t.member.nav as Record<string, string>).calendar || 'Calendar', href: '/app/calendar' },
      { label: t.member.nav.tasks, href: '/app/tasks' },
      { label: t.member.nav.assets, href: '/app/assets' },
      { label: t.member.nav.settings, href: '/app/settings' },
    ],
    [t]
  );

  const [loadingMe, setLoadingMe] = useState(true);
  const [meName, setMeName] = useState<string | null>(null);
  const [meEmail, setMeEmail] = useState<string | null>(null);

  useEffect(() => {
    const env = getSupabaseEnv();

    // If Supabase not configured, treat as logged out (proof-based fail closed)
    if (!env || !supabase) {
      setMeName(null);
      setMeEmail(null);
      setLoadingMe(false);
      return;
    }

    let cancelled = false;
    // Generation counter prevents stale fetch responses from overwriting
    // newer auth state (e.g. init returning 401 after TOKEN_REFRESHED succeeded).
    let generation = 0;

    const clearMe = () => {
      setMeName(null);
      setMeEmail(null);
    };

    const loadMeWithToken = async (token: string, gen: number) => {
      try {
        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        // If cancelled or a newer auth event has already fired, discard.
        if (cancelled || gen !== generation) return;

        if (!res.ok) {
          clearMe();
          setLoadingMe(false);
          // 401 → clear the stale session so we don't loop.
          if (res.status === 401 && supabase) {
            supabase.auth.signOut().catch(() => {});
          }
          return;
        }

        const data: MeResponse = await res.json();
        if (cancelled || gen !== generation) return;

        const nameCandidate =
          data?.profile?.fullName ||
          data?.profile?.full_name ||
          data?.profile?.name ||
          data?.user?.user_metadata?.full_name ||
          data?.user?.user_metadata?.name ||
          data?.user?.email ||
          data?.email ||
          null;

        const emailCandidate = data?.profile?.email || data?.user?.email || data?.email || null;

        setMeName(typeof nameCandidate === 'string' ? nameCandidate : null);
        setMeEmail(typeof emailCandidate === 'string' ? emailCandidate : null);
        setLoadingMe(false);
      } catch {
        if (cancelled || gen !== generation) return;
        clearMe();
        setLoadingMe(false);
      }
    };

    // Single entry point: onAuthStateChange fires INITIAL_SESSION
    // immediately on setup, then TOKEN_REFRESHED / SIGNED_OUT later.
    // This eliminates the race between a separate init() and the listener.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (cancelled) return;
      console.log('[GlobalHeader] onAuthStateChange:', _event, 'session:', Boolean(session?.access_token), 'gen:', generation);

      if (!session?.access_token) {
        clearMe();
        setLoadingMe(false);
        return;
      }

      generation += 1;
      const gen = generation;
      setLoadingMe(true);
      await loadMeWithToken(session.access_token, gen);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Outside-click detection: close <details> menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = detailsRef.current;
      if (!el || !el.open) return;
      // If click target is inside the <details>, do nothing
      if (el.contains(e.target as Node)) return;
      el.open = false;
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const isSignedIn = Boolean(meName || meEmail);

  async function handleLogout() {
    closeMenu();

    try {
      // Clear server-side httpOnly cookies first
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
      } catch { /* non-critical */ }

      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[GlobalHeader] signOut failed:', e);
    }

    router.replace('/');
  }

  // Show identity card only when confirmed signed in (not during loading)
  // This ensures the login CTA is always visible until auth is confirmed.
  const showIdentityCard = isSignedIn;

  const hamburgerSummaryClass =
    tone === 'light'
      ? 'list-none cursor-pointer rounded-lg p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors'
      : 'list-none cursor-pointer rounded-lg p-2.5 text-white hover:text-white hover:bg-white/10 transition-colors';

  const Hamburger = (
    <details ref={detailsRef} className="relative">
      <summary className={hamburgerSummaryClass} aria-label="Open menu">
        <span className="sr-only">Open menu</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </summary>

      {/* Dropdown panel */}
      <div
        className="absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b141b]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur"
        role="menu"
        aria-label="Menu"
      >
        {/* TOP: Identity card (only when loading or signed in) + Signed-out CTA */}
        <div className="px-4 pt-4 pb-3">
          {showIdentityCard && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-sm font-semibold text-white/95">{loadingMe ? 'Loading…' : meName ?? ' '}</p>
              <p className="text-xs text-white/55">{meEmail ?? ' '}</p>
            </div>
          )}

          {/* Signed-out CTA — visible only after auth loading resolves and user is not signed in */}
          {!loadingMe && !isSignedIn && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/sign-in"
                onClick={() => { trackEvent('signin_view', '/sign-in', { metadata: { ctaName: 'mobile_menu_sign_in', sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/', sourceSection: 'mobile_menu', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } }); closeMenu(); }}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/5 no-underline hover:no-underline text-center"
                role="menuitem"
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                onClick={() => { trackEvent('cta_click', '/register', { metadata: { ctaName: 'mobile_menu_get_started', sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/', sourceSection: 'mobile_menu', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } }); closeMenu(); }}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/5 no-underline hover:no-underline text-center"
                role="menuitem"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          )}


        </div>

        <div className="h-px bg-white/10" />

        {/* FOLD: PUBLIC (DEFAULT CLOSED) */}
        <details className="group">
          <summary className="list-none cursor-pointer px-4 py-3 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest text-white/45">PUBLIC</p>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                className="text-white/55 transition-transform group-open:rotate-180"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
          </summary>

          <div className="px-2 pb-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        {/* Signed-in only sections */}
        {isSignedIn && (
          <>
            <div className="h-px bg-white/10" />

            {/* FOLD: MEMBER APP (signed in only) */}
            <details className="group">
              <summary className="list-none cursor-pointer px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-widest text-white/45">MEMBER APP</p>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    className="text-white/55 transition-transform group-open:rotate-180"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </div>
              </summary>

              <div className="px-2 pb-2">
                {memberItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                    role="menuitem"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>

            <div className="h-px bg-white/10" />

            {/* FOLD: ACCOUNT (signed in only) */}
            <details className="group" open>
              <summary className="list-none cursor-pointer px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-widest text-white/45">ACCOUNT</p>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    className="text-white/55 transition-transform group-open:rotate-180"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </div>
              </summary>

              <div className="px-2 pb-2">
                <Link
                  href="/app/overview"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                  role="menuitem"
                >
                  {t.member.nav.dashboard}
                </Link>
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                  role="menuitem"
                >
                  {t.member.nav.account}
                </Link>
                <Link
                  href="/app/settings"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                  role="menuitem"
                >
                  {t.member.nav.settings}
                </Link>
                <Link
                  href="/app/settings/subscription"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline"
                  role="menuitem"
                >
                  {t.member.nav.billing}
                </Link>
              </div>
            </details>

            <div className="h-px bg-white/10" />
          </>
        )}

        {/* LOG OUT (only when signed in) + Language switcher */}
        <div className="px-2 py-2">
          {isSignedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-200 hover:text-red-100 hover:bg-red-500/10 no-underline hover:no-underline"
              role="menuitem"
            >
              {t.member.nav.logOut}
            </button>
          )}

          {/* Mobile language switcher */}
          <div className="px-1 pt-2 pb-1">
            <LanguageSwitcher tone="dark" inline />
          </div>
        </div>
      </div>
    </details>
  );

  // mode="button": render only the hamburger button (fixed or inline)
  if (mode === 'button') {
    if (buttonPlacement === 'inline') {
      return <div role="banner" aria-label="Menu">{Hamburger}</div>;
    }

    return (
      <div className="fixed top-0 right-0 z-[90] p-4" role="banner" aria-label="Menu">
        {Hamburger}
      </div>
    );
  }

  // mode="header" (default): SaaS marketing header.
  return (
    <header className="sticky top-0 z-[90] isolate border-b border-white/[0.08] bg-[#0b141b]/85 backdrop-blur" role="banner">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-8">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-white/95 hover:text-white transition-colors no-underline hover:no-underline"
          aria-label={brandConfig.displayName}
          onClick={closeMenu}
        >
          <span>{brandConfig.displayName}</span>
        </Link>

        {/* Desktop nav — product-first links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors no-underline hover:no-underline"
            >
              {item.label}
            </Link>
          ))}

          {!loadingMe && !isSignedIn && (
            <Link
              href="/sign-in"
              onClick={() => trackEvent('signin_view', '/sign-in', { metadata: { ctaName: 'navbar_sign_in', sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/', sourceSection: 'navbar', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors no-underline hover:no-underline"
            >
              {t.nav.login}
            </Link>
          )}

          <LanguageSwitcher tone="dark" />

          {!loadingMe && (
          <Link
            href={isSignedIn ? '/app/overview' : '/register'}
            onClick={() => trackEvent(isSignedIn ? 'open_app_click' : 'cta_click', isSignedIn ? '/app/overview' : '/register', { metadata: { ctaName: isSignedIn ? 'navbar_open_app' : 'navbar_get_started', sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/', sourceSection: 'navbar', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
            className="inline-flex items-center justify-center rounded-lg bg-[#cbb26b] px-4 py-2 text-sm font-semibold text-[#0b141b] hover:bg-[#b89b4a] transition-colors no-underline hover:no-underline"
          >
            {isSignedIn ? t.nav.openApp : t.nav.getStarted}
          </Link>
          )}
        </nav>

        {/* Mobile: hamburger */}
        <div className="flex md:hidden items-center gap-2">{Hamburger}</div>
      </div>
    </header>
  );
}