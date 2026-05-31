// src/app/(admin)/admin/notifications/page.tsx
//
// PURPOSE:
// Phase 4.5 enterprise notifications operations centre.
// Reads from GET /api/admin/notifications (admin_notifications joined with platform_events).
// Supports mark-read, mark-all-read, dismiss — all persisted to DB.
//
// Features: severity visual hierarchy, critical alert pinning, detail drawer,
// toast notifications (on poll), URL filter state persistence, search,
// shimmer loading, relative timestamps, premium empty states.
//
// Architecture: preserves Phase 3 polling (30s), visibility refresh,
// custom event dispatch — no backend changes.

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformEvent {
  id: string;
  module: string;
  event_type: string;
  severity: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  deep_link: string | null;
  metadata: Record<string, unknown>;
  workspace_id: string | null;
  source?: string | null;
  occurred_at: string;
}

interface AdminNotification {
  id: string;
  is_read: boolean;
  is_dismissed: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;  // Phase 5A — resolved from user_profiles by API
  assigned_at: string | null;       // Phase 5A
  claimed_at: string | null;        // Phase 5A
  handled_by: string | null;
  handled_at: string | null;
  escalated: boolean;
  workflow_status: string;           // Phase 5A — operational state machine
  created_at: string;
  platform_events: PlatformEvent | null;
}

interface ToastItem {
  id: string;
  message: string;
  severity: string;
  notifId: string | null;
}

// ─── Module configuration ─────────────────────────────────────────────────────

const MODULE_TABS = [
  { key: 'all',          label: 'All',          icon: '🔔' },
  { key: 'feedback',     label: 'Feedback',      icon: '💬' },
  { key: 'crm',          label: 'CRM',           icon: '👥' },
  { key: 'invoices',     label: 'Invoices',      icon: '🧾' },
  { key: 'subscription', label: 'Subscriptions', icon: '💳' },
  { key: 'sync',         label: 'Sync',          icon: '🔄' },
] as const;

type ModuleFilter = typeof MODULE_TABS[number]['key'];

const MODULE_CONFIG: Record<string, { icon: string; badgeCls: string; label: string }> = {
  feedback:     { icon: '💬', badgeCls: 'bg-blue-100 text-blue-700',      label: 'Feedback' },
  crm:          { icon: '👥', badgeCls: 'bg-green-100 text-green-700',    label: 'CRM' },
  invoices:     { icon: '🧾', badgeCls: 'bg-amber-100 text-amber-800',    label: 'Invoices' },
  subscription: { icon: '💳', badgeCls: 'bg-purple-100 text-purple-700',  label: 'Subscriptions' },
  sync:         { icon: '🔄', badgeCls: 'bg-rose-100 text-rose-700',      label: 'Sync' },
  release:      { icon: '🚀', badgeCls: 'bg-slate-100 text-slate-700',    label: 'Release' },
  ai:           { icon: '🤖', badgeCls: 'bg-indigo-100 text-indigo-700',  label: 'AI' },
  planner:      { icon: '📅', badgeCls: 'bg-teal-100 text-teal-700',      label: 'Planner' },
  chat:         { icon: '💬', badgeCls: 'bg-pink-100 text-pink-700',      label: 'Chat' },
  quotes:       { icon: '📋', badgeCls: 'bg-yellow-100 text-yellow-800',  label: 'Quotes' },
  accountant:   { icon: '📊', badgeCls: 'bg-emerald-100 text-emerald-700',label: 'Accountant' },
  admin:        { icon: '🛡️', badgeCls: 'bg-gray-100 text-gray-700',      label: 'Admin' },
};

function getModuleConfig(module?: string) {
  return MODULE_CONFIG[module ?? ''] ?? { icon: '📩', badgeCls: 'bg-gray-100 text-gray-600', label: module ?? 'System' };
}

// ─── Severity configuration ───────────────────────────────────────────────────

interface SeverityConfig {
  borderCls: string;
  bgUnread: string;
  dotCls: string;
  dotPulse: boolean;
  badgeBg: string;
  badgeText: string;
  label: string;
}

