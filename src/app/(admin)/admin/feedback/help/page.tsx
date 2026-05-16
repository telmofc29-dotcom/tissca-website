'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { exportFeedbackToCSV, type FeedbackSubmission, type FeedbackStatus } from '@/utils/feedback';

function AreaBreakdown({ items }: { items: FeedbackSubmission[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((f) => {
      const s = f.section || 'other';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [items]);

  if (counts.length === 0) return <p className="text-gray-500 text-sm">No data yet.</p>;

  return (
    <div className="space-y-2.5">
      {counts.map(([section, count]) => {
        const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
        return (
          <div key={section} className="flex items-center gap-3">
            <div className="w-44 text-sm text-slate-700 truncate capitalize" title={section}>{section.replace(/-/g, ' ')}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-20 text-right text-sm font-semibold text-slate-800">{count} ({pct}%)</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminHelpRequestsPage() {
  const [items, setItems] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/feedback?type=help');
        if (!res.ok) return;
        const json = await res.json();
        setItems(json.feedback ?? []);
      } catch (err) {
        console.warn('[AdminHelpRequestsPage] Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const blocked = useMemo(() => items.filter((i) => i.isBlocked), [items]);
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { new: 0, 'in-progress': 0, done: 0 };
    items.forEach((i) => { map[i.status] = (map[i.status] || 0) + 1; });
    return map;
  }, [items]);

  const handleExportCSV = () => {
    const csv = exportFeedbackToCSV(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `help-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    const c: Record<FeedbackStatus, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      'in-progress': 'bg-amber-100 text-amber-800 border-amber-200',
      done: 'bg-green-100 text-green-800 border-green-200',
    };
    return c[status];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            &larr; Back to Feedback
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">🤔 Help Requests</h1>
          <p className="text-gray-600">Users asking for guidance, confused about features, or needing assistance.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">Loading help request data&hellip;</div>
        )}

        {!loading && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-600">Total Help Requests</p>
                <p className="text-3xl font-bold text-blue-600">{items.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-5">
                <p className="text-sm text-gray-600">🚫 Blocked</p>
                <p className="text-3xl font-bold text-red-700">{blocked.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-blue-200 p-5">
                <p className="text-sm text-gray-600">New</p>
                <p className="text-3xl font-bold text-blue-600">{statusCounts.new}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-5">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-amber-600">{statusCounts['in-progress']}</p>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-5">
                <p className="text-sm text-gray-600">Done</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.done}</p>
              </div>
            </div>

            {/* Area Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Help Requests by Area</h2>
              <AreaBreakdown items={items} />
            </div>

            {/* All Records */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">All Help Request Records</h2>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm"
                >
                  📥 Export CSV
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-gray-600">No help requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/admin/feedback/${item.id}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            {item.isBlocked && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                                🚫 Blocked
                              </span>
                            )}
                            <span className="text-sm font-semibold text-slate-900">{item.headline}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            <span className="capitalize">{(item.section || 'other').replace(/-/g, ' ')}</span>
                            <span>{item.userEmail || 'Anonymous'}</span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
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
