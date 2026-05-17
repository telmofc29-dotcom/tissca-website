// src/app/(member)/app/invoices/page.tsx v3.1
//
// PURPOSE:
// - Display invoice documents from public.documents via /api/workspace/documents.
// - Android-created invoices are synced to public.documents (type = 'invoice'),
//   NOT to public.invoices (which is the website-native invoice table).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/documents data.
// - v3.0 (2026-05-17): Fix paid count — cross-reference invoices table via stats
//                      API; add View PDF links; add linked_entity support.
// - v3.1 (2026-05-17): Fix PDF button — embed auth token in URL so browser direct
//   link works. Always use /api/workspace/documents/:id/pdf for all documents.

'use client';

import { useEffect, useState, useMemo } from 'react';
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

function statusBadgeClasses(status: string | null) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  if (raw === 'sent') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw === 'partially_paid') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppInvoicesPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Accurate paid count from the invoices table (via stats API).
  // documents.status may not be updated by Android when marking paid.
  const [invoicesPaid, setInvoicesPaid] = useState<number | null>(null);
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
        a.download = `invoice-${docId}.pdf`;
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

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };

    Promise.all([
      fetch('/api/workspace/documents', { headers, cache: 'no-store' }),
      fetch('/api/workspace/stats', { headers, cache: 'no-store' }),
    ])
      .then(async ([docsRes, statsRes]) => {
        if (!docsRes.ok) throw new Error('Failed to load documents');
        const docsData = await docsRes.json();
        const all = (docsData.documents ?? []) as Document[];
        const invoices = all.filter((d) => {
          const t = String(d.type || '').toLowerCase();
          return t.includes('invoice') || t.includes('receipt') || t.includes('payment');
        });
        setDocs(invoices);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          // Use the invoices table paid count — more reliable than documents.status
          const paid: number = statsData?.invoices?.paid ?? null;
          setInvoicesPaid(paid);
        }

        setError(null);
        trackEvent('feature_view', '/app/invoices', { eventLabel: 'invoices_loaded', metadata: { feature: 'invoices', entityType: 'invoice', action: 'view', itemCount: invoices.length, sourcePage: '/app/invoices' } });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const counts = useMemo(() => {
    const total = docs.length;
    // Doc-level paid (status field): may be stale for Android-created docs.
    // invoicesPaid (from stats/invoices table) is the authoritative paid count.
    const docPaid = docs.filter((d) => String(d.status || '').toLowerCase() === 'paid').length;
    const sent = docs.filter((d) => String(d.status || '').toLowerCase() === 'sent').length;
    return { total, docPaid, sent };
  }, [docs]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Invoice tracker</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your invoice documents for review, download, and tracking.
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Total invoices</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : counts.total}
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Sent</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : counts.sent}
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Paid</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : (invoicesPaid !== null ? invoicesPaid : counts.docPaid)}
            </p>
            {!isLoading && invoicesPaid !== null && invoicesPaid !== counts.docPaid && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                From invoices table · {counts.docPaid} doc{counts.docPaid !== 1 ? 's' : ''} show paid
              </p>
            )}
          </article>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading invoices&hellip;
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
              No invoice documents yet. Invoices you create will appear here.
            </div>
          ) : (
            docs.map((doc) => {
              // PART A FIX: Always use the workspace documents PDF route with token in URL.
              // Android-created documents live in public.documents (not public.invoices).
              // The token must be a query param — browser <a target="_blank"> links cannot set headers.
              const pdfHref = `/api/workspace/documents/${doc.id}/pdf?token=${encodeURIComponent(accessToken ?? '')}`;

              return (
                <article
                  key={doc.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{doc.reference || doc.client_name || 'Untitled invoice'}</p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(doc.status)}`}
                        >
                          {doc.status ? (doc.status.charAt(0).toUpperCase() + doc.status.slice(1).toLowerCase()) : 'Draft'}
                        </span>
                      </div>
                      {doc.client_name && doc.reference && (
                        <p className="mt-0.5 text-sm text-slate-600">{doc.client_name}</p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
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
                </article>
              );
            })
          )}
        </div>

        {!isLoading && docs.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {docs.length} invoice document{docs.length !== 1 ? 's' : ''} in your workspace.
          </p>
        )}
      </section>
    </div>
  );
}