const SEVERITY_MAP: Record<string, SeverityConfig> = {
  critical: {
    borderCls: 'border-l-red-500',
    bgUnread:  'bg-red-50/50',
    dotCls:    'bg-red-500',
    dotPulse:  true,
    badgeBg:   'bg-red-100',
    badgeText: 'text-red-700',
    label:     'Critical',
  },
  high: {
    borderCls: 'border-l-orange-400',
    bgUnread:  'bg-orange-50/40',
    dotCls:    'bg-orange-400',
    dotPulse:  false,
    badgeBg:   'bg-orange-100',
    badgeText: 'text-orange-700',
    label:     'High',
  },
  medium: {
    borderCls: 'border-l-blue-400',
    bgUnread:  'bg-blue-50/30',
    dotCls:    'bg-blue-400',
    dotPulse:  false,
    badgeBg:   'bg-blue-100',
    badgeText: 'text-blue-700',
    label:     'Medium',
  },
  low: {
    borderCls: 'border-l-gray-300',
    bgUnread:  'bg-gray-50/40',
    dotCls:    'bg-gray-300',
    dotPulse:  false,
    badgeBg:   'bg-gray-100',
    badgeText: 'text-gray-500',
    label:     'Low',
  },
  info: {
    borderCls: 'border-l-gray-200',
    bgUnread:  'bg-gray-50/20',
    dotCls:    'bg-gray-200',
    dotPulse:  false,
    badgeBg:   'bg-gray-50',
    badgeText: 'text-gray-400',
    label:     'Info',
  },
};

function getSeverityConfig(severity?: string): SeverityConfig {
  return SEVERITY_MAP[severity ?? ''] ?? SEVERITY_MAP.info;
}

// ─── Workflow status configuration ─────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
}

const WORKFLOW_STATUS_CONFIG: Record<string, StatusConfig> = {
  NEW:                { label: 'New',              badgeBg: 'bg-gray-100',    badgeText: 'text-gray-500'   },
  INVESTIGATING:      { label: 'Investigating',    badgeBg: 'bg-blue-100',    badgeText: 'text-blue-700'   },
  WAITING_USER:       { label: 'Waiting: User',    badgeBg: 'bg-amber-100',   badgeText: 'text-amber-700'  },
  WAITING_ENGINEER:   { label: 'Waiting: Eng',     badgeBg: 'bg-orange-100',  badgeText: 'text-orange-700' },
  WAITING_ACCOUNTANT: { label: 'Waiting: Acct',    badgeBg: 'bg-yellow-100',  badgeText: 'text-yellow-800' },
  ESCALATED:          { label: 'Escalated',        badgeBg: 'bg-rose-100',    badgeText: 'text-rose-700'   },
  RESOLVED:           { label: 'Resolved',         badgeBg: 'bg-green-100',   badgeText: 'text-green-700'  },
  DISMISSED:          { label: 'Dismissed',        badgeBg: 'bg-gray-100',    badgeText: 'text-gray-400'   },
  REOPENED:           { label: 'Reopened',         badgeBg: 'bg-purple-100',  badgeText: 'text-purple-700' },
};

function getWorkflowStatusConfig(status?: string): StatusConfig {
  return WORKFLOW_STATUS_CONFIG[status ?? ''] ?? WORKFLOW_STATUS_CONFIG.NEW;
}

// ─── Activity timeline types + icons ─────────────────────────────────────────────

interface ActivityRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  occurred_at: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  CREATED:        '🔔',
  VIEWED:         '👁',
  CLAIMED:        '✋',
  ASSIGNED:       '➡️',
  REASSIGNED:     '↩',
  STATUS_CHANGED: '🔄',
  ESCALATED:      '⬆',
  NOTE_ADDED:     '📝',
  RESOLVED:       '✅',
  DISMISSED:      '🚫',
  REOPENED:       '🔁',
  READ:           '✓',
  READ_ALL:       '✓✓',
};

