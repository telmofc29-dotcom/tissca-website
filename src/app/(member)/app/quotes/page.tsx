// src/app/(member)/app/quotes/page.tsx v4.1
//
// PURPOSE:
// - Display quote documents from public.documents via /api/workspace/documents.
// - Android-created quotes are synced to public.documents (type = 'quote'),
//   NOT to public.quotes (which is the website-native quote table).
// - Light theme matching other member app pages (invoices, overview, settings).
// - Status filtering, PDF view links, clean card layout.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-27): Wire to real /api/workspace/documents data.
// - v3.0: Dark theme, status filters, action buttons, enhanced cards.
// - v4.0 (2026-05-17): Light theme parity; PDF view links; linked_entity support.
// - v4.1 (2026-05-17): Fix PDF button — embed auth token in URL so browser direct
//   link works. Always use /api/workspace/documents/:id/pdf for all documents
//   (Android docs are in documents table, never in public.quotes/invoices).

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
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected';

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-gray-200 bg-gray-50 text-slate-600',
  sent: 'border-blue-200 bg-blue-50 text-blue-700',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  declined: 'border-red-200 bg-red-50 text-red-700',
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
  // Track which doc id is currently fetching its PDF (auth-gated blob open)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  async function openPdf(docId: string, pdfHref: string) {
    if (pdfLoading || !accessToken) return;
    setPdfLoading(docId);
    try {
      const res = await fetch(pdfHref, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = (j as { error?: string }).error || msg; } catch { /* noop */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!w) {
        // Popup blocked — trigger a download instead
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `quote-${docId}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-alert
      alert(`Could not open PDF: ${msg}`);
    } finally {
      setPdfLoading(null);
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quotes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Quote documents for your workspace — created on Android or web.
            </p>
          </div>
          <Link
            href="/app/scan-to-layout"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors"
          >
            + New Quote
          </Link>
        </div>

        {/* Summary counts */}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {(['all', 'draft', 'sent', 'accepted'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                filter === f
                  ? 'border-amber-300 bg-amber-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-xs font-medium text-slate-500 capitalize">{f === 'all' ? 'All quotes' : f}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {isLoading ? '—' : (f === 'all' ? docs.length : statusCount(f))}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      {/* Quote list */}
      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
            Loading quotes&hellip;
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-600">
            No quotes found. Create your first quote to get started.
          </div>
        ) : (
          filtered.map((doc) => {
            const status = normalizeStatus(doc.status);
            const styles = STATUS_STYLES[status] || STATUS_STYLES.draft;
            // PART A FIX: Always use the workspace documents PDF route with token in URL.
            // Android-created documents live in public.documents (not public.quotes/invoices).
            // The token must be a query param — browser <a target="_blank"> links cannot set headers.
            const pdfHref = `/api/workspace/documents/${doc.id}/pdf?token=${encodeURIComponent(accessToken ?? '')}`;

            return (
              <article
                key={doc.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {doc.reference || doc.client_name || 'Untitled quote'}
                      </p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                    {doc.client_name && doc.reference && (
                      <p className="mt-0.5 text-sm text-slate-600">{doc.client_name}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(doc.date || doc.created_at)}
                      {doc.grand_total != null && (
                        <span className="ml-2 font-semibold text-slate-900">
                          {_fmtCur(doc.grand_total, doc.currency)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* PDF action — uses fetch with Authorization header (anchor tags lack it) */}
                  <button
                    type="button"
                    onClick={() => openPdf(doc.id, pdfHref)}
                    disabled={pdfLoading === doc.id}
                    className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-100 transition-colors disabled:opacity-60"
                  >
                    {pdfLoading === doc.id ? 'Opening…' : 'View PDF'}
                  </button>
                </div>

                {/* Status hint */}
                {(status === 'accepted' || status === 'approved') && (
                  <p className="mt-2 text-xs font-medium text-emerald-700">✓ Quote accepted</p>
                )}
              </article>
            );
          })
        )}

        {!isLoading && docs.length > 0 && (
          <p className="text-xs text-slate-500 text-center">
            Showing {filtered.length} of {docs.length} quote{docs.length !== 1 ? 's' : ''}.
          </p>
        )}
      </section>
    </div>
  );
}
