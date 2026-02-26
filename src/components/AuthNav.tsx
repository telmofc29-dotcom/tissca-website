// src/components/AuthNav.tsx v1.4
//
// CHANGES (v1.4):
// - Display Support Mode badge for platform staff (proof-based via /api/user/me response).
// - Keep existing phase gates to prevent flicker/blank header.
// - Minimal targeted change only.

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

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);

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

        const smActive =
          Boolean(data?.support_mode?.active) || Boolean(data?.support_mode_enabled);
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
        setSupportModeActive(false);
        setSupportWorkspaceId(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setIsPlatformStaff(false);
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

        // Proof-based checks (server must confirm session; profile/staff must be resolved)
        const ok = await validateServerSession(session.access_token);
        if (!ok) {
          // Server didn't confirm -> do NOT show dropdown
          setServerSessionValid(false);
          setIdentityResolved(true);
          setPhase('loggedOut');
          return;
        }

        // Load staff flag/profile after proof passes
        fetchUserProfile(session.access_token);
      } catch (e) {
        console.error('[AuthNav] init failed:', e);
        setUser(null);
        setProfile(null);
        setIsPlatformStaff(false);
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

  // Once identity resolved AND server session is valid AND user exists -> ready
  useEffect(() => {
    if (user && serverSessionValid && identityResolved) {
      setPhase('ready');
    }
  }, [user, serverSessionValid, identityResolved]);

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[AuthNav] signOut failed:', e);
    }

    setUser(null);
    setProfile(null);
    setIsPlatformStaff(false);
    setSupportModeActive(false);
    setSupportWorkspaceId(null);
    setServerSessionValid(false);
    setIdentityResolved(true);
    setIsDropdownOpen(false);
    setPhase('loggedOut');
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // ✅ Always render something (never return null)
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
          href="/login"
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
  if (pathname === '/login' && !serverSessionValid) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
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

  // Logged in - Show user profile with settings dropdown
  const displayName = profile?.fullName || user.name || user.email;

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
            {isPlatformStaff ? (
              <>
                <Link
                  href="/admin"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z" />
                  </svg>
                  <span>Admin Panel</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3h10v10H3z" />
                    <path d="M5 6h6M5 8h6M5 10h4" />
                  </svg>
                  <span>Member Simulator</span>
                </Link>

                <div className="border-t border-gray-100 my-1" />

                <Link
                  href="/admin/content"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3h10v10H3z" />
                    <path d="M5 6h6M5 8h6M5 10h4" />
                  </svg>
                  <span>Content</span>
                </Link>

                <Link
                  href="/admin/media"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 4h10v8H3z" />
                    <path d="M6 7l2-2 3 4" />
                    <path d="M6 10h6" />
                  </svg>
                  <span>Media</span>
                </Link>

                <Link
                  href="/admin/analytics"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 12V7" />
                    <path d="M7 12V4" />
                    <path d="M11 12V9" />
                    <path d="M2 12h12" />
                  </svg>
                  <span>Analytics</span>
                </Link>

                <Link
                  href="/admin/revenue"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v12" />
                    <path d="M5 5c0-1.5 6-1.5 6 0s-6 1.5-6 3 6 1.5 6 3-6 1.5-6 0" />
                  </svg>
                  <span>Revenue</span>
                </Link>

                <Link
                  href="/admin/reports"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 2h6l2 2v10H4z" />
                    <path d="M6 7h6M6 9h6M6 11h4" />
                  </svg>
                  <span>Reports</span>
                </Link>

                <Link
                  href="/admin/users"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    <path d="M2 13.5a6 6 0 0 1 12 0" />
                  </svg>
                  <span>Users</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/account"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    <path d="M2 13.5a6 6 0 0 1 12 0" />
                  </svg>
                  <span>Account</span>
                </Link>
                <Link
                  href="/account/settings"
                  className="px-4 py-3 text-sm text-secondary hover:bg-gray-50 transition-colors flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="1" />
                    <path d="M8 3v2M8 11v2M13 8h-2M3 8h2" />
                    <path d="M11.66 4.34l-1.42 1.42M4.34 11.66l-1.42 1.42M11.66 11.66l-1.42-1.42M4.34 4.34l-1.42-1.42" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </>
            )}

            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium flex items-center gap-2 w-full"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 8H6M11 6l2 2-2 2" />
                <path d="M8 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4" />
              </svg>
              <span>Log out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}