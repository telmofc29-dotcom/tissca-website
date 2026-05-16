// src/contexts/WorkspaceContext.tsx v1.0
//
// PURPOSE:
// - Centralised workspace + user + billing context for all member pages.
// - Single fetch from /api/user/me, shared across the component tree.
// - Eliminates duplicate /api/user/me calls from every component.
//
// USAGE:
//   Wrap member layout:  <WorkspaceProvider>{children}</WorkspaceProvider>
//   In any child:        const { workspace, user, profile, isLoading } = useWorkspace();

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkspaceData = {
  id: string;
  name: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

export type UserData = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ProfileData = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  current_workspace_id: string | null;
  plan_tier: string | null;
};

export type SupportModeData = {
  active: boolean;
  workspace_id: string | null;
};

export type WorkspaceContextValue = {
  // Data
  user: UserData | null;
  profile: ProfileData | null;
  workspace: WorkspaceData | null;
  role: string;
  isPlatformStaff: boolean;
  supportMode: SupportModeData;

  // Derived
  workspaceId: string | null;
  accessToken: string | null;
  isLoggedIn: boolean;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
};

const defaultContext: WorkspaceContextValue = {
  user: null,
  profile: null,
  workspace: null,
  role: 'member',
  isPlatformStaff: false,
  supportMode: { active: false, workspace_id: null },
  workspaceId: null,
  accessToken: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  refresh: async () => {},
};

const WorkspaceContext = createContext<WorkspaceContextValue>(defaultContext);

// ─── Provider ────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [role, setRole] = useState('member');
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);
  const [supportMode, setSupportMode] = useState<SupportModeData>({ active: false, workspace_id: null });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearAllState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setWorkspace(null);
    setAccessToken(null);
    setRole('member');
    setIsPlatformStaff(false);
    setSupportMode({ active: false, workspace_id: null });
  }, []);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase client unavailable.');
        clearAllState();
        return;
      }

      // Use getUser() (server-validated) instead of getSession() (cached/stale).
      // This prevents treating an expired token as valid.
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        // Stale or expired session — clear it completely.
        if (authError) {
          supabase.auth.signOut().catch(() => {});
        }
        clearAllState();
        return;
      }

      // getUser() succeeded → session is guaranteed valid. Read the token.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        clearAllState();
        return;
      }

      setAccessToken(token);

      const res = await fetch('/api/user/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        // 401 → session accepted by Supabase Auth but rejected by our API.
        // Clear stale auth so we don't retry with the same token.
        if (res.status === 401) {
          supabase.auth.signOut().catch(() => {});
        }
        clearAllState();
        setError('Failed to load workspace context.');
        return;
      }

      const json = await res.json();

      setUser(json.user ?? null);
      setProfile(json.profile ?? null);
      setWorkspace(json.workspace ?? null);
      setRole(json.role ?? 'member');
      setIsPlatformStaff(Boolean(json.is_platform_staff));
      setSupportMode({
        active: Boolean(json.support_mode?.active),
        workspace_id: json.support_mode?.workspace_id ?? null,
      });
    } catch (e) {
      console.warn('[WorkspaceProvider] Failed to load context:', e);
      clearAllState();
      setError('Failed to load workspace context.');
    } finally {
      setIsLoading(false);
      console.log('[WorkspaceProvider] auth ready — context loaded');
    }
  }, [clearAllState]);

  useEffect(() => {
    console.log('[WorkspaceProvider] mount — calling loadContext()');
    loadContext();
    return () => {
      console.log('[WorkspaceProvider] unmount');
    };
  }, [loadContext]);

  // ── Keep accessToken fresh when Supabase auto-refreshes the session ──
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('[WorkspaceProvider] TOKEN_REFRESHED — updating accessToken');
        setAccessToken(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        console.log('[WorkspaceProvider] SIGNED_OUT — clearing state');
        clearAllState();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [clearAllState]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    user,
    profile,
    workspace,
    role,
    isPlatformStaff,
    supportMode,
    workspaceId: workspace?.id ?? profile?.current_workspace_id ?? null,
    accessToken,
    isLoggedIn: Boolean(user),
    isLoading,
    error,
    refresh: loadContext,
  }), [user, profile, workspace, role, isPlatformStaff, supportMode, accessToken, isLoading, error, loadContext]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
