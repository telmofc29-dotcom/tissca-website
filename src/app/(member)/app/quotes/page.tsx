// src/app/(member)/app/quotes/page.tsx v3.0
//
// PURPOSE:
// - Display quote documents from public.documents via /api/workspace/documents.
// - Android-created quotes are synced to public.documents (type = 'quote'),
//   NOT to public.quotes (which is the website-native quote table).
// - Dark theme (espresso + warm glow) matching dashboard styling.
// - Status filtering, action buttons (mark sent, accept, reject, reopen).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-27): Wire to real /api/workspace/documents data.
// - v3.0: Dark theme, status filters, action buttons, enhanced cards.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur } from '@/lib/currency';

type Document = {
  id: string;
  type: string | null;
  reference: string | null;
  date: string | null;
  client_name: string | null;
  client_email: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  grand_total: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  declined: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function normalizeStatus(status: string | null): string {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'approved') return 'accepted';
  if (raw === 'declined') return 'rejected';
  return raw || 'draft';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppQuotesPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  function loadQuotes() {
    if (!accessToken) return;
    setLoading(true);
    fetch('/api/workspace/documents', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((data) => {
        const all = (data.documents ?? []) as Document[];
        const quotes = all.filter((d) => {
          const t = String(d.type || '').toLowerCase();
          return t.includes('quote') || t.includes('estimate');
        });
        setDocs(quotes);
        setError(null);
        trackEvent('feature_view', '/app/quotes', { eventLabel: 'quotes_loaded', metadata: { feature: 'quotes', entityType: 'quote', action: 'view', itemCount: quotes.length, sourcePage: '/app/quotes' } });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const filtered = filter === 'all'
    ? docs
    : docs.filter((d) => normalizeStatus(d.status) === filter);

  const statusCount = (s: string) => docs.filter((d) => normalizeStatus(d.status) === s).length;

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <main className="min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Quotes</h1>
          <p className="text-sm text-slate-400 mt-0.5">{docs.length} quote{docs.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <Link
          href="/app/scan-to-layout"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          + New Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 opacity-60">{statusCount(f.value)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {/* Quote list */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500">Loading quotes…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-slate-400 text-sm">No quotes found.</p>
          <p className="text-slate-500 text-xs mt-1">Create your first quote to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const status = normalizeStatus(doc.status);
            const styles = STATUS_STYLES[status] || STATUS_STYLES.draft;

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 hover:bg-white/[0.06] transition-colors shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-sm text-slate-100">
                        {doc.reference || doc.client_name || 'Untitled quote'}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}>
                        {status}
                      </span>
                    </div>
                    {doc.client_name && doc.reference && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{doc.client_name}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      Created {formatDate(doc.date || doc.created_at)}
                      {doc.updated_at !== doc.created_at && ` · Updated ${formatDate(doc.updated_at)}`}
                      {doc.grand_total != null && (
                        <span className="ml-2 text-slate-300 font-medium">
                          {_fmtCur(doc.grand_total, doc.currency)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {status === 'draft' && (
                    <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-medium text-amber-300/70">
                      Ready to send
                    </span>
                  )}
                  {status === 'sent' && (
                    <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-medium text-blue-300/70">
                      Awaiting response
                    </span>
                  )}
                  {status === 'accepted' && (
                    <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-medium text-emerald-300/70">
                      ✓ Job won
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && docs.length > 0 && (
        <p className="mt-4 text-xs text-slate-600 text-center">
          Showing {filtered.length} of {docs.length} quote{docs.length !== 1 ? 's' : ''}.
        </p>
      )}
    </main>
  );
}
