'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFeedbackById, updateFeedback, type FeedbackStatus } from '@/utils/feedback';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default function AdminFeedbackDetailPage({ params }: PageProps) {
  const [feedback, setFeedback] = useState<any>(null);
  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const item = getFeedbackById(params.id);
    if (!item) {
      notFound();
    }
    setFeedback(item);
    setStatus(item.status);
    setInternalNotes(item.internalNotes || '');
  }, [params.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = updateFeedback(params.id, {
        status,
        internalNotes,
      });
      
      if (updated) {
        setFeedback(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!feedback) {
    return <div className="p-8">Loading...</div>;
  }

  const getTypeEmoji = (type: string) => {
    const emojis = { help: '🤔', issue: '🐛', suggestion: '💡', review: '⭐' };
    return emojis[type as keyof typeof emojis] || '❓';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Feedback
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{getTypeEmoji(feedback.type)}</span>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">{feedback.headline}</h1>
                    <p className="text-sm text-gray-600 mt-1">ID: {feedback.id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium uppercase">
                    {feedback.type}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    {feedback.section}
                  </span>
                  {feedback.rating && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                      ⭐ Rating: {feedback.rating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{feedback.description}</p>
              </div>

              {/* User Info */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">User Information</h2>
                <div className="space-y-2 text-sm">
                  {feedback.userEmail && (
                    <p>
                      <span className="font-medium text-gray-700">Email:</span>{' '}
                      <a href={`mailto:${feedback.userEmail}`} className="text-blue-600 hover:underline">
                        {feedback.userEmail}
                      </a>
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Device:</span> {feedback.deviceType}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Page:</span>{' '}
                    <a href={feedback.url} className="text-blue-600 hover:underline">
                      {feedback.url}
                    </a>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Submitted:</span>{' '}
                    {new Date(feedback.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Internal Notes</h2>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal notes for your team..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-slate-900 mb-4">Status</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              >
                <option value="new">🔵 New</option>
                <option value="in-progress">🟡 In Progress</option>
                <option value="done">✅ Done</option>
              </select>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
              >
                {isSaving ? 'Saving...' : '💾 Save Changes'}
              </button>

              {saved && <p className="text-xs text-green-600 mt-2">✓ Changes saved</p>}
            </div>

            {/* Quick Info */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-bold text-blue-900 mb-3">Quick Info</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-blue-900">Type</dt>
                  <dd className="text-blue-800">{feedback.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-blue-900">Section</dt>
                  <dd className="text-blue-800">{feedback.section}</dd>
                </div>
                <div>
                  <dt className="font-medium text-blue-900">Last Updated</dt>
                  <dd className="text-blue-800">{new Date(feedback.updatedAt).toLocaleDateString()}</dd>
                </div>
                {feedback.userAgent && (
                  <div>
                    <dt className="font-medium text-blue-900">User Agent</dt>
                    <dd className="text-blue-800 text-xs truncate">{feedback.userAgent}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
