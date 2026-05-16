// src/lib/sync-diagnostics/timeline.ts
//
// Lightweight in-memory + sessionStorage timeline for the Sync Diagnostics viewer.
//
// SAFETY / SCOPE:
// - Browser-only. Never sent to Supabase.
// - Capped at MAX_EVENTS to prevent unbounded growth.
// - Persisted to sessionStorage so it survives client-side route changes
//   but is automatically cleared when the tab closes.
// - All messages are sanitised — no JWTs, no Supabase keys, no emails, no rawPayload.
// - Field names mirror the Android canonical contract so reports from web/Android/iOS
//   are directly comparable.

export type TimelineSeverity = 'info' | 'success' | 'warn' | 'error';

export type TimelineEventKind =
  // Push / Pull / Realtime — N/A on web (server source of truth) but mirrored for parity
  | 'PUSH_START'
  | 'PUSH_SUCCESS'
  | 'PUSH_FAILED'
  | 'PULL_START'
  | 'PULL_SUCCESS'
  | 'PULL_FAILED'
  | 'REALTIME_CONNECTED'
  | 'REALTIME_DISCONNECTED'
  // Entity / integrity events — meaningful on web
  | 'ENTITY_QUARANTINED'
  | 'ORPHAN_DETECTED'
  | 'ATTACHMENT_REPARENTED'
  | 'JOB_PUSH_ATTEMPT'
  | 'JOB_PUSH_SUCCESS'
  | 'JOB_PUSH_FAILED'
  | 'LEAD_CONVERTED'
  | 'FULL_SYNC_SUCCESS'
  | 'FULL_SYNC_FAILED'
  // Web-specific operational events (recorded as the operator uses the panel)
  | 'DIAGNOSTICS_REFRESHED'
  | 'DRILLDOWN_OPENED'
  | 'INTEGRITY_SCAN'
  | 'NETWORK_ONLINE'
  | 'NETWORK_OFFLINE';

export type TimelineEvent = {
  id: string;
  ts: number;                       // Date.now()
  kind: TimelineEventKind;
  severity: TimelineSeverity;
  workspace_id_short: string | null;
  table?: string | null;
  entity_ids?: string[];
  duration_ms?: number;
  message: string;                  // sanitised, <= 240 chars
  details?: Record<string, string | number | boolean | null>;
};

const STORAGE_KEY = 'tissca.syncDiagnostics.timeline.v1';
const MAX_EVENTS = 200;
const MAX_MESSAGE_LEN = 240;

// Patterns we strip from any message that flows into the timeline.
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]'],
  [/sbp_[A-Za-z0-9]+/g, '[REDACTED_SUPABASE_KEY]'],
  [/sk-[A-Za-z0-9]{20,}/g, '[REDACTED_API_KEY]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]'],
  [/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]'],
];

function sanitise(input: string): string {
  let out = input;
  for (const [pattern, replacement] of SECRET_PATTERNS) out = out.replace(pattern, replacement);
  if (out.length > MAX_MESSAGE_LEN) out = out.slice(0, MAX_MESSAGE_LEN - 1) + '…';
  return out;
}

function shortWs(workspaceId: string | null | undefined): string | null {
  if (!workspaceId) return null;
  return workspaceId.length > 12 ? `${workspaceId.slice(0, 8)}…${workspaceId.slice(-4)}` : workspaceId;
}

function genId(): string {
  // Crypto if available, else timestamp-rand fallback.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try { return crypto.randomUUID(); } catch { /* fall through */ }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

let cache: TimelineEvent[] | null = null;

function load(): TimelineEvent[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) { cache = []; return cache; }
    const parsed = JSON.parse(raw) as TimelineEvent[];
    cache = Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

function persist(events: TimelineEvent[]) {
  cache = events;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch { /* sessionStorage may be full or disabled */ }
}

const subscribers = new Set<(events: TimelineEvent[]) => void>();

function notify() {
  const snapshot = [...(cache ?? [])];
  for (const s of subscribers) {
    try { s(snapshot); } catch { /* subscriber failures must never break logging */ }
  }
}

export function recordEvent(input: {
  kind: TimelineEventKind;
  severity?: TimelineSeverity;
  workspaceId?: string | null;
  table?: string | null;
  entityIds?: string[];
  durationMs?: number;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}): TimelineEvent {
  const event: TimelineEvent = {
    id: genId(),
    ts: Date.now(),
    kind: input.kind,
    severity: input.severity ?? defaultSeverity(input.kind),
    workspace_id_short: shortWs(input.workspaceId),
    table: input.table ?? null,
    entity_ids: input.entityIds && input.entityIds.length > 0 ? input.entityIds.slice(0, 25) : undefined,
    duration_ms: input.durationMs,
    message: sanitise(input.message),
    details: input.details,
  };
  const existing = load();
  const next = [...existing, event].slice(-MAX_EVENTS);
  persist(next);
  notify();
  return event;
}

export function getEvents(): TimelineEvent[] {
  return [...load()].reverse(); // newest-first
}

export function clearEvents(): void {
  persist([]);
  notify();
}

export function subscribe(fn: (events: TimelineEvent[]) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function defaultSeverity(kind: TimelineEventKind): TimelineSeverity {
  if (kind.endsWith('_FAILED') || kind === 'ORPHAN_DETECTED' || kind === 'ENTITY_QUARANTINED' || kind === 'REALTIME_DISCONNECTED' || kind === 'NETWORK_OFFLINE') return 'error';
  if (kind.endsWith('_SUCCESS') || kind === 'REALTIME_CONNECTED' || kind === 'NETWORK_ONLINE' || kind === 'ATTACHMENT_REPARENTED') return 'success';
  if (kind === 'DRILLDOWN_OPENED' || kind === 'INTEGRITY_SCAN' || kind === 'DIAGNOSTICS_REFRESHED') return 'info';
  if (kind.endsWith('_ATTEMPT') || kind.endsWith('_START') || kind === 'LEAD_CONVERTED') return 'info';
  return 'warn';
}

// Convenience filter for the UI.
export type TimelineFilter = 'all' | 'errors' | 'push' | 'pull' | 'realtime' | 'attachments' | 'jobs' | 'leads';

export function filterEvents(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  switch (filter) {
    case 'errors':      return events.filter(e => e.severity === 'error');
    case 'push':        return events.filter(e => e.kind.startsWith('PUSH_') || e.kind.startsWith('JOB_PUSH_'));
    case 'pull':        return events.filter(e => e.kind.startsWith('PULL_') || e.kind === 'DIAGNOSTICS_REFRESHED' || e.kind === 'INTEGRITY_SCAN');
    case 'realtime':    return events.filter(e => e.kind.startsWith('REALTIME_') || e.kind === 'NETWORK_ONLINE' || e.kind === 'NETWORK_OFFLINE');
    case 'attachments': return events.filter(e => e.table === 'tool_attachments' || e.kind === 'ORPHAN_DETECTED' || e.kind === 'ATTACHMENT_REPARENTED');
    case 'jobs':        return events.filter(e => e.table === 'jobs' || e.kind.startsWith('JOB_'));
    case 'leads':       return events.filter(e => e.table === 'leads' || e.kind === 'LEAD_CONVERTED');
    case 'all':
    default:            return events;
  }
}
