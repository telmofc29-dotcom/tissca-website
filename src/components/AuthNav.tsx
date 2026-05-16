// src/components/AuthNav.tsx v2.3
//
// CHANGES (v2.3):
// - NAV: Remove "Support Inbox" from AuthNav menus.
//   - Support Inbox lives under Engineering and should be accessed from /admin/engineering only.
//   - Keep "Engineering Dashboard" link for engineering roles.
// - Keep admin-sealed behaviour unchanged.
// - Keep proof-based logic + role gating unchanged.
// - Keep variant="menu" behaviour unchanged.
// - Ensure dropdown closes on navigation and uses onNavigate callback when provided.
//

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, getSupabaseEnv } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface UserProfile {
  fullName?: string;
  email: string;
}

type AuthPhase = 'loading' | 'loggedOut' | 'checkingServer' | 'ready';

const ENGINEERING_ROLES = new Set(['superadmin', 'engineer']);

type AuthNavProps = {
  variant?: 'dropdown' | 'menu';
  ui?: 'dark' | 'light';
  onNavigate?: () => void;

  // Optional class overrides when embedded inside GlobalHeader menu
  classNameItem?: string;
  classNameSectionLabel?: string;
  classNameDivider?: string;
};

export function AuthNav({
  variant = 'dropdown',
  ui = 'dark',
  onNavigate,
  classNameItem,
  classNameSectionLabel,
  classNameDivider,
}: AuthNavProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);
  const [staffRole, setStaffRole] = useState<string>('');

  const [supportModeActive, setSupportModeActive] = useState(false);
  const [supportWorkspaceId, setSupportWorkspaceId] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Proof gates
  const [serverSessionValid, setServerSessionValid] = useState(false);
  const [identityResolved, setIdentityResolved] = useState(false);

  // UI phase control (prevents "blank header" problem)
  const [phase, setPhase] = useState<AuthPhase>('loading');

  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdminPath = pathname?.startsWith('/admin') ?? false;

  const validateServerSession = async (token: string) => {
    try {
      const response = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      setServerSessionValid(response.ok);
      return response.ok;
    } catch (error) {
      console.error('Failed to validate server session:', error);
      setServerSessionValid(false);
      return false;
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();

        setProfile(data.profile);
        setIsPlatformStaff(Boolean(data?.is_platform_staff));

        // SINGLE SOURCE OF TRUTH (fail closed)
        setStaffRole(String(data?.staff_role ?? '').toLowerCase().trim());

        const smActive = Boolean(data?.support_mode?.active) || Boolean(data?.support_mode_enabled);
        const smWorkspace =
          (data?.support_mode?.workspace_id as string | null) ??
          (data?.support_mode_workspace_id as string | null) ??
          null;

        setSupportModeActive(smActive);
        setSupportWorkspaceId(smWorkspace);
      } else {
        // Fail closed (do not assume staff/support mode)
        setProfile(null);
        setIsPlatformStaff(false);
        setStaffRole('');
        setSupportModeActive(false);
        setSupportWorkspaceId(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setIsPlatformStaff(false);
      setStaffRole('');
      setSupportModeActive(false);
      setSupportWorkspaceId(null);
    } finally {
      setIdentityResolved(true);
    }
  };

  useEffect(() => {
    const env = getSupabaseEnv();

    // If Supabase not configured, treat as logged out (and show buttons)
    if (!env || !supabase) {
      setUser(null);
      setProfile(null);
      setIsPlatformStaff(false);
      setStaffRole('');
      setSupportModeActive(false);
      setSupportWorkspaceId(null);
      setServerSessionValid(false);
      setIdentityResolved(true);
      setPhase('loggedOut');
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        const session = data?.session;

        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setIsPlatformStaff(false);
          setStaffRole('');
          setSupportModeActive(false);
          setSupportWorkspaceId(null);
          setServerSessionValid(false);
          setIdentityResolved(true);
          setPhase('loggedOut');
          return;
        }

        const nextUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        };

        setUser(nextUser);
        setPhase('checkingServer');

        const ok = await validateServerSession(session.access_token);
        if (!ok) {
          setServerSessionValid(false);
          setIdentityResolved(true);
          setPhase('loggedOut');
          return;
        }

        fetchUserProfile(session.access_token);
      } catch (e) {
        console.error('[AuthNav] init failed:', e);
        setUser(null);
        setProfile(null);
        setIsPlatformStaff(false);
        setStaffRole('');
        setSupportModeActive(false);
        setSupportWorkspaceId(null);
        setServerSessionValid(false);
        setIdentityResolved(true);
        setPhase('loggedOut');
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (cancelled) return;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
        });

        setPhase('checkingServer');
        setIdentityResolved(false);

        const ok = await validateServerSession(session.access_token);
        if (!ok) {
          setUser(null);
          setProfile(null);
          setIsPlatformStaff(false);
          setStaffRole('');
          setSupportModeActive(false);
          setSupportWorkspaceId(null);
          setServerSessionValid(false);
          setIdentityResolved(true);
          setPhase('loggedOut');
          return;
        }

        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setProfile(null);
        setIsPlatformStaff(false);
        setStaffRole('');
        setSupportModeActive(false);
        setSupportWorkspaceId(null);
        setServerSessionValid(false);
        setIdentityResolved(true);
        setPhase('loggedOut');
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && serverSessionValid && identityResolved) {
      setPhase('ready');
    }
  }, [user, serverSessionValid, identityResolved]);

  const handleLogout = async () => {
    try {
      // Clear server-side httpOnly cookies first
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
      } catch { /* non-critical */ }

      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[AuthNav] signOut failed:', e);
    }

    setUser(null);
    setProfile(null);
    setIsPlatformStaff(false);
    setStaffRole('');
    setSupportModeActive(false);
    setSupportWorkspaceId(null);
    setServerSessionValid(false);
    setIdentityResolved(true);
    setIsDropdownOpen(false);
    setPhase('loggedOut');

    onNavigate?.();

    // Admin-safe redirect: never bounce staff out to public root from inside admin.
    router.replace(isAdminPath ? '/sign-in' : '/');
  };

  // Dropdown close on outside click (only for variant="dropdown")
  useEffect(() => {
    if (variant !== 'dropdown') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, variant]);

  const displayName = profile?.fullName || user?.name || user?.email || 'Account';
  const canSeeEngineering = Boolean(isPlatformStaff) && ENGINEERING_ROLES.has(staffRole);

  // ---------- Shared styling helpers ----------
  const labelCls =
    classNameSectionLabel ??
    (ui === 'light'
      ? 'text-[11px] font-semibold tracking-widest text-slate-500'
      : 'text-[11px] font-semibold tracking-widest text-white/45');

  const itemCls =
    classNameItem ??
    (ui === 'light'
      ? 'block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 hover:text-slate-950 hover:bg-slate-100 no-underline hover:no-underline'
      : 'block rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:bg-white/5 no-underline hover:no-underline');

  const dividerCls = classNameDivider ?? (ui === 'light' ? 'h-px bg-slate-200' : 'h-px bg-white/10');

  const cardCls =
    ui === 'light'
      ? 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3'
      : 'rounded-2xl border border-white/10 bg-white/5 px-3 py-3';

  const nameCls = ui === 'light' ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-white/95';
  const metaCls = ui === 'light' ? 'text-xs text-slate-600' : 'text-xs text-white/55';

  // ============================================================
  // VARIANT: menu (renders inside hamburger panel, no dropdown)
  // ============================================================
  if (variant === 'menu') {
    // Loading state (keep simple)
    if (phase === 'loading' || phase === 'checkingServer') {
      return (
        <div className="px-4 py-3">
          <p className={labelCls}>ACCOUNT</p>
          <div className="mt-2">
            <div className={cardCls}>
              <p className={nameCls}>Checking session…</p>
              <p className={metaCls}> </p>
            </div>
          </div>
        </div>
      );
    }

    // Logged out
    if (phase === 'loggedOut' || !user || !serverSessionValid) {
      return (
        <div className="px-4 py-3">
          <p className={labelCls}>ACCOUNT</p>
          <div className="mt-2">
            <div className={cardCls}>
              <p className={nameCls}>Not signed in</p>
              <p className={metaCls}> </p>
            </div>
          </div>

          <div className="mt-2 px-0">
            <Link href="/sign-in" className={itemCls} onClick={onNavigate} role="menuitem">
              Log in
            </Link>
            <Link href="/register" className={itemCls} onClick={onNavigate} role="menuitem">
              Register
            </Link>
          </div>
        </div>
      );
    }

    // Logged in
    return (
      <div className="px-4 py-3">
        <p className={labelCls}>ACCOUNT</p>

        <div className="mt-2">
          <div className={cardCls}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={nameCls}>
                  <span className="block truncate">{displayName}</span>
                </p>
                <p className={metaCls}>
                  <span className="block truncate">{user.email}</span>
                </p>
              </div>

              {isPlatformStaff && supportModeActive && (
                <span
                  className={
                    ui === 'light'
                      ? 'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200'
                      : 'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/15 text-amber-200 border border-amber-500/25'
                  }
                  title={supportWorkspaceId ? `Support Mode – Workspace: ${supportWorkspaceId}` : 'Support Mode enabled'}
                >
                  Support Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-2 px-0">
          {/* ADMIN-SEALED: when inside /admin, do NOT show member/public links */}
          {!isAdminPath && (
            <>
              <Link href="/dashboard" className={itemCls} onClick={onNavigate} role="menuitem">
                Dashboard
              </Link>
              <Link href="/account" className={itemCls} onClick={onNavigate} role="menuitem">
                Account
              </Link>
              <Link href="/app/settings" className={itemCls} onClick={onNavigate} role="menuitem">
                Settings
              </Link>
              <Link href="/app/settings/subscription" className={itemCls} onClick={onNavigate} role="menuitem">
                Subscription &amp; Billing
              </Link>
            </>
          )}

          {/* Admin */}
          {isPlatformStaff && (
            <>
              <div className={dividerCls} style={{ marginTop: 10, marginBottom: 10 }} />
              <p className={labelCls}>ADMIN</p>

              <Link href="/admin" className={itemCls} onClick={onNavigate} role="menuitem">
                Admin Panel
              </Link>
              <Link href="/admin/users" className={itemCls} onClick={onNavigate} role="menuitem">
                Users
              </Link>
              <Link href="/admin/settings" className={itemCls} onClick={onNavigate} role="menuitem">
                Settings
              </Link>
              <Link href="/admin/pricing" className={itemCls} onClick={onNavigate} role="menuitem">
                Pricing
              </Link>
              <Link href="/admin/docs" className={itemCls} onClick={onNavigate} role="menuitem">
                Documents
              </Link>
              <Link href="/admin/feedback" className={itemCls} onClick={onNavigate} role="menuitem">
                Feedback
              </Link>
              <Link href="/admin/analytics" className={itemCls} onClick={onNavigate} role="menuitem">
                Analytics
              </Link>
              <Link href="/admin/accountant" className={itemCls} onClick={onNavigate} role="menuitem">
                Accountant
              </Link>

              {canSeeEngineering && (
                <>
                  <div className={dividerCls} style={{ marginTop: 10, marginBottom: 10 }} />
                  <p className={labelCls}>ENGINEERING</p>

                  <Link href="/admin/engineering" className={itemCls} onClick={onNavigate} role="menuitem">
                    Engineering Dashboard
                  </Link>
                  {/* Support Inbox removed from AuthNav by design (lives inside Engineering). */}
                </>
              )}
            </>
          )}

          <div className={dividerCls} style={{ marginTop: 10, marginBottom: 10 }} />

          <button
            onClick={handleLogout}
            className={
              ui === 'light'
                ? 'block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors'
                : 'block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-200 hover:bg-red-500/10 transition-colors'
            }
            role="menuitem"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // VARIANT: dropdown (legacy behaviour — functional menu)
  // ============================================================

  if (phase === 'loading' || phase === 'checkingServer') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary">Checking session…</span>
      </div>
    );
  }

  if (phase === 'loggedOut' || !user || !serverSessionValid) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium text-primary hover:text-accent transition-colors border border-primary rounded hover:bg-gray-50"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium bg-primary text-white rounded hover:bg-accent transition-colors"
        >
          Register
        </Link>
      </div>
    );
  }

  // On /login specifically, only show if server session is valid (proof-based)
  if (pathname === '/sign-in' && !serverSessionValid) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium text-primary hover:text-accent transition-colors border border-primary rounded hover:bg-gray-50"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 h-10 flex items-center text-sm font-medium bg-primary text-white rounded hover:bg-accent transition-colors"
        >
          Register
        </Link>
      </div>
    );
  }

  const closeDropdownAndNavigate = () => {
    setIsDropdownOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium text-primary hover:text-accent transition-colors rounded hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        title="Account menu"
      >
        <span className="max-w-[150px] truncate">{displayName}</span>

        {isPlatformStaff && supportModeActive && (
          <span
            className="ml-1 inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200"
            title={supportWorkspaceId ? `Support Mode – Workspace: ${supportWorkspaceId}` : 'Support Mode enabled'}
          >
            Support Mode
          </span>
        )}

        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          className={`transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <nav className="flex flex-col py-1">
            {/* ADMIN-SEALED: when inside /admin, do NOT show member/public links */}
            {!isAdminPath && (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Account
                </Link>
                <Link
                  href="/app/settings"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Settings
                </Link>
                <Link
                  href="/app/settings/subscription"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Subscription &amp; Billing
                </Link>
              </>
            )}

            {isPlatformStaff && (
              <>
                <div className="h-px bg-gray-200 my-1" />
                <span className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-widest text-gray-500">ADMIN</span>

                <Link
                  href="/admin"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Admin Panel
                </Link>
                <Link
                  href="/admin/users"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Users
                </Link>
                <Link
                  href="/admin/settings"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Settings
                </Link>
                <Link
                  href="/admin/pricing"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Pricing
                </Link>
                <Link
                  href="/admin/docs"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Documents
                </Link>
                <Link
                  href="/admin/feedback"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Feedback
                </Link>
                <Link
                  href="/admin/analytics"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Analytics
                </Link>
                <Link
                  href="/admin/accountant"
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                  role="menuitem"
                  onClick={closeDropdownAndNavigate}
                >
                  Accountant
                </Link>

                {canSeeEngineering && (
                  <>
                    <div className="h-px bg-gray-200 my-1" />
                    <span className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-widest text-gray-500">
                      ENGINEERING
                    </span>

                    <Link
                      href="/admin/engineering"
                      className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                      role="menuitem"
                      onClick={closeDropdownAndNavigate}
                    >
                      Engineering Dashboard
                    </Link>
                    {/* Support Inbox removed from AuthNav by design (lives inside Engineering). */}
                  </>
                )}
              </>
            )}

            <div className="h-px bg-gray-200 my-1" />

            <button
              onClick={handleLogout}
              className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium flex items-center gap-2 w-full"
              role="menuitem"
            >
              <span>Log out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}