// src/app/(admin)/admin/email-intelligence/page.tsx
//
// PURPOSE:
// Admin page for managing the email intelligence system.
// Sections: Campaigns, Templates, Queue, History, Performance.
// All data is real from Supabase — no mocks.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { TEMPLATE_META } from '@/lib/email-intelligence';
import type { EmailTemplateKey } from '@/lib/email-intelligence';

/* ─── Types ─── */

interface Campaign {
  id: string;
  trigger_type: string;
  enabled: boolean;
  priority: number;
  min_gap_hours: number;
  max_per_day: number;
  description: string;
  updated_at: string;
}

interface Template {
  id: string;
  template_key: string;
  enabled: boolean;
  subject: string;
  preview_text: string;
  html_body: string;
  text_body: string;
  updated_at: string;
}

interface QueueItem {
  id: string;
  visitor_id: string;
  email: string;
  trigger_type: string;
  template_key: string;
  subject: string;
  priority: number;
  status: string;
  error: string | null;
  scheduled_at: string;
  created_at: string;
  sent_at: string | null;
  attempts: number;
}

interface HistoryItem {
  id: string;
  email: string;
  trigger_type: string;
  template_key: string;
  subject: string;
  status: string;
  error: string | null;
  provider_id: string | null;
  sent_at: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
}

interface Performance {
  totalSent: number;
  totalFailed: number;
  perTemplate: Record<string, { sent: number; failed: number }>;
  perTrigger: Record<string, { sent: number; failed: number }>;
}

type Tab = 'campaigns' | 'templates' | 'queue' | 'history' | 'performance';

/* ─── Helpers ─── */

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

/* ─── Main ─── */

