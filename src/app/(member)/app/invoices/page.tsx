// src/app/(member)/app/invoices/page.tsx v2.0
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
  created_at: string;
  updated_at: string;
};

function statusBadgeClasses(status: string | null) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  if (raw === 'sent') return 'border-blue-200 bg-blue-50 text-blue-700';
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

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

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
        const invoices = all.filter((d) => {
          const t = String(d.type || '').toLowerCase();
          return t.includes('invoice') || t.includes('receipt') || t.includes('payment');
        });
        setDocs(invoices);
        setError(null);
        trackEvent('feature_view', '/app/invoices', { eventLabel: 'invoices_loaded', metadata: { feature: 'invoices', entityType: 'invoice', action: 'view', itemCount: invoices.length, sourcePage: '/app/invoices' } });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const counts = useMemo(() => {
    const total = docs.length;
    const paid = docs.filter((d) => String(d.status || '').toLowerCase() === 'paid').length;
    const sent = docs.filter((d) => String(d.status || '').toLowerCase() === 'sent').length;
    return { total, paid, sent };
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
              {isLoading ? '\u2014' : counts.paid}
            </p>
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
            docs.map((doc) => (
              <article
                key={doc.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{doc.reference || doc.client_name || 'Untitled invoice'}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(doc.status)}`}
                      >
                        {doc.status || 'Draft'}
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
                </div>
              </article>
            ))
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
