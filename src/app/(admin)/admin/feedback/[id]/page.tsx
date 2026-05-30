'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import type { FeedbackStatus, FeedbackSeverity, FeedbackReproducibility } from '@/utils/feedback';

interface PageProps {
  params: {
    id: string;
  };
}

export default function AdminFeedbackDetailPage({ params }: PageProps) {
  const [feedback, setFeedback] = useState<any>(null);
  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [internalNotes, setInternalNotes] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [triageTags, setTriageTags] = useState('');
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium');
  const [reproducibility, setReproducibility] = useState<FeedbackReproducibility | ''>('');
  const [fixedInVersion, setFixedInVersion] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) { setLoadError(true); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setLoadError(true); return; }

        const res = await fetch(`/api/feedback/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 404) { setLoadError(true); return; }
        if (!res.ok) { setLoadError(true); return; }
        const json = await res.json();
        const row = json.feedback;
        setFeedback(row);
        setStatus((row.status ?? 'new') as FeedbackStatus);
        setInternalNotes(row.internal_notes ?? '');
        setAdminReply(row.admin_reply ?? '');
        setTriageTags((row.triage_tags ?? []).join(', '));
        setSeverity((row.severity ?? 'medium') as FeedbackSeverity);
        setReproducibility((row.reproducibility ?? '') as FeedbackReproducibility | '');
        setFixedInVersion(row.fixed_in_version ?? '');
        setDuplicateOfId(row.duplicate_of_id ?? '');
      } catch {
        setLoadError(true);
      }
    };
    load();
  }, [params.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const tagsArray = triageTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/feedback/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status,
          internal_notes: internalNotes,
          admin_reply: adminReply || undefined,
          triage_tags: tagsArray,
          severity,
          reproducibility: reproducibility || undefined,
          fixed_in_version: fixedInVersion || undefined,
          duplicate_of_id: duplicateOfId || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setFeedback(json.feedback);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-8">
        <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">← Back to Feedback</Link>
        <p className="text-red-600 mt-4">Feedback item not found or access denied.</p>
      </div>
    );
  }

  if (!feedback) {
    return <div className="p-8">Loading...</div>;
  }

  const getTypeEmoji = (type: string) => {
    const emojis = { help: '🤔', issue: '🐛', suggestion: '💡', review: '⭐' };
    return emojis[type as keyof typeof emojis] || '❓';
  };

  // Light-surface form fields: must declare text colour explicitly.
  // Global body sets color: rgba(255,255,255,0.92) and Tailwind Preflight sets
  // color:inherit on form elements — omitting text-gray-900 makes text invisible.
  const ADM_TEXTAREA =
    'w-full px-4 py-2 bg-white text-gray-900 caret-gray-900 border border-gray-300 rounded-lg ' +
    'placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none';
  const ADM_INPUT =
    'w-full px-4 py-2 bg-white text-gray-900 caret-gray-900 border border-gray-300 rounded-lg ' +
    'placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const ADM_INPUT_SM =
    'w-full px-3 py-2 bg-white text-gray-900 caret-gray-900 border border-gray-300 rounded-lg ' +
    'placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';
  const ADM_SELECT =
    'w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4';
  const ADM_SELECT_SM =
    'w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

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

              {/* Screenshot Gallery */}
              {Array.isArray(feedback.screenshots) && feedback.screenshots.length > 0 && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">
                    Screenshots ({feedback.screenshots.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(feedback.screenshots as string[]).map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setScreenshotModal(url)}
                        className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all group bg-gray-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black/50 px-2 py-1 rounded">
                            View
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">User Information</h2>
                <div className="space-y-2 text-sm">
                  {feedback.user_email && (
                    <p>
                      <span className="font-medium text-gray-700">Email:</span>{' '}
                      <a href={`mailto:${feedback.user_email}`} className="text-blue-600 hover:underline">
                        {feedback.user_email}
                      </a>
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Device:</span> {feedback.device_type}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Platform:</span>{' '}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      {feedback.platform ?? 'web'}
                    </span>
                    {feedback.app_version && (
                      <span className="ml-2 text-gray-500">v{feedback.app_version}{feedback.build_number ? ` (${feedback.build_number})` : ''}</span>
                    )}
                    {feedback.os_version && (
                      <span className="ml-2 text-gray-500">{feedback.os_version}</span>
                    )}
                  </p>
                  {feedback.alpha_tester && (
                    <p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                        α Alpha Tester
                      </span>
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Page:</span>{' '}
                    <a href={feedback.url} className="text-blue-600 hover:underline">
                      {feedback.url}
                    </a>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Submitted:</span>{' '}
                    {new Date(feedback.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Internal Notes</h2>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal notes for your team..."
                  rows={4}
                  className={ADM_TEXTAREA}
                />
              </div>

              {/* Admin Reply */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Admin Reply</h2>
                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Reply to the user (sets replied_at timestamp)..."
                  rows={4}
                  className={ADM_TEXTAREA}
                />
                {feedback.replied_at && (
                  <p className="text-xs text-gray-500 mt-1">Last replied: {new Date(feedback.replied_at).toLocaleString()}</p>
                )}
              </div>

              {/* Triage Tags */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Triage Tags</h2>
                <input
                  type="text"
                  value={triageTags}
                  onChange={(e) => setTriageTags(e.target.value)}
                  placeholder="Comma-separated tags, e.g. billing, urgent, ios"
                  className={ADM_INPUT}
                />
                <p className="text-xs text-gray-400 mt-1">Separate tags with commas.</p>
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
                className={ADM_SELECT}
              >
                <option value="new">🔵 New</option>
                <option value="investigating">🔍 Investigating</option>
                <option value="planned">📋 Planned</option>
                <option value="in_progress">🔧 In Progress</option>
                <option value="fixed">✅ Fixed</option>
                <option value="released">🚀 Released</option>
                <option value="closed">🔒 Closed</option>
                <option value="duplicate">🔁 Duplicate</option>
                <option disabled value="">── legacy ──</option>
                <option value="in-progress">🟡 In Progress (legacy)</option>
                <option value="done">✅ Done (legacy)</option>
              </select>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
              >
                {isSaving ? 'Saving...' : '💾 Save Changes'}
              </button>

              {saved && <p className="text-xs text-green-600 mt-2">✓ Changes saved</p>}
              {feedback.status_changed_at && (
                <p className="text-xs text-gray-400 mt-2">
                  Status changed: {new Date(feedback.status_changed_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Triage */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-slate-900 mb-4">Triage</h3>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                  className={ADM_SELECT_SM}
                >
                  <option value="low">⚪ Low</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reproducibility</label>
                <select
                  value={reproducibility}
                  onChange={(e) => setReproducibility(e.target.value as FeedbackReproducibility | '')}
                  className={ADM_SELECT_SM}
                >
                  <option value="">Not set</option>
                  <option value="always">Always</option>
                  <option value="sometimes">Sometimes</option>
                  <option value="rare">Rare</option>
                  <option value="unable_to_reproduce">Unable to reproduce</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fixed in version</label>
                <input
                  type="text"
                  value={fixedInVersion}
                  onChange={(e) => setFixedInVersion(e.target.value)}
                  placeholder="e.g. 2.2.0"
                  className={ADM_INPUT_SM}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duplicate of ID</label>
                <input
                  type="text"
                  value={duplicateOfId}
                  onChange={(e) => setDuplicateOfId(e.target.value)}
                  placeholder="FB-..."
                  className={`${ADM_INPUT_SM} font-mono`}
                />
              </div>
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
                  <dd className="text-blue-800">{new Date(feedback.updated_at).toLocaleDateString()}</dd>
                </div>
                {feedback.user_agent && (
                  <div>
                    <dt className="font-medium text-blue-900">User Agent</dt>
                    <dd className="text-blue-800 text-xs truncate">{feedback.user_agent}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {screenshotModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setScreenshotModal(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setScreenshotModal(null)}
              className="absolute -top-10 right-0 text-white text-sm hover:text-gray-300 font-medium"
            >
              ✕ Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotModal}
              alt="Screenshot preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <a
              href={screenshotModal}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-9 left-0 text-white text-sm hover:text-gray-300 underline"
            >
              Open full size ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
