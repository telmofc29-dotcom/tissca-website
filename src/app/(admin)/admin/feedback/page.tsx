'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  exportFeedbackToCSV,
  type FeedbackSubmission,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackSection,
} from '@/utils/feedback';

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [filtered, setFiltered] = useState<FeedbackSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [cancelReasonCounts, setCancelReasonCounts] = useState<Record<string, number>>({});

  // Filter state
  const [filterType, setFilterType] = useState<FeedbackType | ''>('');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | ''>('');
  const [filterSection, setFilterSection] = useState<FeedbackSection | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeedback = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSection) params.set('section', filterSection);

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();

      const items: FeedbackSubmission[] = json.feedback ?? [];
      setFeedback(items);
      setStats(json.stats ?? null);
      setCancelReasonCounts(json.stats?.cancellationReasonCounts ?? {});

      // Client-side search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        setFiltered(items.filter(f =>
          f.headline.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.userEmail?.toLowerCase().includes(q)
        ));
      } else {
        setFiltered(items);
      }
    } catch (err) {
      console.warn('[AdminFeedbackPage] Failed to load feedback:', err);
    }
  };

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, filterSection, searchQuery]);

  const handleExportCSV = () => {
    const csv = exportFeedbackToCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: FeedbackType) => {
    const labels: Record<FeedbackType, string> = { help: '🤔 Help', issue: '🐛 Issue', suggestion: '💡 Improvement', review: '⭐ Review', cancellation: '🚪 Cancellation' };
    return labels[type];
  };

  const getStatusBadgeColor = (status: FeedbackStatus) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-amber-100 text-amber-800',
      done: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Feedback & Reviews</h1>
          <p className="text-gray-600">Manage user feedback, bug reports, and improvement suggestions.</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <Link
              href="/admin/feedback/issues"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <p className="text-sm text-gray-600 group-hover:text-red-600 transition-colors">🐛 Issues</p>
              <p className="text-2xl font-bold text-red-600">{stats.byType.issue}</p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-red-500 transition-colors">View details →</p>
            </Link>
            <Link
              href="/admin/feedback/suggestions"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <p className="text-sm text-gray-600 group-hover:text-green-600 transition-colors">💡 Suggestions</p>
              <p className="text-2xl font-bold text-green-600">{stats.byType.suggestion}</p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-green-500 transition-colors">View details →</p>
            </Link>
            <Link
              href="/admin/feedback/help"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">🤔 Help Requests</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byType.help}</p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-blue-500 transition-colors">View details →</p>
            </Link>
            <Link
              href="/admin/feedback/reviews"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <p className="text-sm text-gray-600 group-hover:text-amber-600 transition-colors">⭐ Avg Rating</p>
              <p className="text-2xl font-bold text-amber-600">{stats.avgRating.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-amber-500 transition-colors">View details →</p>
            </Link>
            <Link
              href="/admin/feedback/cancellations"
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-rose-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <p className="text-sm text-gray-600 group-hover:text-rose-600 transition-colors">🚪 Cancellations</p>
              <p className="text-2xl font-bold text-rose-600">{stats.byType.cancellation}</p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-rose-500 transition-colors">View details →</p>
            </Link>
          </div>
        )}

        {/* Cancellation Reasons Breakdown */}
        {Object.keys(cancelReasonCounts).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">🚪 Cancellation Reasons</h2>
              <Link
                href="/admin/feedback/cancellations"
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all font-medium text-sm"
              >
                View Detailed Drill-Down →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(cancelReasonCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-700">{reason}</span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FeedbackType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="help">Help</option>
                <option value="issue">Issue</option>
                <option value="suggestion">Suggestion</option>
                <option value="review">Review</option>
                <option value="cancellation">Cancellation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value as FeedbackSection | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sections</option>
                <option value="homepage">Homepage</option>
                <option value="pricing">Pricing</option>
                <option value="download">Download</option>
                <option value="signin">Sign In / Account</option>
                <option value="member-app">Member App</option>
                <option value="quotes-invoices">Quotes / Invoices</option>
                <option value="leads-jobs">Leads / Jobs</option>
                <option value="billing">Billing / Subscription</option>
                <option value="calculators">Calculators</option>
                <option value="guides">Guides</option>
                <option value="docs">Docs</option>
                <option value="settings">Settings</option>
                <option value="support">Support / Help</option>
                <option value="admin">Admin</option>
                <option value="subscription">Subscription</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Feedback List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No feedback found matching your filters.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <Link
                key={item.id}
                href={`/admin/feedback/${item.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold">{getTypeLabel(item.type)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">{item.section}</span>
                      {item.isBlocked && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          🚫 Blocked
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{item.headline}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>📍 {item.url}</span>
                      <span>🕐 {new Date(item.timestamp).toLocaleDateString()}</span>
                      <span>📱 {item.deviceType}</span>
                    </div>
                  </div>
                  {item.rating && <div className="text-2xl">⭐ {item.rating}</div>}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="mt-8 text-sm text-gray-600">
          Showing {filtered.length} of {feedback.length} feedback items
        </div>
      </div>
    </div>
  );
}