export default function EmailIntelligencePage() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [queueFilter, setQueueFilter] = useState<string>('');

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState('upgrade_push');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // System settings state
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [trackingStats, setTrackingStats] = useState<{ totalOpens: number; totalClicks: number } | null>(null);

  // Manual run state
  const [runningAction, setRunningAction] = useState<'triggers' | 'send' | 'cycle' | null>(null);
  const [runResult, setRunResult] = useState<{ ok: boolean; action: string; message: string; detail?: Record<string, unknown> } | null>(null);

  const getToken = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/admin/email-intelligence?section=all`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) return;
      const data = await res.json();

      setCampaigns(data.campaigns || []);
      setTemplates(data.templates || []);
      setQueue(data.queue || []);
      setQueueStats(data.queueStats || { pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0 });
      setHistory(data.history || []);
      setPerformance(data.performance || null);
      setSystemSettings(data.systemSettings || {});
      setTrackingStats(data.tracking || null);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const apiPut = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;
      await fetch('/api/admin/email-intelligence', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'campaigns', label: 'Campaigns', icon: '🎯' },
    { key: 'templates', label: 'Templates', icon: '📝' },
    { key: 'queue', label: 'Queue', icon: '📬' },
    { key: 'history', label: 'History', icon: '📋' },
    { key: 'performance', label: 'Performance', icon: '📊' },
  ];

  const sendTestEmailHandler = async () => {
    if (!testEmail) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/email-intelligence/test-send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, templateKey: testTemplate }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: data.message || 'Test email sent!' });
      } else {
        const parts = [data.error || `Failed (${res.status})`];
        if (data.detail) parts.push(data.detail);
        if (data.debug) parts.push(`Debug: ${JSON.stringify(data.debug)}`);
        setTestResult({ ok: false, message: parts.join(' — ') });
      }
    } catch {
      setTestResult({ ok: false, message: 'Network error — check console' });
    } finally {
      setTestSending(false);
    }
  };

  const toggleSystemSetting = async (key: string) => {
    const currentValue = systemSettings[key] || 'true';
    const newValue = currentValue === 'true' ? 'false' : 'true';
    await apiPut({ action: 'update_system_setting', key, value: newValue });
  };

  const runManualAction = async (action: 'triggers' | 'send' | 'cycle') => {
    setRunningAction(action);
    setRunResult(null);
    try {
      const token = await getToken();
      if (!token) return;
      const endpoint = `/api/admin/email-intelligence/run-${action === 'triggers' ? 'triggers' : action === 'send' ? 'send' : 'cycle'}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const msg = action === 'triggers'
          ? `Scanned ${data.usersScanned} users, queued ${data.emailsQueued} emails (${data.skipped} skipped) in ${data.durationMs}ms`
          : action === 'send'
          ? `Sent ${data.sent} emails (${data.failed} failed) in ${data.durationMs}ms`
          : `Triggers: ${data.triggers?.emailsQueued ?? 0} queued · Sends: ${data.sends?.sent ?? 0} sent in ${data.totalDurationMs}ms`;
        setRunResult({ ok: true, action, message: msg, detail: data });
        await loadData(); // Refresh all stats
      } else {
        const parts = [data.error || `Action failed (${res.status})`];
        if (data.detail) parts.push(data.detail);
        if (data.debug) parts.push(`Debug: ${JSON.stringify(data.debug)}`);
        setRunResult({ ok: false, action, message: parts.join(' — ') });
      }
    } catch {
      setRunResult({ ok: false, action, message: 'Network error' });
    } finally {
      setRunningAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Email Intelligence</h1>
        <p className="mt-1 text-sm text-slate-500">Manage automated email campaigns, templates, and monitor delivery.</p>
      </div>

      {/* ═══ OPERATIONS PANEL ═══ */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Manual Operations</h2>
        <p className="text-xs text-slate-500">Cron is disabled on the Vercel Hobby plan. Use these buttons to run the email pipeline manually.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => runManualAction('triggers')}
            disabled={runningAction !== null}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <span className="text-lg">🔍</span>
            <span className="text-sm font-medium text-blue-900">
              {runningAction === 'triggers' ? 'Scanning…' : 'Run Trigger Scan'}
            </span>
            <span className="text-[10px] text-blue-600">Evaluate behaviour → queue emails</span>
          </button>

          <button
            onClick={() => runManualAction('send')}
            disabled={runningAction !== null}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 p-4 text-center hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            <span className="text-lg">📤</span>
            <span className="text-sm font-medium text-green-900">
              {runningAction === 'send' ? 'Sending…' : 'Send Queued Emails'}
            </span>
            <span className="text-[10px] text-green-600">Drain queue → send via Resend</span>
          </button>

          <button
            onClick={() => runManualAction('cycle')}
            disabled={runningAction !== null}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 p-4 text-center hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            <span className="text-lg">🔄</span>
            <span className="text-sm font-medium text-purple-900">
              {runningAction === 'cycle' ? 'Running…' : 'Run Full Cycle'}
            </span>
            <span className="text-[10px] text-purple-600">Trigger scan + send in one step</span>
          </button>
        </div>

        {/* Run result feedback */}
        {runResult && (
          <div className={`rounded-lg p-3 text-sm ${
            runResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span className="font-medium">{runResult.ok ? '✓' : '✗'}</span>{' '}
            {runResult.message}
          </div>
        )}

        {/* Last run timestamps */}
        {(systemSettings.last_trigger_run || systemSettings.last_send_run || systemSettings.last_cycle_run) && (
          <div className="border-t border-gray-100 pt-3">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">Last Run</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
              {systemSettings.last_trigger_run && (
                <div>
                  <span className="font-medium text-slate-700">Trigger scan:</span>{' '}
                  {formatDate(systemSettings.last_trigger_run)}
                </div>
              )}
              {systemSettings.last_send_run && (
                <div>
                  <span className="font-medium text-slate-700">Queue send:</span>{' '}
                  {formatDate(systemSettings.last_send_run)}
                </div>
              )}
              {systemSettings.last_cycle_run && (
                <div>
                  <span className="font-medium text-slate-700">Full cycle:</span>{' '}
                  {formatDate(systemSettings.last_cycle_run)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ═══ CAMPAIGNS TAB ═══ */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">
              No campaign settings found. Run the SQL migration to seed defaults.
            </div>
          ) : campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{c.trigger_type}</span>
                    {statusBadge(c.enabled ? 'sent' : 'cancelled')}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{c.description || 'No description'}</p>
                </div>
                <button
                  onClick={() => apiPut({ action: 'update_campaign', trigger_type: c.trigger_type, enabled: !c.enabled })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    c.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    c.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Priority</label>
                  <input
                    type="number"
                    defaultValue={c.priority}
                    onBlur={(e) => apiPut({ action: 'update_campaign', trigger_type: c.trigger_type, priority: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Min Gap (hours)</label>
                  <input
                    type="number"
                    defaultValue={c.min_gap_hours}
                    onBlur={(e) => apiPut({ action: 'update_campaign', trigger_type: c.trigger_type, min_gap_hours: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max/Day</label>
                  <input
                    type="number"
                    defaultValue={c.max_per_day}
                    onBlur={(e) => apiPut({ action: 'update_campaign', trigger_type: c.trigger_type, max_per_day: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Updated: {formatDate(c.updated_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {tab === 'templates' && !editTemplate && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Admin-edited templates override built-in defaults. Create a template to customise it.</p>
          {(['upgrade_push', 'activation', 'feature_discovery', 'stuck_help', 'revenue_push'] as EmailTemplateKey[]).map((key) => {
            const existing = templates.find((t) => t.template_key === key);
            const meta = TEMPLATE_META[key];
            return (
              <div key={key} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{meta?.label || key}</span>
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 uppercase tracking-wide">
                      {meta?.type || 'lifecycle'}
                    </span>
                    {existing ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${existing.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {existing.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        Built-in
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditTemplate(existing || {
                      id: '',
                      template_key: key,
                      enabled: true,
                      subject: '',
                      preview_text: '',
                      html_body: '',
                      text_body: '',
                      updated_at: '',
                    })}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-50"
                  >
                    {existing ? 'Edit' : 'Customise'}
                  </button>
                </div>
                <div className="mt-2 space-y-0.5">
                  {existing?.subject ? (
                    <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Subject:</span> {existing.subject}</p>
                  ) : (
                    <p className="text-xs text-slate-400"><span className="font-medium text-slate-500">Subject:</span> Uses dynamic built-in subject</p>
                  )}
                  <p className="text-xs text-slate-400"><span className="font-medium text-slate-500">Preview:</span> {meta?.previewText || '—'}</p>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-300">{key}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Template editor */}
      {tab === 'templates' && editTemplate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Editing: <span className="font-mono">{editTemplate.template_key}</span>
            </h2>
            <button
              onClick={() => setEditTemplate(null)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              ← Back to list
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 w-20">Enabled</label>
              <button
                onClick={() => setEditTemplate({ ...editTemplate, enabled: !editTemplate.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editTemplate.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  editTemplate.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Subject</label>
              <input
                value={editTemplate.subject}
                onChange={(e) => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                placeholder="Email subject line"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Preview Text</label>
              <input
                value={editTemplate.preview_text}
                onChange={(e) => setEditTemplate({ ...editTemplate, preview_text: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                placeholder="Preview text shown in inbox"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">HTML Body</label>
              <textarea
                value={editTemplate.html_body}
                onChange={(e) => setEditTemplate({ ...editTemplate, html_body: e.target.value })}
                rows={10}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-mono focus:border-blue-400 focus:outline-none"
                placeholder="<html>...</html>"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Text Body</label>
              <textarea
                value={editTemplate.text_body}
                onChange={(e) => setEditTemplate({ ...editTemplate, text_body: e.target.value })}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-mono focus:border-blue-400 focus:outline-none"
                placeholder="Plain text version..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await apiPut({
                    action: 'update_template',
                    template_key: editTemplate.template_key,
                    enabled: editTemplate.enabled,
                    subject: editTemplate.subject,
                    preview_text: editTemplate.preview_text,
                    html_body: editTemplate.html_body,
                    text_body: editTemplate.text_body,
                  });
                  setEditTemplate(null);
                }}
                disabled={saving || !editTemplate.subject}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Template'}
              </button>
              <button
                onClick={() => setEditTemplate(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-slate-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Live HTML Preview */}
          {editTemplate.html_body && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Live Preview</h3>
              <div className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <iframe
                  srcDoc={editTemplate.html_body}
                  title="Template Preview"
                  className="w-full border-0"
                  style={{ height: '460px', pointerEvents: 'none' }}
                  sandbox=""
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ QUEUE TAB ═══ */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-2">
            {(['pending', 'processing', 'sent', 'failed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setQueueFilter(queueFilter === s ? '' : s)}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  queueFilter === s ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-lg font-bold text-slate-900">{queueStats[s]}</div>
                <div className="text-xs capitalize text-slate-500">{s}</div>
              </button>
            ))}
          </div>

          {/* Queue table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Recipient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Trigger</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Template</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Priority</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(queueFilter ? queue.filter((q) => q.status === queueFilter) : queue).map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">{q.email}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{q.trigger_type}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{q.template_key}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{q.priority}</td>
                    <td className="px-4 py-2">{statusBadge(q.status)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-2">
                      {(q.status === 'pending' || q.status === 'processing') && (
                        <button
                          onClick={() => apiPut({ action: 'cancel_queue_item', queue_id: q.id })}
                          disabled={saving}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                      {q.error && (
                        <span className="text-xs text-red-500" title={q.error}>⚠️</span>
                      )}
                    </td>
                  </tr>
                ))}
                {queue.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No items in queue</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Recipient</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Trigger</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Template</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Provider ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{h.email}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{h.trigger_type}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{h.template_key}</td>
                  <td className="px-4 py-2 text-xs text-slate-700 max-w-[200px] truncate">{h.subject}</td>
                  <td className="px-4 py-2">{statusBadge(h.status)}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{h.provider_id || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{formatDate(h.sent_at)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No email history yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ PERFORMANCE TAB ═══ */}
      {tab === 'performance' && performance && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
              <div className="text-3xl font-bold text-green-600">{performance.totalSent}</div>
              <div className="text-sm text-slate-500">Total Sent</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
              <div className="text-3xl font-bold text-red-500">{performance.totalFailed}</div>
              <div className="text-sm text-slate-500">Total Failed</div>
            </div>
          </div>

          {/* Per trigger */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Volume by Trigger Type</h3>
            {Object.entries(performance.perTrigger).length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(performance.perTrigger).map(([trigger, stats]) => {
                  const total = stats.sent + stats.failed;
                  const pct = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                  return (
                    <div key={trigger}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-mono">{trigger}</span>
                        <span>{stats.sent} sent · {stats.failed} failed ({pct}% success)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Per template */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Volume by Template</h3>
            {Object.entries(performance.perTemplate).length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(performance.perTemplate).map(([template, stats]) => {
                  const total = stats.sent + stats.failed;
                  const pct = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                  return (
                    <div key={template}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-mono">{template}</span>
                        <span>{stats.sent} sent · {stats.failed} failed ({pct}% success)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'performance' && !performance && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-400">
          No performance data available yet
        </div>
      )}

      {/* ═══ SYSTEM SETTINGS + TEST EMAIL ═══ */}
      <div className="mt-8 space-y-6">
        {/* System Settings Toggles */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">System Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-700">Enable Tracking</span>
                <p className="text-xs text-slate-500">Track email opens and link clicks</p>
              </div>
              <button
                onClick={() => toggleSystemSetting('tracking_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  (systemSettings.tracking_enabled || 'true') === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  (systemSettings.tracking_enabled || 'true') === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-700">Enable Unsubscribe</span>
                <p className="text-xs text-slate-500">Include unsubscribe links in all emails</p>
              </div>
              <button
                onClick={() => toggleSystemSetting('unsubscribe_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  (systemSettings.unsubscribe_enabled || 'true') === 'true' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  (systemSettings.unsubscribe_enabled || 'true') === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Tracking stats */}
          {trackingStats && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{trackingStats.totalOpens}</div>
                <div className="text-xs text-slate-500">Total Opens</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-600">{trackingStats.totalClicks}</div>
                <div className="text-xs text-slate-500">Total Clicks</div>
              </div>
            </div>
          )}
        </div>

        {/* Test Email Tool */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Send Test Email</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Email Address</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Template</label>
              <select
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="upgrade_push">upgrade_push — Upgrade Push</option>
                <option value="activation">activation — Activation</option>
                <option value="feature_discovery">feature_discovery — Feature Discovery</option>
                <option value="stuck_help">stuck_help — Stuck Help</option>
                <option value="revenue_push">revenue_push — Revenue Push</option>
              </select>
            </div>
            <button
              onClick={sendTestEmailHandler}
              disabled={testSending || !testEmail}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {testSending ? 'Sending…' : 'Send Test Email'}
            </button>
            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${
                testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
