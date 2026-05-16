// src/components/BusinessNotificationPanel.tsx
//
// Dropdown panel for the bell icon — shows business/system notifications.
// Renders from useBusinessNotifications hook (public.business_notifications).
// Supports: mark read, mark all read, dismiss, entity navigation.
// Chat notifications are NOT shown here — those belong to the chat surface.

'use client';

import { useRouter } from 'next/navigation';
import { useBusinessNotifications, type BusinessNotification } from '@/hooks/useBusinessNotifications';

// ─── Entity navigation helper ────────────────────────────────────────────────

function entityHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case 'lead': return `/app/leads/${id}`;
    case 'job': return `/app/jobs/${id}`;
    case 'invoice': return `/app/invoices`;
    case 'quote': return `/app/quotes`;
    case 'asset': return `/app/assets`;
    case 'task': return `/app/tasks`;
    default: return null;
  }
}

// ─── Notification type icons ─────────────────────────────────────────────────

function typeIcon(type: string): string {
  switch (type) {
    case 'payment_reminder': return '💰';
    case 'follow_up': return '📞';
    case 'overdue_task': return '⏰';
    case 'overdue_job': return '⏰';
    case 'quote_event': return '📋';
    case 'invoice_event': return '🧾';
    case 'lead_change': return '🟢';
    case 'job_change': return '🔧';
    case 'workspace_alert': return '🏢';
    case 'planner_reminder': return '📅';
    default: return '🔔';
  }
}

// ─── Time ago helper ─────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Single notification row ─────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
  onDismiss,
  onNavigate,
}: {
  notification: BusinessNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (href: string) => void;
}) {
  const href = entityHref(notification.linked_entity_type, notification.linked_entity_id);

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 transition ${
        notification.is_read ? 'bg-white' : 'bg-blue-50/50'
      } ${href ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (href) onNavigate(href);
      }}
    >
      {/* Unread dot */}
      <span className="mt-1.5 flex h-2 w-2 shrink-0">
        {!notification.is_read && (
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
        )}
      </span>

      {/* Icon */}
      <span className="mt-0.5 text-base leading-none">{typeIcon(notification.type)}</span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.is_read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{notification.body}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-400">{timeAgo(notification.created_at)}</p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="mt-0.5 shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-gray-100 hover:text-slate-500 group-hover:opacity-100"
        title="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

interface BusinessNotificationPanelProps {
  onClose: () => void;
}

export function BusinessNotificationPanel({ onClose }: BusinessNotificationPanelProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    dismiss,
  } = useBusinessNotifications();

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      {/* Backdrop — click to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500">No notifications</p>
              <p className="mt-1 text-xs text-slate-400">
                Business alerts and reminders will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                  onDismiss={dismiss}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
