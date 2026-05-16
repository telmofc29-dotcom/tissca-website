// src/app/(member)/app/settings/sync-diagnostics/page.tsx
//
// Settings → Sync Diagnostics (Internal — owner/admin only)
//
// PHASE 2: Entity drill-down + Sync Timeline + Health v2.
// PHASE 3: Recovery candidates + Repair simulation + Integrity passes.
//
// SAFETY:
// - Read-only. No destructive actions. No silent auto-repair.
// - Safe actions only: refresh, drill-down, simulate, copy IDs, export JSON.
// - Sanitised payloads from all server endpoints.
// - Timeline in sessionStorage only — never sent to Supabase.
// - Simulation results are previews only — no mutations triggered.
// - autoRepairAllowed: false on every candidate and simulation result.
// - Field names mirror Android canonical contract for cross-platform parity.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  recordEvent,
  getEvents,
  clearEvents,
  subscribe,
  filterEvents,
  type TimelineEvent,
  type TimelineFilter,
  type TimelineSeverity,
} from '@/lib/sync-diagnostics/timeline';
import { runAllPasses } from '@/lib/sync-diagnostics/verification-passes';
import { generateSimulationReport } from '@/lib/sync-diagnostics/simulation';
import type {
  RecoveryCandidate,
  RecoveryCandidateList,
  SimulationResult,
  IntegrityPassResult,
  RecoverySeverity,
  IntegrityPassStatus,
  ConfidenceLevel,
} from '@/lib/sync-diagnostics/types';

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

type EntityCounts = {
  leads: number; jobs: number; tasks: number; assets: number;
  documents: number; tool_attachments: number; payment_requests: number; clients: number;
};

type AttachmentIntegrity = {
  orphan_count: number;
  parent_mismatch_count: number;
  workspace_id_missing_count: number;
};

type LastActivity = {
  last_lead_created_at_millis: number | null;
  last_job_created_at_millis: number | null;
  last_tool_attachment_created_at_millis: number | null;
  last_document_created_at: string | null;
  last_crm_history_at: string | null;
};

type DiagnosticsSnapshot = {
  generated_at: string;
  platform: 'web';
  workspace_id: string | null;
  user_id: string;
  role: string | null;
  remote_counts: EntityCounts;
  attachment_integrity: AttachmentIntegrity;
  last_activity: LastActivity;
  failed_tables: string[];
  realtime_status: string;
  notes: string[];
};

type DetailItem = {
  id: string;
  entity_type: string;
  parent_id?: string | null;
  parent_type?: string | null;
  tool_key?: string | null;
  title?: string | null;
  client_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  age_ms?: number | null;
  workspace_id?: string | null;
  blocked_reason?: string | null;
  likely_cause?: string | null;
  suggested_action?: string | null;
  parent_exists_remotely?: boolean | null;
  matching_job_for_lead?: string | null;
};

type DetailResponse = {
  generated_at: string;
  workspace_id: string;
  kind: string;
  count: number;
  truncated: boolean;
  items: DetailItem[];
  notes: string[];
};

type DetailKind =
  | 'orphans'
  | 'parent_mismatch'
  | 'workspace_id_missing'
  | 'failed_table'
  | 'recent_leads'
  | 'recent_jobs';

type Health = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';

const LAST_HEALTHY_KEY = 'tissca.syncDiagnostics.lastHealthy.v1';

// ─── Health engine v2 ─────────────────────────────────────────────────────────

