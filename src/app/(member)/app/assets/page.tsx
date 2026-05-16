// src/app/(member)/app/assets/page.tsx v2.0
//
// PURPOSE:
// - Display real assets from public.assets via /api/workspace/assets.
// - Assets sync is still being finalised; show what is synced so far.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI.
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/assets data.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';

type Asset = {
  id: string;
  name: string | null;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  job_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

function formatBytes(bytes: number | null) {
  if (bytes == null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function AppAssetsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/assets', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load assets');
        return res.json();
      })
      .then((data) => {
        const items = data.assets ?? [];
        setAssets(items);
        setError(null);
        trackEvent('feature_view', '/app/assets', { eventLabel: 'assets_loaded', metadata: { feature: 'assets', entityType: 'asset', action: 'view', itemCount: items.length, sourcePage: '/app/assets' } });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const totalSize = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.file_size || 0), 0);
  }, [assets]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Asset library</h2>
            <p className="mt-1 text-sm text-slate-600">
              Site photos, documents, and certificates from your workspace.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading assets&hellip;
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
              No assets yet. Upload files or they will appear here as your workspace grows.
            </div>
          ) : (
            assets.map((asset) => (
              <article
                key={asset.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-slate-700">
                      <FileIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{asset.name || 'Unnamed file'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {asset.type || 'File'} &middot; {formatBytes(asset.file_size)} &middot; {formatDate(asset.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {!isLoading && assets.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {assets.length} asset{assets.length !== 1 ? 's' : ''} in your workspace.
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h3 className="text-base font-semibold text-slate-900">Storage</h3>
        <p className="mt-2 text-sm text-slate-600">
          Used: <span className="font-semibold text-slate-900">{isLoading ? '\u2014' : formatBytes(totalSize)}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Files: <span className="font-semibold text-slate-900">{isLoading ? '\u2014' : assets.length}</span>
        </p>

        <div className="mt-5 rounded-2xl border border-amber-200/60 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Note</p>
          <p className="mt-1 text-sm text-slate-700">
            Asset management is still being finalised. Some files may not appear yet.
          </p>
        </div>
      </aside>
    </div>
  );
}
