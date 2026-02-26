// src/components/admin/SupportModePanel.tsx v1.1
//
// Support Mode Panel (Option B)
// -----------------------------
// - Sets/clears server-trusted support workspace cookie via admin-only API routes
// - Redirects admin to /dashboard/app to view the real member simulator
// - Minimal UI, no refactors
//
// CHANGES (v1.1):
// - Fix simulator target route: /dashboard -> /dashboard/app (real member dashboard)

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const MEMBER_SIMULATOR_ROUTE = '/dashboard/app';

export default function SupportModePanel({
  currentWorkspaceId,
}: {
  currentWorkspaceId: string | null;
}) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string>(currentWorkspaceId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const isActive = useMemo(() => Boolean(currentWorkspaceId), [currentWorkspaceId]);

  const enterSupportMode = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/support/set-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed with status ${res.status}`);
      }

      // Open the member simulator (real member dashboard route)
      router.push(MEMBER_SIMULATOR_ROUTE);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to enter support mode');
    } finally {
      setLoading(false);
    }
  };

  const exitSupportMode = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/support/clear-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed with status ${res.status}`);
      }

      // Clear local input and refresh server-rendered admin page state
      setWorkspaceId('');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to exit support mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛟</span>
            <h3 className="text-lg font-bold text-amber-900">Support Mode</h3>
          </div>

          <p className="mt-1 text-sm text-amber-800 max-w-2xl">
            Support Mode lets platform staff view the member dashboard as a simulator for a selected workspace.
            This does not “become” the user — it is an explicit support context.
          </p>

          <p className="mt-3 text-sm text-amber-900">
            Active:{' '}
            <span className="font-semibold">
              {isActive ? currentWorkspaceId : 'No'}
            </span>
          </p>
        </div>

        <div className="w-full md:max-w-md">
          <label className="block text-sm font-semibold text-amber-900">
            Workspace UUID
          </label>

          <input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-2 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={enterSupportMode}
              disabled={loading || !workspaceId}
              className="rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {loading ? 'Working…' : 'Enter Support Mode'}
            </button>

            <button
              onClick={exitSupportMode}
              disabled={loading || !isActive}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-amber-900 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
            >
              {loading ? 'Working…' : 'Exit'}
            </button>

            <button
              onClick={() => {
                router.push(MEMBER_SIMULATOR_ROUTE);
                router.refresh();
              }}
              className="ml-auto rounded-md bg-white px-4 py-2 text-sm font-semibold text-amber-900 border border-amber-200 hover:bg-amber-100"
            >
              Open Simulator
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}