function computeHealth(s: DiagnosticsSnapshot | null, realtime: string): Health {
  if (!s) return 'unknown';
  const ai = s.attachment_integrity;
  const integrityCritical = ai.orphan_count > 0 || ai.parent_mismatch_count > 0;
  const legacyBacklog = ai.workspace_id_missing_count > 0;
  const failures = s.failed_tables.length > 0;
  if (integrityCritical || failures) return 'red';
  if (legacyBacklog) return 'orange';
  if (realtime === 'offline') return 'orange';
  if (realtime !== 'connected' && realtime !== 'not_used') return 'yellow';
  return 'green';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SyncDiagnosticsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();

  // Phase 2 state
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('not_used');
  const [copied, setCopied] = useState(false);
  const [lastHealthyAt, setLastHealthyAt] = useState<string | null>(null);
  const [openDrill, setOpenDrill] = useState<{ kind: DetailKind; table?: string } | null>(null);
  const [drillData, setDrillData] = useState<DetailResponse | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => getEvents());
  const [tlFilter, setTlFilter] = useState<TimelineFilter>('all');
  const [tlExpandedId, setTlExpandedId] = useState<string | null>(null);

  // Phase 3 state
  const [recoveryList, setRecoveryList] = useState<RecoveryCandidateList | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simCandidate, setSimCandidate] = useState<RecoveryCandidate | null>(null);
  const [simCopied, setSimCopied] = useState(false);

  // ── Realtime / network ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const setFromNavigator = () => {
      const next = navigator.onLine ? 'not_used' : 'offline';
      setRealtimeStatus(prev => {
        if (prev === next) return prev;
        recordEvent({
          kind: next === 'offline' ? 'NETWORK_OFFLINE' : 'NETWORK_ONLINE',
          message: next === 'offline' ? 'Browser went offline.' : 'Browser back online.',
        });
        return next;
      });
    };
    setRealtimeStatus(navigator.onLine ? 'not_used' : 'offline');
    window.addEventListener('online', setFromNavigator);
    window.addEventListener('offline', setFromNavigator);
    return () => {
      window.removeEventListener('online', setFromNavigator);
      window.removeEventListener('offline', setFromNavigator);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { setLastHealthyAt(window.localStorage.getItem(LAST_HEALTHY_KEY)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => setTimeline(getEvents()));
    return unsub;
  }, []);

  // ── Snapshot loader ────────────────────────────────────────────────────────
  const loadSnapshot = useCallback(async (reason: 'initial' | 'manual' = 'initial') => {
    if (!accessToken) return;
    setSnapshotLoading(true);
    setSnapshotError(null);
    const start = Date.now();
    try {
      const res = await fetch('/api/workspace/sync-diagnostics', {
        method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      const duration = Date.now() - start;
      if (res.status === 403) {
        setSnapshotError('Sync diagnostics are restricted to workspace owners and admins.');
        setSnapshot(null);
        recordEvent({ kind: 'PULL_FAILED', message: 'Diagnostics access denied (403).', durationMs: duration });
        return;
      }
      if (!res.ok) {
        setSnapshotError(`Failed to load diagnostics (HTTP ${res.status}).`);
        setSnapshot(null);
        recordEvent({ kind: 'PULL_FAILED', message: `Snapshot HTTP ${res.status}.`, durationMs: duration });
        return;
      }
      const json = (await res.json()) as DiagnosticsSnapshot;
      setSnapshot(json);
      recordEvent({
        kind: reason === 'manual' ? 'DIAGNOSTICS_REFRESHED' : 'PULL_SUCCESS',
        message: `Snapshot loaded (${duration}ms). leads=${json.remote_counts.leads} jobs=${json.remote_counts.jobs} ta=${json.remote_counts.tool_attachments}.`,
        workspaceId: json.workspace_id,
        durationMs: duration,
      });
      if (computeHealth(json, navigator.onLine ? 'not_used' : 'offline') === 'green') {
        const stamp = new Date().toISOString();
        try { window.localStorage.setItem(LAST_HEALTHY_KEY, stamp); } catch { /* ignore */ }
        setLastHealthyAt(stamp);
        recordEvent({ kind: 'FULL_SYNC_SUCCESS', message: 'All diagnostics green.', workspaceId: json.workspace_id });
      }
      if (json.attachment_integrity.orphan_count > 0) {
        recordEvent({ kind: 'ORPHAN_DETECTED', message: `${json.attachment_integrity.orphan_count} orphan attachment(s) detected.`, workspaceId: json.workspace_id, table: 'tool_attachments' });
      }
    } catch (e) {
      const duration = Date.now() - start;
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSnapshotError(msg);
      recordEvent({ kind: 'PULL_FAILED', message: `Snapshot threw: ${msg}`, durationMs: duration });
    } finally {
      setSnapshotLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!ctxLoading) loadSnapshot('initial');
  }, [ctxLoading, loadSnapshot]);

  // ── Drill-down ─────────────────────────────────────────────────────────────
  const openDrillDown = useCallback(async (kind: DetailKind, table?: string) => {
    if (!accessToken) return;
    setOpenDrill({ kind, table }); setDrillData(null); setDrillError(null); setExpandedRowId(null); setDrillLoading(true);
    recordEvent({ kind: 'DRILLDOWN_OPENED', message: `Drill-down opened: ${kind}${table ? ` (${table})` : ''}.`, table: table ?? null });
    const params = new URLSearchParams({ kind });
    if (table) params.set('table', table);
    try {
      const res = await fetch(`/api/workspace/sync-diagnostics/details?${params.toString()}`, {
        method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      if (!res.ok) { setDrillError(`HTTP ${res.status}`); return; }
      setDrillData((await res.json()) as DetailResponse);
    } catch (e) {
      setDrillError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setDrillLoading(false);
    }
  }, [accessToken]);

  const closeDrillDown = useCallback(() => {
    setOpenDrill(null); setDrillData(null); setDrillError(null); setExpandedRowId(null);
  }, []);

  const reRunIntegrity = useCallback(async () => {
    recordEvent({ kind: 'INTEGRITY_SCAN', message: 'Manual integrity re-scan requested.' });
    await loadSnapshot('manual');
  }, [loadSnapshot]);

  // ── Phase 3: Recovery analysis ─────────────────────────────────────────────
  const loadRecovery = useCallback(async () => {
    if (!accessToken) return;
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await fetch('/api/workspace/sync-diagnostics/recovery', {
        method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      if (!res.ok) {
        setRecoveryError(`Recovery analysis failed (HTTP ${res.status}).`);
        recordEvent({ kind: 'FULL_SYNC_FAILED', message: `Recovery analysis HTTP ${res.status}.` });
        return;
      }
      const json = (await res.json()) as RecoveryCandidateList;
      setRecoveryList(json);
      recordEvent({
        kind: 'INTEGRITY_SCAN',
        message: `Recovery analysis: ${json.total_count} candidate(s). critical=${json.critical_count} high=${json.high_count}.`,
      });
    } catch (e) {
      setRecoveryError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setRecoveryLoading(false);
    }
  }, [accessToken]);

  // ── Phase 3: Simulation ────────────────────────────────────────────────────
  const runSimulation = useCallback(async (candidate: RecoveryCandidate) => {
    if (!accessToken) return;
    setSimCandidate(candidate);
    setSimResult(null);
    setSimLoading(true);
    const params = new URLSearchParams({ type: candidate.type, entityId: candidate.entityId });
    if (candidate.targetEntityId) params.set('targetEntityId', candidate.targetEntityId);
    try {
      const res = await fetch(`/api/workspace/sync-diagnostics/simulate?${params.toString()}`, {
        method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setSimResult({
          candidateId: candidate.candidateId, candidateType: candidate.type,
          simulatedAt: new Date().toISOString(), feasible: false,
          blockers: [(errBody as { error?: string }).error ?? `HTTP ${res.status}`],
          warnings: [], steps: [], affectedEntityIds: [],
          rollbackPossible: false, rollbackNotes: 'No data changed.',
          estimatedSyncImpact: 'None.', requiresManualConfirmation: true,
          autoRepairAllowed: false, summary: 'Simulation request failed.',
        });
        return;
      }
      const json = (await res.json()) as SimulationResult;
      setSimResult(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSimResult({
        candidateId: candidate.candidateId, candidateType: candidate.type,
        simulatedAt: new Date().toISOString(), feasible: false,
        blockers: [msg], warnings: [], steps: [], affectedEntityIds: [],
        rollbackPossible: false, rollbackNotes: 'No data changed.',
        estimatedSyncImpact: 'None.', requiresManualConfirmation: true,
        autoRepairAllowed: false, summary: 'Simulation threw an error.',
      });
    } finally {
      setSimLoading(false);
    }
  }, [accessToken]);

  // ── Copy / export ──────────────────────────────────────────────────────────
  const handleCopyReport = async () => {
    if (!snapshot) return;
    const report = buildTextReport(snapshot, realtimeStatus, lastHealthyAt, timeline);
    try { await navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy diagnostics report:', report); }
  };

  const handleExportJson = () => {
    if (!snapshot) return;
    const payload = { snapshot, browser_realtime_status: realtimeStatus, last_healthy_at: lastHealthyAt, timeline, recovery: recoveryList, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `tissca-sync-diagnostics-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyDrillIds = async () => {
    if (!drillData) return;
    const text = drillData.items.map(i => i.id).join('\n');
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('Copy IDs:', text); }
  };

  const handleCopySimReport = async () => {
    if (!simResult) return;
    const report = generateSimulationReport(simResult);
    try { await navigator.clipboard.writeText(report); setSimCopied(true); setTimeout(() => setSimCopied(false), 2000); }
    catch { window.prompt('Copy simulation report:', report); }
  };

  // ── Memos ──────────────────────────────────────────────────────────────────
  const health = useMemo(() => computeHealth(snapshot, realtimeStatus), [snapshot, realtimeStatus]);

  const filteredTimeline = useMemo(() => filterEvents(timeline, tlFilter), [timeline, tlFilter]);

  // Phase 3: integrity passes (pure client computation — no network)
  const integrityPasses = useMemo<IntegrityPassResult[]>(() => {
    if (!snapshot) return [];
    return runAllPasses({ snapshot, realtimeStatus });
  }, [snapshot, realtimeStatus]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sync Diagnostics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Internal observability + recovery engine. Read-only. Owner / admin only.
          </p>
        </div>
        <Link href="/app/settings" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50">
          ← Settings
        </Link>
      </div>

      {snapshotError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{snapshotError}</div>
      )}

      {!snapshotError && !snapshot && (snapshotLoading || ctxLoading) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-slate-600">Loading diagnostics…</div>
      )}

      {snapshot && (
        <>
          {/* ── Header card ─────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <HealthBadge health={health} />
              <button onClick={() => loadSnapshot('manual')} disabled={snapshotLoading} className={pillBtn}>
                {snapshotLoading ? 'Refreshing…' : 'Refresh diagnostics'}
              </button>
              <button onClick={reRunIntegrity} disabled={snapshotLoading} className={pillBtn}>Re-run integrity scan</button>
              <button onClick={handleCopyReport} className={pillBtn}>{copied ? 'Copied ✓' : 'Copy report'}</button>
              <button onClick={handleExportJson} className={pillBtn}>Export JSON</button>
              <span className="ml-auto text-xs text-slate-500">
                Generated {formatIso(snapshot.generated_at)} · Last healthy {lastHealthyAt ? formatIso(lastHealthyAt) : '—'}
              </span>
            </div>
          </section>

          {/* ── Identity ─────────────────────────────────────────────────── */}
          <Card title="Identity">
            <Row label="Platform" value="web" />
            <Row label="Workspace ID" value={snapshot.workspace_id ?? '—'} mono />
            <Row label="User ID" value={snapshot.user_id} mono />
            <Row label="Role" value={snapshot.role ?? '—'} />
          </Card>

          {/* ── Local / unsynced — N/A on web ────────────────────────────── */}
          <Card title="Local counts (browser cache)">
            <Note>Web is server-source-of-truth. No DataStore / no offline cache. Local count fields are platform-N/A. (Android/iOS report meaningful values here.)</Note>
          </Card>
          <Card title="Unsynced / pending counts">
            <Note>Platform-N/A on web. All writes go directly to Supabase via API routes; no outbound sync queue exists. Use Android/iOS to inspect pending mutations or quarantined entities.</Note>
          </Card>

          {/* ── Remote counts ────────────────────────────────────────────── */}
          <Card title="Remote counts (Supabase, workspace-scoped)">
            <CountGrid counts={snapshot.remote_counts} onDrill={(label) => {
              if (label === 'Leads') openDrillDown('recent_leads');
              else if (label === 'Jobs') openDrillDown('recent_jobs');
            }} />
            {snapshot.failed_tables.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <div className="font-semibold">Failed tables: {snapshot.failed_tables.join(', ')}</div>
                <div className="flex flex-wrap gap-2">
                  {snapshot.failed_tables.map(t => (
                    <button key={t} onClick={() => openDrillDown('failed_table', t)} className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100">
                      Inspect {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ── Attachment integrity ─────────────────────────────────────── */}
          <Card title="Attachment integrity">
            <ClickableRow label="Orphan attachments (no parent_id / parent_type)" count={snapshot.attachment_integrity.orphan_count} onClick={() => openDrillDown('orphans')} />
            <ClickableRow label="Parent-mismatch attachments (parent not in workspace)" count={snapshot.attachment_integrity.parent_mismatch_count} onClick={() => openDrillDown('parent_mismatch')} />
            <ClickableRow label="Legacy rows missing workspace_id (backfill candidates)" count={snapshot.attachment_integrity.workspace_id_missing_count} onClick={() => openDrillDown('workspace_id_missing')} />
            <Note>Click any non-zero row to inspect affected entities. Drill-downs are read-only. No automatic repair runs.</Note>
          </Card>

          {/* ── Last activity ─────────────────────────────────────────────── */}
          <Card title="Last activity (proxy for last sync)">
            <Row label="Last lead created"       value={formatMillis(snapshot.last_activity.last_lead_created_at_millis)} />
            <Row label="Last job created"        value={formatMillis(snapshot.last_activity.last_job_created_at_millis)} />
            <Row label="Last tool attachment"    value={formatMillis(snapshot.last_activity.last_tool_attachment_created_at_millis)} />
            <Row label="Last document generated" value={formatIso(snapshot.last_activity.last_document_created_at)} />
            <Row label="Last CRM history entry"  value={formatIso(snapshot.last_activity.last_crm_history_at)} />
          </Card>

          {/* ── Realtime ─────────────────────────────────────────────────── */}
          <Card title="Realtime">
            <Row label="Browser network status" value={realtimeStatus} />
            <Row label="Server realtime channel" value={snapshot.realtime_status} />
            <Note>The website doesn&apos;t maintain a workspace-wide realtime subscription. Realtime usage is limited to TissChat conversation pages.</Note>
          </Card>

          {/* ── Server notes ─────────────────────────────────────────────── */}
          {snapshot.notes.length > 0 && (
            <Card title="Server notes">
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                {snapshot.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </Card>
          )}

          {/* ── SYNC TIMELINE ────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sync Timeline</h2>
              <span className="text-xs text-slate-500">{timeline.length} event{timeline.length === 1 ? '' : 's'} (capped 200, session-only)</span>
              <div className="ml-auto flex flex-wrap gap-1">
                {(['all','errors','push','pull','realtime','attachments','jobs','leads'] as TimelineFilter[]).map(f => (
                  <button key={f} onClick={() => setTlFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${tlFilter === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'}`}>
                    {f}
                  </button>
                ))}
                <button onClick={() => { clearEvents(); recordEvent({ kind: 'DIAGNOSTICS_REFRESHED', message: 'Timeline cleared by operator.' }); }} className={pillBtn}>Clear</button>
              </div>
            </div>
            {filteredTimeline.length === 0 ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-slate-500">No timeline events for this filter.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredTimeline.map(ev => (
                  <li key={ev.id} className="py-2">
                    <button onClick={() => setTlExpandedId(tlExpandedId === ev.id ? null : ev.id)} className="flex w-full items-start gap-3 text-left">
                      <SeverityDot severity={ev.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">{ev.kind}</span>
                          {ev.table && <span className="text-xs text-slate-500">· {ev.table}</span>}
                          {typeof ev.duration_ms === 'number' && <span className="text-xs text-slate-500">· {ev.duration_ms}ms</span>}
                          <span className="ml-auto text-xs text-slate-400">{formatRelative(ev.ts)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-700">{ev.message}</div>
                      </div>
                    </button>
                    {tlExpandedId === ev.id && (
                      <div className="mt-2 ml-6 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-slate-700">
                        <Row label="Timestamp" value={new Date(ev.ts).toISOString()} mono />
                        <Row label="Workspace" value={ev.workspace_id_short ?? '—'} mono />
                        {ev.entity_ids && ev.entity_ids.length > 0 && <Row label="Entity IDs" value={ev.entity_ids.join(', ')} mono />}
                        {ev.details && Object.entries(ev.details).map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── PHASE 3: INTEGRITY VERIFICATION PASSES ───────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Integrity Passes</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Phase 3 · Client-computed</span>
              <span className="text-xs text-slate-500">{integrityPasses.length} pass{integrityPasses.length === 1 ? '' : 'es'}</span>
            </div>
            <IntegrityPassesPanel passes={integrityPasses} />
          </section>

          {/* ── PHASE 3: RECOVERY ANALYSIS ───────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recovery Analysis</h2>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Read-only · No auto-repair</span>
              <div className="ml-auto flex gap-2">
                <button onClick={loadRecovery} disabled={recoveryLoading} className={pillBtn}>
                  {recoveryLoading ? 'Analysing…' : recoveryList ? 'Re-run analysis' : 'Run recovery analysis'}
                </button>
              </div>
            </div>

            {!recoveryList && !recoveryLoading && !recoveryError && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Recovery analysis generates structured repair candidates from live workspace data.</p>
                <p>It detects: orphan attachments, parent mismatches, legacy workspace_id gaps, and re-parentable entities.</p>
                <p className="mt-1">All candidates show: likelihood, confidence, preview, and required manual steps. <strong>autoRepairAllowed: false on all results.</strong></p>
                <p className="mt-1 italic">Press "Run recovery analysis" to start. Read-only — no data will be changed.</p>
              </div>
            )}

            {recoveryError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{recoveryError}</div>
            )}

            {recoveryLoading && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-slate-600">Analysing workspace entities…</div>
            )}

            {recoveryList && !recoveryLoading && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Critical', count: recoveryList.critical_count, cls: 'border-red-200 bg-red-50 text-red-800' },
                    { label: 'High', count: recoveryList.high_count, cls: 'border-orange-200 bg-orange-50 text-orange-800' },
                    { label: 'Medium', count: recoveryList.medium_count, cls: 'border-amber-200 bg-amber-50 text-amber-800' },
                    { label: 'Low', count: recoveryList.low_count, cls: 'border-gray-200 bg-gray-50 text-slate-600' },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className={`rounded-lg border px-3 py-2 text-xs font-medium ${cls}`}>
                      {label}: {count}
                    </div>
                  ))}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-slate-500">
                    Generated {formatIso(recoveryList.generated_at)}
                  </div>
                </div>

                {recoveryList.notes.length > 0 && (
                  <ul className="list-disc space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 pl-7 text-xs text-slate-600">
                    {recoveryList.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                )}

                {recoveryList.candidates.length === 0 ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800">
                    ✓ No recovery candidates found — workspace entities appear consistent.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recoveryList.candidates.map(candidate => (
                      <RecoveryCandidateCard
                        key={candidate.candidateId}
                        candidate={candidate}
                        onSimulate={runSimulation}
                        simLoading={simLoading}
                        activeSimCandidateId={simCandidate?.candidateId ?? null}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── DRILL-DOWN MODAL ─────────────────────────────────────────────── */}
      {openDrill && (
        <DrillDownModal
          title={drillTitle(openDrill.kind, openDrill.table)}
          loading={drillLoading} error={drillError} data={drillData}
          expandedRowId={expandedRowId} setExpandedRowId={setExpandedRowId}
          onClose={closeDrillDown} onCopyIds={copyDrillIds}
        />
      )}

      {/* ── SIMULATION MODAL (Phase 3) ───────────────────────────────────── */}
      {simCandidate && (
        <SimulationModal
          candidate={simCandidate}
          result={simResult}
          loading={simLoading}
          copied={simCopied}
          onCopyReport={handleCopySimReport}
          onClose={() => { setSimCandidate(null); setSimResult(null); }}
        />
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const pillBtn = 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:opacity-50';

// ─── Phase 2 subcomponents ────────────────────────────────────────────────────

function HealthBadge({ health }: { health: Health }) {
  const styles: Record<Health, string> = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-800 border-amber-200',
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    unknown: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const label: Record<Health, string> = {
    green: 'Healthy', yellow: 'Warnings', orange: 'Degraded',
    red: 'Failures detected', unknown: 'Unknown',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[health]}`}>
      ● {label[health]}
    </span>
  );
}

function SeverityDot({ severity }: { severity: TimelineSeverity }) {
  const c = severity === 'error' ? 'bg-red-500' : severity === 'warn' ? 'bg-amber-500' : severity === 'success' ? 'bg-emerald-500' : 'bg-slate-400';
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${c}`} />;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''} ${warn ? 'font-semibold text-red-700' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function ClickableRow({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <button onClick={onClick} disabled={count === 0}
        className={`rounded-full border px-3 py-1 text-sm font-semibold ${count === 0 ? 'cursor-default border-gray-100 bg-gray-50 text-slate-400' : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'}`}>
        {count}{count === 0 ? '' : ' · inspect →'}
      </button>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-slate-500">{children}</p>;
}

function CountGrid({ counts, onDrill }: { counts: EntityCounts; onDrill?: (label: string) => void }) {
  const items: Array<[string, number, boolean]> = [
    ['Leads', counts.leads, true], ['Jobs', counts.jobs, true],
    ['Tasks', counts.tasks, false], ['Assets', counts.assets, false],
    ['Documents', counts.documents, false], ['Tool attachments', counts.tool_attachments, false],
    ['Payment requests', counts.payment_requests, false], ['Clients', counts.clients, false],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([k, v, clickable]) => (
        <button key={k} onClick={() => clickable && onDrill?.(k)} disabled={!clickable}
          className={`rounded-lg border p-3 text-left ${clickable ? 'border-gray-200 bg-white hover:border-slate-400 hover:bg-slate-50' : 'cursor-default border-gray-100 bg-gray-50'}`}>
          <div className="text-xs text-slate-500">{k}{clickable ? ' →' : ''}</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{v}</div>
        </button>
      ))}
    </div>
  );
}

function DrillDownModal(props: {
  title: string; loading: boolean; error: string | null; data: DetailResponse | null;
  expandedRowId: string | null; setExpandedRowId: (id: string | null) => void;
  onClose: () => void; onCopyIds: () => void;
}) {
  const { title, loading, error, data, expandedRowId, setExpandedRowId, onClose, onCopyIds } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <div className="flex gap-2">
            <button onClick={onCopyIds} disabled={!data || data.items.length === 0} className={pillBtn}>Copy entity IDs</button>
            <button onClick={onClose} className={pillBtn}>Close</button>
          </div>
        </div>
        {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-slate-600">Loading…</div>}
        {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {data && (
          <>
            <div className="mb-3 text-xs text-slate-500">{data.count} item{data.count === 1 ? '' : 's'}{data.truncated && ' · truncated to first 100'} · generated {formatIso(data.generated_at)}</div>
            {data.notes.length > 0 && (
              <ul className="mb-3 list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 pl-7 text-xs text-amber-900">
                {data.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
            {data.items.length === 0 ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-slate-600">No items returned.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.items.map(item => (
                  <li key={item.id} className="py-2">
                    <button onClick={() => setExpandedRowId(expandedRowId === item.id ? null : item.id)} className="flex w-full items-start gap-3 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">{item.id}</span>
                          <span className="text-xs text-slate-500">· {item.entity_type}</span>
                          {item.tool_key && <span className="text-xs text-slate-500">· {item.tool_key}</span>}
                          {item.parent_type && <span className="text-xs text-slate-500">· parent={item.parent_type}</span>}
                          {item.age_ms != null && <span className="ml-auto text-xs text-slate-400">{formatAge(item.age_ms)}</span>}
                        </div>
                        {(item.title || item.client_name) && <div className="mt-0.5 text-xs text-slate-700">{[item.title, item.client_name].filter(Boolean).join(' · ')}</div>}
                        {item.likely_cause && <div className="mt-1 text-xs text-amber-800">⚠ {item.likely_cause}</div>}
                      </div>
                    </button>
                    {expandedRowId === item.id && (
                      <div className="mt-2 ml-2 space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-slate-700">
                        <Row label="Entity ID" value={item.id} mono />
                        <Row label="Entity type" value={item.entity_type} />
                        {item.parent_id != null   && <Row label="Parent ID"   value={item.parent_id ?? '—'} mono />}
                        {item.parent_type != null && <Row label="Parent type" value={item.parent_type ?? '—'} />}
                        {item.tool_key && <Row label="Tool key" value={item.tool_key} />}
                        {item.created_at && <Row label="Created" value={formatIso(item.created_at)} />}
                        {item.updated_at && <Row label="Updated" value={formatIso(item.updated_at)} />}
                        {item.parent_exists_remotely != null && <Row label="Parent exists remotely" value={item.parent_exists_remotely ? 'yes' : 'no'} warn={!item.parent_exists_remotely} />}
                        {item.matching_job_for_lead && <Row label="Recovery: matching job" value={item.matching_job_for_lead} mono />}
                        {item.blocked_reason && <Row label="Blocked reason" value={item.blocked_reason} warn />}
                        {item.likely_cause && <Row label="Likely cause" value={item.likely_cause} />}
                        {item.suggested_action && <Row label="Suggested action (manual)" value={item.suggested_action} />}
                        <Note>Read-only diagnostic. No automatic repair runs. Any fix must be applied manually with explicit confirmation.</Note>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Phase 3 subcomponents ────────────────────────────────────────────────────

function IntegrityPassesPanel({ passes }: { passes: IntegrityPassResult[] }) {
  const [expandedPass, setExpandedPass] = useState<string | null>(null);
  if (passes.length === 0) return <div className="text-xs text-slate-500">No snapshot loaded yet.</div>;

  return (
    <div className="divide-y divide-gray-100">
      {passes.map(pass => (
        <div key={pass.passName} className="py-2">
          <button onClick={() => setExpandedPass(expandedPass === pass.passName ? null : pass.passName)} className="flex w-full items-center gap-3 text-left">
            <PassStatusDot status={pass.status} />
            <span className="font-mono text-xs font-semibold text-slate-900">{pass.passName}</span>
            <span className="text-xs text-slate-500 hidden sm:inline">— {pass.description}</span>
            {pass.findings.length > 0 && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${pass.status === 'fail' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {pass.findings.length} finding{pass.findings.length === 1 ? '' : 's'}
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400">{pass.durationMs}ms</span>
          </button>
          {expandedPass === pass.passName && (
            <div className="mt-2 ml-5 space-y-2">
              {pass.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-500">
                  {pass.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
              {pass.findings.length > 0 && (
                <ul className="space-y-2">
                  {pass.findings.map(f => (
                    <li key={f.findingId} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                      <div className="flex items-baseline gap-2">
                        <RecoverySeverityBadge severity={f.severity} />
                        <span className="font-mono text-slate-700">{f.entityId}</span>
                        <span className="text-slate-500">· {f.entityType}</span>
                      </div>
                      <div className="mt-1 text-slate-700">{f.description}</div>
                      <div className="mt-1 text-slate-500 italic">→ {f.suggestedRepair}</div>
                    </li>
                  ))}
                </ul>
              )}
              {pass.findings.length === 0 && pass.status === 'pass' && (
                <div className="text-xs text-emerald-700">✓ No issues found in this pass.</div>
              )}
              {pass.status === 'skipped' && (
                <div className="text-xs text-slate-500 italic">This pass was skipped on this platform.</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RecoveryCandidateCard({ candidate, onSimulate, simLoading, activeSimCandidateId }: {
  candidate: RecoveryCandidate;
  onSimulate: (c: RecoveryCandidate) => void;
  simLoading: boolean;
  activeSimCandidateId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActiveSimulation = simLoading && activeSimCandidateId === candidate.candidateId;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RecoverySeverityBadge severity={candidate.severity} />
            <span className="text-sm font-semibold text-slate-900">{candidate.type}</span>
            <ConfidencePill level={candidate.confidenceLevel} />
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500">{candidate.entityId}</div>
          <div className="mt-1 text-sm text-slate-700">{candidate.likelyCause}</div>
          <div className="mt-1 text-xs text-amber-800">→ {candidate.suggestedAction}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => onSimulate(candidate)} disabled={simLoading}
            className={`${pillBtn} shrink-0`}>
            {isActiveSimulation ? 'Simulating…' : 'Simulate →'}
          </button>
          <button onClick={() => setExpanded(e => !e)} className={`${pillBtn} text-xs`}>
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
        {candidate.recoveryPreview}
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {candidate.reversible && <span className="text-emerald-700">✓ Reversible</span>}
        {candidate.requiresManualReview && <span className="text-amber-700">⚠ Manual review required</span>}
        {candidate.destructiveRisk && <span className="text-red-700">⚠ Destructive risk</span>}
        <span className="text-slate-400">autoRepairAllowed: false</span>
        <span className="text-slate-400 ml-auto">{formatAge(Date.now() - new Date(candidate.createdAt).getTime())} old</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-slate-700">
          <Row label="Candidate ID" value={candidate.candidateId} mono />
          <Row label="Entity type" value={candidate.entityType} />
          <Row label="Recoverability" value={candidate.recoverabilityClass} />
          {candidate.targetEntityId && <Row label="Target entity" value={`${candidate.targetEntityType ?? '?'} ${candidate.targetEntityId}`} mono />}
          {candidate.dependencies.length > 0 && <Row label="Dependencies" value={candidate.dependencies.join(', ')} mono />}
          {candidate.blockingEntities.length > 0 && <Row label="Blocked by" value={candidate.blockingEntities.join(', ')} mono />}
          <Row label="Detected" value={formatIso(candidate.detectedAt)} />
          <Note>This is a read-only candidate. Press &quot;Simulate →&quot; to preview what a repair would do. No action is taken automatically.</Note>
        </div>
      )}
    </div>
  );
}

function SimulationModal({ candidate, result, loading, copied, onCopyReport, onClose }: {
  candidate: RecoveryCandidate;
  result: SimulationResult | null;
  loading: boolean;
  copied: boolean;
  onCopyReport: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Repair Simulation</h3>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase">Read-only · No data changed</span>
          <div className="ml-auto flex gap-2">
            {result && <button onClick={onCopyReport} className={pillBtn}>{copied ? 'Copied ✓' : 'Copy report'}</button>}
            <button onClick={onClose} className={pillBtn}>Close</button>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-slate-700">
          <span className="font-semibold">{candidate.type}</span>
          <span className="mx-2 text-slate-400">·</span>
          <span className="font-mono">{candidate.entityId}</span>
          {candidate.targetEntityId && (
            <>
              <span className="mx-2 text-slate-400">→</span>
              <span className="font-mono">{candidate.targetEntityId}</span>
            </>
          )}
        </div>

        {loading && <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-slate-600">Running simulation…</div>}

        {result && (
          <div className="space-y-4">
            {/* Feasibility */}
            <div className={`rounded-lg border p-3 ${result.feasible ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              <div className="font-semibold">{result.feasible ? '✓ Simulation feasible' : '✗ Not feasible'}</div>
              <div className="mt-1 text-sm">{result.summary}</div>
            </div>

            {result.blockers.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <div className="font-semibold mb-1">Blockers</div>
                <ul className="list-disc pl-4 space-y-1">
                  {result.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold mb-1">Warnings</div>
                <ul className="list-disc pl-4 space-y-1">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {result.steps.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Simulated steps (not applied)</div>
                <ul className="space-y-2">
                  {result.steps.map(step => (
                    <li key={step.stepNumber} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                      <div className="font-semibold text-slate-900">Step {step.stepNumber}: {step.action}</div>
                      <div className="mt-1 text-slate-600">{step.targetEntityType} <span className="font-mono">{step.targetEntityId}</span></div>
                      {step.fieldChanges.map((fc, i) => (
                        <div key={i} className="mt-1 font-mono text-slate-700">
                          {fc.field}: <span className="text-red-700">&quot;{fc.from}&quot;</span> → <span className="text-emerald-700">&quot;{fc.to}&quot;</span>
                        </div>
                      ))}
                      <div className="mt-1 text-slate-500">Risk: {step.risk}</div>
                      <div className="text-slate-500">Reversible: {step.reversible ? 'Yes' : 'No'}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                <div className="font-semibold text-slate-700 mb-1">Rollback</div>
                <div className="text-slate-600">{result.rollbackPossible ? '✓ Possible' : '✗ Not possible'}</div>
                <div className="mt-1 text-slate-500">{result.rollbackNotes}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                <div className="font-semibold text-slate-700 mb-1">Sync impact</div>
                <div className="text-slate-600">{result.estimatedSyncImpact}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-semibold">autoRepairAllowed: {String(result.autoRepairAllowed)}</span>
              {' · '}Requires manual confirmation: {result.requiresManualConfirmation ? 'yes' : 'no'}
              <div className="mt-1 italic">This is a simulation only. No data has been changed. Phase 3C will add a gated execution path with full audit trail and rollback manifest.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PassStatusDot({ status }: { status: IntegrityPassStatus }) {
  const cls =
    status === 'pass'    ? 'bg-emerald-500' :
    status === 'warn'    ? 'bg-amber-500' :
    status === 'fail'    ? 'bg-red-500' :
    /* skipped */          'bg-slate-300';
  return <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function RecoverySeverityBadge({ severity }: { severity: RecoverySeverity }) {
  const s: Record<RecoverySeverity, string> = {
    critical: 'border-red-300 bg-red-50 text-red-800',
    high:     'border-orange-200 bg-orange-50 text-orange-800',
    medium:   'border-amber-200 bg-amber-50 text-amber-800',
    low:      'border-gray-200 bg-gray-50 text-slate-600',
    info:     'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${s[severity]}`}>{severity}</span>;
}

function ConfidencePill({ level }: { level: ConfidenceLevel }) {
  const s: Record<ConfidenceLevel, string> = {
    high:    'text-emerald-700',
    medium:  'text-amber-700',
    low:     'text-red-700',
    unknown: 'text-slate-400',
  };
  return <span className={`text-xs font-medium ${s[level]}`}>conf:{level}</span>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drillTitle(kind: DetailKind, table?: string): string {
  switch (kind) {
    case 'orphans':              return 'Orphan attachments';
    case 'parent_mismatch':      return 'Parent-mismatch attachments';
    case 'workspace_id_missing': return 'Legacy attachments missing workspace_id';
    case 'failed_table':         return `Failed table inspection: ${table ?? '?'}`;
    case 'recent_leads':         return 'Recent leads';
    case 'recent_jobs':          return 'Recent jobs';
  }
}

function formatMillis(ms: number | null): string {
  if (!ms) return '—';
  try { return new Date(ms).toLocaleString(); } catch { return String(ms); }
}

function formatIso(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatRelative(ts: number): string {
  return formatAge(Date.now() - ts);
}

function buildTextReport(
  s: DiagnosticsSnapshot, realtime: string,
  lastHealthy: string | null, timeline: TimelineEvent[],
): string {
  return [
    `TISSCA Sync Diagnostics — ${s.platform.toUpperCase()}`,
    `Generated:     ${s.generated_at}`,
    `Last healthy:  ${lastHealthy ?? '—'}`,
    ``,
    `Identity`,
    `  workspace_id: ${s.workspace_id ?? '—'}`,
    `  user_id:      ${s.user_id}`,
    `  role:         ${s.role ?? '—'}`,
    ``,
    `Health: ${computeHealth(s, realtime).toUpperCase()}`,
    ``,
    `Remote counts (Supabase, workspace-scoped)`,
    `  leads:            ${s.remote_counts.leads}`,
    `  jobs:             ${s.remote_counts.jobs}`,
    `  tasks:            ${s.remote_counts.tasks}`,
    `  assets:           ${s.remote_counts.assets}`,
    `  documents:        ${s.remote_counts.documents}`,
    `  tool_attachments: ${s.remote_counts.tool_attachments}`,
    `  payment_requests: ${s.remote_counts.payment_requests}`,
    `  clients:          ${s.remote_counts.clients}`,
    ``,
    `Attachment integrity`,
    `  orphan_count:                ${s.attachment_integrity.orphan_count}`,
    `  parent_mismatch_count:       ${s.attachment_integrity.parent_mismatch_count}`,
    `  workspace_id_missing_count:  ${s.attachment_integrity.workspace_id_missing_count}`,
    ``,
    `Last activity`,
    `  last_lead:            ${s.last_activity.last_lead_created_at_millis ?? '—'}`,
    `  last_job:             ${s.last_activity.last_job_created_at_millis ?? '—'}`,
    `  last_tool_attachment: ${s.last_activity.last_tool_attachment_created_at_millis ?? '—'}`,
    `  last_document:        ${s.last_activity.last_document_created_at ?? '—'}`,
    `  last_crm_history:     ${s.last_activity.last_crm_history_at ?? '—'}`,
    ``,
    `Failed tables:      ${s.failed_tables.length > 0 ? s.failed_tables.join(', ') : 'none'}`,
    `Realtime (server):  ${s.realtime_status}`,
    `Realtime (browser): ${realtime}`,
    ``,
    `Server notes:`,
    ...s.notes.map(n => `  - ${n}`),
    ``,
    `Sync timeline (most recent ${Math.min(timeline.length, 50)} events)`,
    ...timeline.slice(0, 50).map(ev =>
      `  [${new Date(ev.ts).toISOString()}] ${ev.severity.toUpperCase()} ${ev.kind}${ev.table ? ` (${ev.table})` : ''} — ${ev.message}`,
    ),
  ].join('\n');
}