function formatActivityLabel(row: ActivityRow): string {
  const base = row.action.replace(/_/g, ' ').toLowerCase();
  if (row.from_status && row.to_status && row.action === 'STATUS_CHANGED') {
    return `${base}: ${row.from_status} → ${row.to_status}`;
  }
  return base;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'yesterday';
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatEventType(eventType?: string): string {
  if (!eventType) return '';
  return eventType.replace(/\./g, ' › ').replace(/_/g, ' ');
}

function getEventIcon(eventType?: string, module?: string): string {
  const t = eventType ?? '';
  if (t.includes('payment_failed')) return '⚠️';
  if (t.includes('cancel'))         return '🚫';
  if (t.includes('invoice'))        return '🧾';
  if (t.includes('feedback'))       return '💬';
  if (t.includes('lead'))           return '🎯';
  if (t.includes('job'))            return '🔧';
  if (t.includes('sync'))           return '🔄';
  if (t.includes('release') || t.includes('deploy')) return '🚀';
  return getModuleConfig(module).icon;
}

// ─── Skeleton loading card ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-l-4 border-l-gray-100 animate-pulse">
      <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-0.5">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-100" />
        <div className="h-6 w-6 rounded-full bg-gray-100" />
      </div>
      <div className="flex-1 space-y-2.5">
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-gray-100" />
          <div className="h-5 w-12 rounded-full bg-gray-100" />
        </div>
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
      <div className="flex-shrink-0 space-y-2">
        <div className="h-7 w-16 rounded-lg bg-gray-100" />
        <div className="h-7 w-16 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────

interface CardProps {
  notif: AdminNotification;
  onMarkRead: (id: string) => void;
  onDismiss:  (id: string) => void;
  onOpen:     (notif: AdminNotification) => void;
  onClaim:    (id: string) => void;          // Phase 5A
  currentUserId: string | null;             // Phase 5A
}

function NotificationCard({ notif, onMarkRead, onDismiss, onOpen, onClaim, currentUserId }: CardProps) {
  const evt     = notif.platform_events;
  const sev     = getSeverityConfig(evt?.severity);
  const mod     = getModuleConfig(evt?.module);
  const icon    = getEventIcon(evt?.event_type, evt?.module);
  const isUnread = !notif.is_read;
  const wfStatus = notif.workflow_status ?? 'NEW';
  const wfCfg    = getWorkflowStatusConfig(wfStatus);
  const isAssignedToMe = !!currentUserId && notif.assigned_to === currentUserId;
  const isClaimedByOther = !!notif.assigned_to && notif.assigned_to !== currentUserId;

  return (
    <div
      className={[
        'group relative flex items-start gap-4 px-5 py-4 border-l-4 transition-colors duration-100 cursor-pointer',
        sev.borderCls,
        isUnread ? sev.bgUnread : 'bg-white',
        'hover:bg-gray-50/80',
      ].join(' ')}
      onClick={() => onOpen(notif)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(notif); }
      }}
      aria-label={`Notification: ${evt?.title ?? 'Untitled'}`}
    >
      {/* Severity dot + module icon */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
        <div className="relative flex items-center justify-center w-3 h-3">
          {sev.dotPulse && isUnread && (
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping" />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${sev.dotCls}`} />
        </div>
        <span className={`text-lg leading-none ${isUnread ? '' : 'opacity-40'}`} aria-hidden="true">
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${mod.badgeCls}`}>
            {mod.label}
          </span>
          {evt?.severity && evt.severity !== 'info' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${sev.badgeBg} ${sev.badgeText}`}>
              {sev.label}
            </span>
          )}
          {/* Phase 5A: Workflow status badge (only shown when not default NEW) */}
          {wfStatus !== 'NEW' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${wfCfg.badgeBg} ${wfCfg.badgeText}`}>
              {wfCfg.label}
            </span>
          )}
          {isUnread && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white tracking-wide">
              NEW
            </span>
          )}
          {notif.escalated && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
              ESCALATED
            </span>
          )}
        </div>

        {/* Title */}
        <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}>
          {evt?.title ?? '(no title)'}
        </p>

        {/* Event type */}
        {evt?.event_type && (
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{formatEventType(evt.event_type)}</p>
        )}

        {/* Body preview */}
        {evt?.body && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">{evt.body}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="text-[11px] text-gray-400">{timeAgo(evt?.occurred_at ?? notif.created_at)}</span>
          {evt?.source && (
            <span className="text-[11px] text-gray-300 font-mono">{evt.source}</span>
          )}
          {evt?.workspace_id && (
            <span
              className="text-[11px] text-gray-300 truncate max-w-[120px]"
              title={evt.workspace_id}
            >
              ws:{evt.workspace_id.slice(0, 8)}…
            </span>
          )}
          {/* Phase 5A: Ownership indicator */}
          {isClaimedByOther && (
            <span className="text-[11px] text-blue-500 font-medium truncate max-w-[160px]">
              🔒 {notif.assigned_to_name ?? 'Staff member'}
            </span>
          )}
          {isAssignedToMe && wfStatus === 'INVESTIGATING' && (
            <span className="text-[11px] text-green-600 font-medium">✋ Assigned to you</span>
          )}
        </div>
      </div>

      {/* Actions — always visible on mobile, hover-reveal on desktop */}
      <div
        className="flex-shrink-0 flex flex-col items-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {evt?.deep_link && (
          <Link
            href={evt.deep_link}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Open →
          </Link>
        )}
        {/* Phase 5A: Claim button — only shown when unclaimed */}
        {!notif.assigned_to && (
          <button
            onClick={() => onClaim(notif.id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-label="Claim this notification"
          >
            ✋ Claim
          </button>
        )}
        {isUnread && (
          <button
            onClick={() => onMarkRead(notif.id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Mark as read"
          >
            ✓ Read
          </button>
        )}
        {/* Dismiss and non-action buttons disabled when claimed by another staff member */}
        {!isClaimedByOther && (
          <button
            onClick={() => onDismiss(notif.id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-100 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-rose-200"
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DrawerProps {
  notif:         AdminNotification | null;
  onClose:       () => void;
  onMarkRead:    (id: string) => void;
  onDismiss:     (id: string) => void;
  onResolve:     (id: string) => void;    // Phase 5A
  currentUserId: string | null;           // Phase 5A
  getToken:      () => Promise<string | null>; // Phase 5A — for activity fetch
}

function DetailDrawer({ notif, onClose, onMarkRead, onDismiss, onResolve, currentUserId, getToken }: DrawerProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [activity, setActivity]         = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => { setJsonExpanded(false); setActivity([]); }, [notif?.id]);

  // Phase 5A: Fetch activity timeline whenever drawer opens with a new notification
  useEffect(() => {
    if (!notif) return;
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const res = await fetch(`/api/admin/notifications/${notif.id}/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json() as { activity?: ActivityRow[] };
        if (!cancelled) setActivity(json.activity ?? []);
      } catch {
        // Non-fatal — activity section simply stays empty
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [notif?.id, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notif) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [notif, onClose]);

  if (!notif) return null;

  const evt             = notif.platform_events;
  const sev             = getSeverityConfig(evt?.severity);
  const mod             = getModuleConfig(evt?.module);
  const icon            = getEventIcon(evt?.event_type, evt?.module);
  const metadataEntries = evt?.metadata ? Object.entries(evt.metadata) : [];
  const wfStatus        = notif.workflow_status ?? 'NEW';
  const wfCfg           = getWorkflowStatusConfig(wfStatus);
  const isAssignedToMe  = !!currentUserId && notif.assigned_to === currentUserId;

  const metaFields: Array<{ label: string; value: string | null | undefined; mono?: boolean; truncate?: boolean }> = [
    { label: 'Occurred',    value: evt?.occurred_at ? new Date(evt.occurred_at).toLocaleString('en-GB') : null },
    { label: 'Received',    value: notif.created_at ? new Date(notif.created_at).toLocaleString('en-GB') : null },
    { label: 'Source',      value: evt?.source },
    { label: 'Event ID',    value: evt?.id,            mono: true, truncate: true },
    { label: 'Module',      value: evt?.module },
    { label: 'Workspace',   value: evt?.workspace_id,  mono: true, truncate: true },
    { label: 'Entity type', value: evt?.entity_type },
    { label: 'Entity ID',   value: evt?.entity_id,     mono: true, truncate: true },
    { label: 'Status',      value: notif.is_read ? 'Read' : 'Unread' },
    { label: 'Workflow',    value: wfCfg.label },
    { label: 'Owner',       value: notif.assigned_to_name ?? (notif.assigned_to ? 'Staff member' : null) },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Notification details"
      >
        {/* Header */}
        <div className={`flex-shrink-0 flex items-start justify-between px-6 py-5 border-b border-gray-100 border-l-4 ${sev.borderCls}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${mod.badgeCls}`}>
                  {mod.label}
                </span>
                {evt?.severity && evt.severity !== 'info' && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${sev.badgeBg} ${sev.badgeText}`}>
                    {sev.label}
                  </span>
                )}
                {/* Phase 5A: Workflow status in drawer header */}
                {wfStatus !== 'NEW' && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${wfCfg.badgeBg} ${wfCfg.badgeText}`}>
                    {wfCfg.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate">{formatEventType(evt?.event_type)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title + body */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-snug">
              {evt?.title ?? '(no title)'}
            </h3>
            {evt?.body && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{evt.body}</p>
            )}
          </div>

          {/* Key fields */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
            {metaFields
              .filter(f => f.value)
              .map(({ label, value, mono, truncate }) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <span className="text-xs text-gray-500 flex-shrink-0 w-24">{label}</span>
                  <span
                    className={`text-xs text-gray-900 text-right ${mono ? 'font-mono' : ''} ${truncate ? 'truncate max-w-[180px]' : ''}`}
                    title={truncate ? String(value) : undefined}
                  >
                    {String(value)}
                  </span>
                </div>
              ))}
          </div>

          {/* Metadata section */}
          {metadataEntries.length > 0 && (
            <div>
              <button
                onClick={() => setJsonExpanded(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
                aria-expanded={jsonExpanded}
              >
                <span>{jsonExpanded ? '▾' : '▸'}</span>
                <span>Metadata ({metadataEntries.length} field{metadataEntries.length !== 1 ? 's' : ''})</span>
              </button>

              {!jsonExpanded && (
                <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
                  {metadataEntries.slice(0, 5).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 px-4 py-2">
                      <span className="text-xs text-gray-500 font-mono flex-shrink-0">{k}</span>
                      <span className="text-xs text-gray-700 font-mono text-right truncate max-w-[180px]">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                      </span>
                    </div>
                  ))}
                  {metadataEntries.length > 5 && (
                    <div className="px-4 py-2 text-xs text-gray-400">
                      +{metadataEntries.length - 5} more — expand to view all
                    </div>
                  )}
                </div>
              )}

              {jsonExpanded && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-gray-900 p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(evt?.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Deep link */}
          {evt?.deep_link && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Deep link</p>
              <Link
                href={evt.deep_link}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Open in context →
              </Link>
            </div>
          )}

          {/* Phase 5A: Activity timeline */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity</p>
            {activityLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 h-3 rounded bg-gray-100" />
                    <div className="h-3 w-12 rounded bg-gray-100 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
            {!activityLoading && activity.length === 0 && (
              <p className="text-xs text-gray-400">No activity recorded yet.</p>
            )}
            {!activityLoading && activity.length > 0 && (
              <div className="space-y-2.5">
                {activity.map(row => (
                  <div key={row.id} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0 leading-none mt-0.5" aria-hidden="true">
                      {ACTIVITY_ICONS[row.action] ?? '•'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-snug">
                        <span className="font-medium">{row.actor_name ?? 'System'}</span>
                        {' · '}
                        {formatActivityLabel(row)}
                      </p>
                      {row.reason && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{row.reason}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {timeAgo(row.occurred_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          {/* Phase 5A: Resolve button — only for assigned staff member */}
          {isAssignedToMe && wfStatus !== 'RESOLVED' && wfStatus !== 'DISMISSED' && (
            <button
              onClick={() => { onResolve(notif.id); onClose(); }}
              className="flex-1 px-4 py-2 text-sm font-medium text-green-700 border border-green-200 rounded-xl hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              ✅ Resolve
            </button>
          )}
          {!notif.is_read && (
            <button
              onClick={() => { onMarkRead(notif.id); onClose(); }}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              ✓ Mark read
            </button>
          )}
          <button
            onClick={() => { onDismiss(notif.id); onClose(); }}
            className="flex-1 px-4 py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Toast bar ────────────────────────────────────────────────────────────────

interface ToastBarProps {
  toasts:       ToastItem[];
  onDismiss:    (id: string) => void;
  onClickToast: (notifId: string | null) => void;
}

function ToastBar({ toasts, onDismiss, onClickToast }: ToastBarProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => {
        const sev = getSeverityConfig(t.severity);
        return (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-start gap-3 w-full max-w-xs rounded-xl border bg-white shadow-lg px-4 py-3 border-l-4',
              sev.borderCls,
            ].join(' ')}
          >
            <span className={`flex-shrink-0 inline-flex h-2 w-2 rounded-full mt-1.5 ${sev.dotCls}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{t.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">New notification</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {t.notifId && (
                <button
                  onClick={() => onClickToast(t.notifId)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                >
                  View
                </button>
              )}
              <button
                onClick={() => onDismiss(t.id)}
                className="text-gray-300 hover:text-gray-500 focus:outline-none text-sm leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  filter:        string;
  severityFilter: string;
  unreadOnly:    boolean;
  hasItems:      boolean;
  onClear:       () => void;
}

function EmptyState({ filter, severityFilter, unreadOnly, hasItems, onClear }: EmptyStateProps) {
  const hasActiveFilters = filter !== 'all' || Boolean(severityFilter) || unreadOnly;

  if (!hasItems) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-16 px-8 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🎉</div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">Inbox clear</h3>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          No notifications yet. They&apos;ll appear here when feedback is submitted, invoices are created, or subscription events occur.
        </p>
      </div>
    );
  }

  if (hasActiveFilters) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-12 px-8 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">No matching notifications</h3>
        <p className="text-xs text-gray-400 mb-4">Try adjusting the filters above.</p>
        <button
          onClick={onClear}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white py-12 px-8 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">✅</div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Nothing to show</h3>
      <p className="text-xs text-gray-400">All notifications in this view have been handled.</p>
    </div>
  );
}


export default function AdminNotificationsPage() {
  const [items, setItems]             = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filter, setFilter]           = useState<ModuleFilter>('all');
  const [severityFilter, setSeverityFilter] = useState('');
  const [unreadOnly, setUnreadOnly]   = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [search, setSearch]           = useState('');
  const [selectedNotif, setSelectedNotif] = useState<AdminNotification | null>(null);
  const [toasts, setToasts]           = useState<ToastItem[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // Phase 5A

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIdsRef   = useRef<Set<string> | null>(null);

  // ── URL state persistence ─────────────────────────────────────────────────

  // Read filter params from URL on mount (refresh-safe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    if (mod && MODULE_TABS.some(t => t.key === mod)) setFilter(mod as ModuleFilter);
    const sev = params.get('severity') ?? '';
    if (sev) setSeverityFilter(sev);
    if (params.get('unread') === 'true') setUnreadOnly(true);
    if (params.get('dismissed') === 'true') setShowDismissed(true);
    const q = params.get('q') ?? '';
    if (q) setSearch(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filter state back to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all')  params.set('module', filter);
    if (severityFilter)    params.set('severity', severityFilter);
    if (unreadOnly)        params.set('unread', 'true');
    if (showDismissed)     params.set('dismissed', 'true');
    if (search)            params.set('q', search);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filter, severityFilter, unreadOnly, showDismissed, search]);

  // ── Auth token helper ─────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  // Phase 5A: Populate currentUserId from session on mount
  useEffect(() => {
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    })();
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      const params = new URLSearchParams({ limit: '100' });
      if (unreadOnly)    params.set('unread',    'true');
      if (showDismissed) params.set('dismissed', 'true');

      const [listRes, countRes] = await Promise.all([
        fetch(`/api/admin/notifications?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/notifications/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!listRes.ok) {
        const errJson = await listRes.json().catch(() => ({}));
        setError((errJson as { error?: string }).error ?? 'Failed to load notifications');
        return;
      }

      const listJson = await listRes.json() as { notifications?: AdminNotification[] };
      const newItems = listJson.notifications ?? [];
      setItems(newItems);
      setError('');

      // Toast detection: show on new unread items found since last poll
      if (prevIdsRef.current !== null) {
        const prevIds = prevIdsRef.current;
        const newOnes = newItems.filter(n => !prevIds.has(n.id) && !n.is_read);
        if (newOnes.length > 0) {
          const first  = newOnes[0];
          const evt    = first.platform_events;
          const toastId = `t-${Date.now()}`;
          const msg = newOnes.length === 1
            ? (evt?.title ?? 'New notification')
            : `${newOnes.length} new notifications`;
          setToasts(prev => [
            ...prev.slice(-2),
            { id: toastId, message: msg, severity: evt?.severity ?? 'info', notifId: first.id },
          ]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 5000);
        }
      }
      prevIdsRef.current = new Set(newItems.map(n => n.id));

      if (countRes.ok) {
        const countJson = await countRes.json() as { count?: number };
        setUnreadCount(countJson.count ?? 0);
      }

      setLastRefreshed(new Date());
    } catch {
      setError('Unable to load. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, unreadOnly, showDismissed]);

  // Initial load + 30s polling
  useEffect(() => {
    setLoading(true);
    load();
    pollTimerRef.current = setInterval(load, 30_000);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [load]);

  // Refresh when tab regains focus
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markRead = useCallback(async (notifId: string) => {
    setItems(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));

    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('admin-notif-count-changed'));
    } else {
      load();
    }
  }, [getToken, load]);

  const markAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('admin-notif-count-changed'));
    } else {
      load();
    }
  }, [getToken, load]);

  const dismiss = useCallback(async (notifId: string) => {
    const wasUnread = items.find(n => n.id === notifId)?.is_read === false;
    setItems(prev => prev.filter(n => n.id !== notifId));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));

    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/notifications/${notifId}/dismiss`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('admin-notif-count-changed'));
    } else {
      load();
    }
  }, [getToken, load, items]);

  // Phase 5A: Claim — atomic ownership, optimistic update
  const claim = useCallback(async (notifId: string) => {
    setItems(prev => prev.map(n =>
      n.id === notifId
        ? { ...n, assigned_to: currentUserId, workflow_status: 'INVESTIGATING' }
        : n,
    ));

    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/admin/notifications/${notifId}/claim`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 409) {
        setError('This notification was already claimed by another staff member.');
        setTimeout(() => setError(''), 4000);
      }
      load(); // Reload to get fresh state
    }
  }, [getToken, load, currentUserId]);

  // Phase 5A: Resolve — marks as operationally resolved
  const resolve = useCallback(async (notifId: string) => {
    setItems(prev => prev.map(n =>
      n.id === notifId
        ? { ...n, workflow_status: 'RESOLVED', handled_by: currentUserId, handled_at: new Date().toISOString() }
        : n,
    ));

    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/admin/notifications/${notifId}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      window.dispatchEvent(new CustomEvent('admin-notif-count-changed'));
    } else {
      load();
    }
  }, [getToken, load, currentUserId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let filtered = items
      .filter(n => filter === 'all' || n.platform_events?.module === filter)
      .filter(n => !severityFilter || n.platform_events?.severity === severityFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(n => {
        const evt = n.platform_events;
        return (
          evt?.title?.toLowerCase().includes(q) ||
          evt?.body?.toLowerCase().includes(q) ||
          evt?.module?.toLowerCase().includes(q) ||
          evt?.event_type?.toLowerCase().includes(q)
        );
      });
    }
    return filtered;
  }, [items, filter, severityFilter, search]);

  const criticalItems = useMemo(
    () => visible.filter(n => n.platform_events?.severity === 'critical'),
    [visible],
  );

  const normalItems = useMemo(
    () => visible.filter(n => n.platform_events?.severity !== 'critical'),
    [visible],
  );

  const tabCount = (key: ModuleFilter) =>
    key === 'all'
      ? items.length
      : items.filter(n => n.platform_events?.module === key).length;

  const hasActiveFilters = filter !== 'all' || Boolean(severityFilter) || unreadOnly || showDismissed || Boolean(search);

  const clearFilters = () => {
    setFilter('all');
    setSeverityFilter('');
    setUnreadOnly(false);
    setShowDismissed(false);
    setSearch('');
  };

  const handleOpenNotif = useCallback((notif: AdminNotification) => {
    setSelectedNotif(notif);
    if (!notif.is_read) markRead(notif.id);
  }, [markRead]);

  const handleToastClick = useCallback((notifId: string | null) => {
    if (!notifId) return;
    const n = items.find(x => x.id === notifId);
    if (n) handleOpenNotif(n);
  }, [items, handleOpenNotif]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? 'Loading…'
                : unreadCount > 0
                  ? `${unreadCount} unread · ${items.length} total`
                  : 'All caught up'}
              {lastRefreshed && !loading && (
                <span className="ml-2 text-gray-300">
                  · refreshed {timeAgo(lastRefreshed.toISOString())}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3.5 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                ✓ Mark all read
              </button>
            )}
            <button
              onClick={() => { setRefreshing(true); load(); }}
              disabled={refreshing}
              className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              aria-label="Refresh notifications"
            >
              {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
            </button>
            <Link
              href="/admin/feedback"
              className="px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Feedback →
            </Link>
          </div>
        </div>

        {/* ── Filter toolbar ──────────────────────────────────────────────── */}
        <div className="space-y-2.5">

          {/* Module tabs */}
          <div className="flex flex-wrap gap-1.5">
            {MODULE_TABS.map(({ key, label, icon }) => {
              const count    = tabCount(key);
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  aria-pressed={isActive}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  <span aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary filter row */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-40 sm:w-52"
              aria-label="Search notifications"
            />

            {/* Severity */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              aria-label="Filter by severity"
            >
              <option value="">All severities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
              <option value="info">ℹ️ Info</option>
            </select>

            {/* Unread toggle */}
            <button
              onClick={() => setUnreadOnly(v => !v)}
              aria-pressed={unreadOnly}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300',
                unreadOnly
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              Unread only
            </button>

            {/* Dismissed toggle */}
            <button
              onClick={() => setShowDismissed(v => !v)}
              aria-pressed={showDismissed}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300',
                showDismissed
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {showDismissed ? 'Showing dismissed' : 'Dismissed'}
            </button>

            {/* Clear all */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2 text-sm text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
              >
                Clear all ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────────── */}
        {loading && !error && (
          <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100 overflow-hidden">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <>
            {/* Critical alerts — pinned section */}
            {criticalItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Critical alerts ({criticalItems.length})
                  </h3>
                </div>
                <div className="rounded-2xl border border-red-200 bg-white divide-y divide-red-50 overflow-hidden shadow-sm">
                  {criticalItems.map(notif => (
                    <NotificationCard
                      key={notif.id}
                      notif={notif}
                      onMarkRead={markRead}
                      onDismiss={dismiss}
                      onOpen={handleOpenNotif}
                      onClaim={claim}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Normal inbox */}
            {normalItems.length > 0 && (
              <div className="space-y-2">
                {criticalItems.length > 0 && (
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">Inbox</h3>
                )}
                <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50 overflow-hidden">
                  {normalItems.map(notif => (
                    <NotificationCard
                      key={notif.id}
                      notif={notif}
                      onMarkRead={markRead}
                      onDismiss={dismiss}
                      onOpen={handleOpenNotif}
                      onClaim={claim}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {visible.length === 0 && (
              <EmptyState
                filter={filter}
                severityFilter={severityFilter}
                unreadOnly={unreadOnly}
                hasItems={items.length > 0}
                onClear={clearFilters}
              />
            )}
          </>
        )}

        {/* ── Roadmap footer ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600">Notification system roadmap</p>
          <p>✅ <strong>Phase 1</strong> — Bell icon, sidebar badge, notifications page</p>
          <p>✅ <strong>Phase 2</strong> — platform_events table, admin_notifications table, feedback fan-out, per-staff inbox, mark read/dismiss persisted to DB</p>
          <p>✅ <strong>Phase 3</strong> — Bell badge capped at 9+, visibility-triggered refresh, per-action bell sync (custom event), severity/unread/dismissed filters</p>
          <p>✅ <strong>Phase 4</strong> — Invoice created events, subscription payment_failed/cancelled events, cross-module audit</p>
          <p>✅ <strong>Phase 4.5</strong> — Severity visual hierarchy, critical pinning, card redesign, detail drawer, toasts, URL filter state, search, shimmer loading, premium empty states</p>
          <p>✅ <strong>Phase 5A</strong> — Workflow state machine (9 states), atomic claim/ownership, audit trail (notification_activity), status badges, activity timeline in drawer, resolve workflow</p>
          <p>⏳ <strong>Phase 5B</strong> — Private staff notes, full activity timeline tabs</p>
          <p>⏳ <strong>Phase 5C</strong> — Escalation flow, superadmin reassign</p>
          <p>⏳ <strong>Phase 5D</strong> — My Workbench page</p>
          <p>⏳ <strong>Phase 6+</strong> — Email digests, Supabase Realtime push, mobile push (APNs/FCM), auto-escalation cron, AI clustering</p>
        </div>

      </div>

      {/* Detail drawer — rendered outside main content flow (fixed position) */}
      <DetailDrawer
        notif={selectedNotif}
        onClose={() => setSelectedNotif(null)}
        onMarkRead={markRead}
        onDismiss={dismiss}
        onResolve={resolve}
        currentUserId={currentUserId}
        getToken={getToken}
      />

      {/* Toast bar — fixed bottom-right */}
      <ToastBar
        toasts={toasts}
        onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))}
        onClickToast={handleToastClick}
      />
    </>
  );
}

