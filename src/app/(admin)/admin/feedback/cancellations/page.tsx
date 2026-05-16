'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { exportFeedbackToCSV, type FeedbackSubmission, type CancellationContext } from '@/utils/feedback';

function contextLabel(ctx: CancellationContext | undefined): string {
  if (ctx === 'subscription_cancel') return 'Subscription Cancel';
  if (ctx === 'account_delete') return 'Account Deletion';
  return 'Unknown';
}

function contextBadge(ctx: CancellationContext | undefined): string {
  if (ctx === 'subscription_cancel') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (ctx === 'account_delete') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function buildReasonCounts(items: FeedbackSubmission[]): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((f) => {
    f.cancellationReasons?.forEach((r) => {
      counts[r] = (counts[r] || 0) + 1;
    });
  });
  return counts;
}

function ReasonBreakdown({ title, items, accentColor }: { title: string; items: FeedbackSubmission[]; accentColor: string }) {
  const counts = useMemo(() => buildReasonCounts(items), [items]);
  const sorted = useMemo(() => Object.entries(counts).sort(([, a], [, b]) => b - a), [counts]);
  const total = items.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{total} submission{total !== 1 ? 's' : ''}</p>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(([reason, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={reason} className="flex items-center gap-3">
                <div className="w-52 text-sm text-slate-700 truncate" title={reason}>{reason}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                  <div className={`${accentColor} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-20 text-right text-sm font-semibold text-slate-800">{count} ({pct}%)</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OtherTextSection({ title, items }: { title: string; items: FeedbackSubmission[] }) {
  const entries = useMemo(
    () => items.filter((c) => c.cancellationReasons?.some((r) => r.startsWith('Other:'))),
    [items],
  );

  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800 mb-3">{title}</h4>
      <div className="space-y-2">
        {entries.map((entry) => {
          const otherText = entry.cancellationReasons
            ?.filter((r) => r.startsWith('Other:'))
            .map((r) => r.replace('Other: ', ''))
            .join(', ');
          return (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-800">&ldquo;{otherText}&rdquo;</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                <span>{entry.userEmail || 'Anonymous'}</span>
                <span>
                  {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminCancellationsPage() {
  const [cancellations, setCancellations] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/feedback?type=cancellation');
        if (!res.ok) return;
        const json = await res.json();
        setCancellations(json.feedback ?? []);
      } catch (err) {
        console.warn('[AdminCancellationsPage] Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subCancels = useMemo(
    () => cancellations.filter((c) => c.cancellationContext === 'subscription_cancel'),
    [cancellations],
  );
  const acctDeletes = useMemo(
    () => cancellations.filter((c) => c.cancellationContext === 'account_delete'),
    [cancellations],
  );
  const unknownCtx = useMemo(
    () => cancellations.filter((c) => !c.cancellationContext),
    [cancellations],
  );
  const otherEntries = useMemo(
    () => cancellations.filter((c) => c.cancellationReasons?.some((r) => r.startsWith('Other:'))),
    [cancellations],
  );

  const handleExportCSV = () => {
    const csv = exportFeedbackToCSV(cancellations);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancellations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            &larr; Back to Feedback
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Cancellation Insights</h1>
          <p className="text-gray-600">
            Breakdown of subscription cancellations and account deletions with reason analytics.
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            Loading cancellation data&hellip;
          </div>
        )}

        {!loading && (
          <>
            {/* ── SECTION 1 — HIGH-LEVEL SUMMARY ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-3xl font-bold text-rose-600">{cancellations.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-5">
                <p className="text-sm text-gray-600">Subscription Cancels</p>
                <p className="text-3xl font-bold text-amber-700">{subCancels.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-5">
                <p className="text-sm text-gray-600">Account Deletions</p>
                <p className="text-3xl font-bold text-red-700">{acctDeletes.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-600">&ldquo;Other&rdquo; Responses</p>
                <p className="text-3xl font-bold text-slate-700">{otherEntries.length}</p>
              </div>
            </div>

            {/* ── SECTION 2 — BREAKDOWN BY CANCELLATION TYPE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ReasonBreakdown
                title="Subscription Cancellation Reasons"
                items={subCancels}
                accentColor="bg-amber-500"
              />
              <ReasonBreakdown
                title="Account Deletion Reasons"
                items={acctDeletes}
                accentColor="bg-red-500"
              />
            </div>

            {/* Legacy records without context */}
            {unknownCtx.length > 0 && (
              <div className="mb-8">
                <ReasonBreakdown
                  title={`Uncategorised (pre-context records) — ${unknownCtx.length}`}
                  items={unknownCtx}
                  accentColor="bg-gray-400"
                />
              </div>
            )}

            {/* ── SECTION 3 — OTHER FREE-TEXT RESPONSES ── */}
            {otherEntries.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">&ldquo;Other&rdquo; — Free-Text Responses</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <OtherTextSection
                    title="Subscription Cancellation"
                    items={subCancels}
                  />
                  <OtherTextSection
                    title="Account Deletion"
                    items={acctDeletes}
                  />
                  {unknownCtx.length > 0 && (
                    <OtherTextSection title="Uncategorised" items={unknownCtx} />
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION 4 — INDIVIDUAL RECORDS ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">All Cancellation Records</h2>
                {/* ── SECTION 5 — EXPORT ── */}
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm"
                >
                  Export CSV
                </button>
              </div>

              {cancellations.length === 0 ? (
                <p className="text-gray-600">No cancellation records yet.</p>
              ) : (
                <div className="space-y-3">
                  {cancellations.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${contextBadge(item.cancellationContext)}`}>
                              {contextLabel(item.cancellationContext)}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {item.userEmail || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {item.cancellationReasons && item.cancellationReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.cancellationReasons.map((reason, i) => (
                                <span
                                  key={i}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs text-rose-800"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.description && (
                            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
