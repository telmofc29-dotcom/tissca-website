// src/app/dashboard/page.tsx v2.1
//
// CHANGES (v2.1):
// - Add proof-based Support Mode banner (Option B) to the REAL member dashboard route: /dashboard
// - Banner is shown only when proven by server via /api/user/me (no client guessing)
// - Add "Exit Support Mode" button that clears the server-trusted cookie via /api/admin/support/clear-workspace
// - Minimal additive change only (no refactors)

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type SupportModeState = {
  active: boolean;
  workspaceId: string | null;
};

export default function DashboardIndexPage() {
  const supabase = getSupabaseClient();

  const [supportMode, setSupportMode] = useState<SupportModeState>({
    active: false,
    workspaceId: null,
  });

  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const loadSupportModeProof = async () => {
      try {
        if (!supabase) {
          // Cannot prove anything if Supabase is not configured
          setSupportMode({ active: false, workspaceId: null });
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          setSupportMode({ active: false, workspaceId: null });
          return;
        }

        const res = await fetch('/api/user/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (!res.ok) {
          // Fail closed: if server proof fails, treat as off
          setSupportMode({ active: false, workspaceId: null });
          return;
        }

        const json = await res.json();
        const active = Boolean(json?.support_mode?.active);
        const workspaceId =
          (json?.support_mode?.workspace_id as string | null) ?? null;

        setSupportMode({ active, workspaceId });
      } catch (e) {
        console.warn('[DashboardIndexPage] Failed to prove support_mode via /api/user/me:', e);
        setSupportMode({ active: false, workspaceId: null });
      }
    };

    loadSupportModeProof();
  }, [supabase]);

  const exitSupportMode = async () => {
    try {
      setExiting(true);

      await fetch('/api/admin/support/clear-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // After clearing, update local state (fail closed)
      setSupportMode({ active: false, workspaceId: null });

      // Light refresh so server-rendered areas update
      window.location.reload();
    } catch (e) {
      console.error('[DashboardIndexPage] Failed to exit support mode:', e);
    } finally {
      setExiting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Support Mode Banner (Option B) */}
        {supportMode.active && supportMode.workspaceId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">
                Support Mode – Viewing as Workspace: {supportMode.workspaceId}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                You are not “becoming” the user. You are viewing the member experience for support/troubleshooting.
              </p>
            </div>
            <button
              onClick={exitSupportMode}
              disabled={exiting}
              className="shrink-0 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {exiting ? 'Exiting…' : 'Exit Support Mode'}
            </button>
          </div>
        )}

        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Member dashboard overview</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Open Quotes</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">6</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Open Invoices</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">4</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">£2,140.00</p>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/app/quotes"
              className="px-4 py-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              View Quotes
            </Link>
            <Link
              href="/dashboard/app/invoices"
              className="px-4 py-2 rounded bg-green-50 text-green-700 hover:bg-green-100"
            >
              View Invoices
            </Link>
            <Link
              href="/account"
              className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}