'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { exportFeedbackToCSV, type FeedbackSubmission } from '@/utils/feedback';
import { getSupabaseClient } from '@/lib/supabase';

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('')}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [items, setItems] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        let token: string | undefined;
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token;
        }
        const res = await fetch('/api/feedback?type=review', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        setItems(json.feedback ?? []);
      } catch (err) {
        console.warn('[AdminReviewsPage] Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const avgRating = useMemo(() => {
    const rated = items.filter((i) => i.rating && i.rating > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, i) => sum + (i.rating || 0), 0) / rated.length;
  }, [items]);

  const starCounts = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    items.forEach((i) => {
      if (i.rating && i.rating >= 1 && i.rating <= 5) {
        map[i.rating] = (map[i.rating] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  const handleExportCSV = () => {
    const csv = exportFeedbackToCSV(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">⭐ User Reviews</h1>
          <p className="text-gray-600">Star ratings, comments, and overall satisfaction insights.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">Loading review data&hellip;</div>
        )}

        {!loading && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-amber-600">{items.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-5">
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-amber-600">{avgRating.toFixed(1)}</p>
                <StarDisplay rating={Math.round(avgRating)} />
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-5">
                <p className="text-sm text-gray-600">5-Star Reviews</p>
                <p className="text-3xl font-bold text-green-600">{starCounts[5]}</p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Rating Distribution</h2>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = starCounts[star] || 0;
                  const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-slate-700 text-right">{star} star{star !== 1 ? 's' : ''}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-20 text-right text-sm font-semibold text-slate-800">{count} ({pct}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All Reviews */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">All Reviews</h2>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm"
                >
                  📥 Export CSV
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-gray-600">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/admin/feedback/${item.id}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-amber-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {item.rating && <StarDisplay rating={item.rating} />}
                            <span className="text-sm font-semibold text-slate-900">{item.headline}</span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-slate-600 line-clamp-3">{item.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
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
