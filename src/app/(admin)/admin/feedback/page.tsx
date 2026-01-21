'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAllFeedback,
  filterFeedback,
  getFeedbackStats,
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

  // Filter state
  const [filterType, setFilterType] = useState<FeedbackType | ''>('');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | ''>('');
  const [filterSection, setFilterSection] = useState<FeedbackSection | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const applyFilters = () => {
    const result = filterFeedback({
      type: filterType as FeedbackType | undefined,
      status: filterStatus as FeedbackStatus | undefined,
      section: filterSection as FeedbackSection | undefined,
      search: searchQuery,
    });
    setFiltered(result);
  };

  useEffect(() => {
    // Load feedback
    const allFeedback = getAllFeedback();
    setFeedback(allFeedback);
    setStats(getFeedbackStats());
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, filterSection, searchQuery, feedback]);

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
    const labels = { help: '🤔 Help', issue: '🐛 Issue', suggestion: '💡 Improvement', review: '⭐ Review' };
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">🐛 Issues</p>
              <p className="text-2xl font-bold text-red-600">{stats.byType.issue}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">💡 Suggestions</p>
              <p className="text-2xl font-bold text-green-600">{stats.byType.suggestion}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">🤔 Help Requests</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byType.help}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">⭐ Avg Rating</p>
              <p className="text-2xl font-bold text-amber-600">{stats.avgRating.toFixed(1)}</p>
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
                <option value="calculators">Calculators</option>
                <option value="guides">Guides</option>
                <option value="docs">Docs</option>
                <option value="admin">Admin</option>
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
