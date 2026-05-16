// src/app/(admin)/admin/settings/settings.client.tsx v1.1
//
// PURPOSE:
// - Admin Settings UI (role-scoped).
// - Proof-based:
//   - Reads identity/role/support mode from GET /api/user/me
//   - Reads settings payload from GET /api/admin/settings
// - Writes:
//   - PATCH /api/admin/settings/preferences (staff: self-only)
//   - PATCH /api/admin/settings/platform (superadmin only)
//
// LOCKED:
// - Do not expose member/public navigation.
// - Fail closed (no staff assumptions).
// - UI role gating is convenience; server + RLS are the real enforcement.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, getSupabaseEnv } from '@/lib/supabase';

type MeResponse = {
  profile?: { fullName?: string | null; email?: string | null } | null;
  is_platform_staff?: boolean;
  staff_role?: string | null;
  support_mode?: { active?: boolean; workspace_id?: string | null } | null;
  support_mode_enabled?: boolean;
  support_mode_workspace_id?: string | null;
};

type AdminPrefs = {
  compact_sidebar: boolean;
  show_debug: boolean;
};

type PlatformFlags = {
  maintenance_mode: boolean;
  registrations_enabled: boolean;
  stripe_enabled: boolean;
  force_email_verification: boolean;
};

type AdminSettingsResponse = {
  my_preferences: AdminPrefs;
  platform_flags?: PlatformFlags; // only present for superadmin
};

type Phase = 'loading' | 'ready' | 'error' | 'loggedOut' | 'notStaff';

function coerceBool(v: any, fallback = false) {
  return typeof v === 'boolean' ? v : fallback;
}

export default function AdminSettingsClient() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Preferences (Supabase-backed)
  const [prefCompactSidebar, setPrefCompactSidebar] = useState(false);
  const [prefShowDebug, setPrefShowDebug] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSavedMsg, setPrefsSavedMsg] = useState<string>('');

  // Platform flags (Supabase-backed; superadmin only)
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [forceEmailVerification, setForceEmailVerification] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [platformSavedMsg, setPlatformSavedMsg] = useState<string>('');

  const staffRole = useMemo(() => String(me?.staff_role ?? '').toLowerCase().trim(), [me?.staff_role]);
  const isSuperadmin = staffRole === 'superadmin';

  const fullName = me?.profile?.fullName ?? '';
  const email = me?.profile?.email ?? '';

  const supportActive =
    Boolean(me?.support_mode?.active) || Boolean(me?.support_mode_enabled);
  const supportWorkspaceId =
    me?.support_mode?.workspace_id ?? me?.support_mode_workspace_id ?? null;

  const getToken = async (): Promise<string | null> => {
    const env = getSupabaseEnv();
    if (!env || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  };

  const loadAll = async () => {
    setError('');
    setPrefsSavedMsg('');
    setPlatformSavedMsg('');
    setPhase('loading');

    try {
      const env = getSupabaseEnv();
      if (!env || !supabase) {
        setPhase('loggedOut');
        return;
      }

      const token = await getToken();
      if (!token) {
        setPhase('loggedOut');
        return;
      }

      // 1) Identity / staff role (proof-based)
      const meRes = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!meRes.ok) {
        setPhase('error');
        setError(`Failed to load identity (GET /api/user/me): ${meRes.status}`);
        return;
      }

      const meJson = (await meRes.json()) as MeResponse;

      // Fail closed
      if (!meJson?.is_platform_staff) {
        setMe(meJson);
        setPhase('notStaff');
        return;
      }

      setMe(meJson);

      // 2) Admin settings (role-scoped server-side)
      const sRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!sRes.ok) {
        setPhase('error');
        setError(`Failed to load settings (GET /api/admin/settings): ${sRes.status}`);
        return;
      }

      const sJson = (await sRes.json()) as AdminSettingsResponse;
      setSettings(sJson);

      // hydrate prefs
      setPrefCompactSidebar(coerceBool(sJson?.my_preferences?.compact_sidebar, false));
      setPrefShowDebug(coerceBool(sJson?.my_preferences?.show_debug, false));

      // hydrate platform flags only if present (superadmin)
      if (sJson?.platform_flags) {
        setMaintenanceMode(coerceBool(sJson.platform_flags.maintenance_mode, false));
        setRegistrationsEnabled(coerceBool(sJson.platform_flags.registrations_enabled, true));
        setStripeEnabled(coerceBool(sJson.platform_flags.stripe_enabled, false));
        setForceEmailVerification(coerceBool(sJson.platform_flags.force_email_verification, false));
      }

      setPhase('ready');
    } catch (e: any) {
      setPhase('error');
      setError(e?.message || 'Unknown error');
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePreferences = async () => {
    setError('');
    setPrefsSavedMsg('');
    try {
      setSavingPrefs(true);

      const token = await getToken();
      if (!token) {
        setPhase('loggedOut');
        return;
      }

      const res = await fetch('/api/admin/settings/preferences', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          compact_sidebar: prefCompactSidebar,
          show_debug: prefShowDebug,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to save preferences: ${res.status}`);
      }

      setPrefsSavedMsg('Saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const savePlatformFlags = async () => {
    setError('');
    setPlatformSavedMsg('');
    try {
      setSavingPlatform(true);

      const token = await getToken();
      if (!token) {
        setPhase('loggedOut');
        return;
      }

      const res = await fetch('/api/admin/settings/platform', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          maintenance_mode: maintenanceMode,
          registrations_enabled: registrationsEnabled,
          stripe_enabled: stripeEnabled,
          force_email_verification: forceEmailVerification,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to save platform flags: ${res.status}`);
      }

      setPlatformSavedMsg('Saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save platform flags');
    } finally {
      setSavingPlatform(false);
    }
  };

  // ---------------------------
  // UI States
  // ---------------------------
  if (phase === 'loading') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">Loading…</p>
        </div>
      </div>
    );
  }

  if (phase === 'loggedOut') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-2">You’re not signed in.</p>
      </div>
    );
  }

  if (phase === 'notStaff') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-2">Access denied (staff only).</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-red-700 mt-2">{error || 'Something went wrong.'}</p>
        <button
          onClick={loadAll}
          className="mt-4 px-4 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // =========================
  // READY UI
  // =========================
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-2">
          Platform administration preferences and operational controls.
        </p>
      </div>

      {/* Error banner (non-fatal) */}
      {error ? (
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : null}

      {/* Identity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900">Staff identity</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Name</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{fullName || '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{email || '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Role</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{staffRole || '—'}</p>
          </div>
        </div>
      </div>

      {/* Support Mode */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Support Mode</h3>
            <p className="text-gray-600 mt-1">
              Read-only status. Support Mode is controlled from the Admin Dashboard panel.
            </p>
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
              supportActive
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {supportActive ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Workspace in focus</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{supportWorkspaceId || '—'}</p>
        </div>
      </div>

      {/* Admin preferences (Supabase-backed now) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Admin preferences</h3>
            <p className="text-gray-600 mt-1">
              Stored per staff user. Only you can read/write your own preferences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {prefsSavedMsg ? <span className="text-sm font-semibold text-green-700">{prefsSavedMsg}</span> : null}
            <button
              onClick={savePreferences}
              disabled={savingPrefs}
              className={`px-4 py-2 rounded font-semibold border ${
                savingPrefs
                  ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900'
              }`}
            >
              {savingPrefs ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Compact sidebar</p>
              <p className="text-sm text-gray-600">Use a tighter navigation layout for better density.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={prefCompactSidebar}
              onChange={(e) => setPrefCompactSidebar(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Show debug panels</p>
              <p className="text-sm text-gray-600">Reveal additional diagnostics in engineering/support pages.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={prefShowDebug}
              onChange={(e) => setPrefShowDebug(e.target.checked)}
            />
          </label>
        </div>

        {/* Proof indicator */}
        <p className="text-xs text-gray-500 mt-4">
          Loaded from: <span className="font-mono">/api/admin/settings</span>
        </p>
      </div>

      {/* Platform flags (superadmin only; Supabase-backed) */}
      {isSuperadmin ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Platform flags</h3>
              <p className="text-gray-600 mt-1">
                Global switches affecting all users. Superadmin only.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {platformSavedMsg ? (
                <span className="text-sm font-semibold text-green-700">{platformSavedMsg}</span>
              ) : null}
              <button
                onClick={savePlatformFlags}
                disabled={savingPlatform}
                className={`px-4 py-2 rounded font-semibold border ${
                  savingPlatform
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900'
                }`}
              >
                {savingPlatform ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Maintenance mode</p>
                <p className="text-sm text-gray-600">Disable member access while keeping staff/admin available.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Registrations enabled</p>
                <p className="text-sm text-gray-600">Allow new sign-ups.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={registrationsEnabled}
                onChange={(e) => setRegistrationsEnabled(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Stripe billing enabled</p>
                <p className="text-sm text-gray-600">Gate checkout/portal flows behind a single flag.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Force email verification</p>
                <p className="text-sm text-gray-600">Require verified emails before member area access.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={forceEmailVerification}
                onChange={(e) => setForceEmailVerification(e.target.checked)}
              />
            </label>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Loaded from: <span className="font-mono">/api/admin/settings</span> • Saved to:{' '}
            <span className="font-mono">/api/admin/settings/platform</span>
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900">Platform flags</h3>
          <p className="text-gray-600 mt-1">
            Hidden for your role. Only Superadmin can view or modify platform-wide flags.
          </p>
        </div>
      )}

      {/* Danger zone (superadmin only placeholder) */}
      {isSuperadmin ? (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900">Danger zone</h3>
          <p className="text-gray-600 mt-1">
            High-risk actions. Superadmin only. (Wire later to staff-only server routes or Edge Functions.)
          </p>

          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <button
              disabled
              className="px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 font-semibold cursor-not-allowed"
              title="Not wired yet"
            >
              Rotate platform keys (not wired)
            </button>
            <button
              disabled
              className="px-4 py-3 rounded border border-red-200 bg-red-50 text-red-700 font-semibold cursor-not-allowed"
              title="Not wired yet"
            >
              Clear support mode cookies (not wired)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}