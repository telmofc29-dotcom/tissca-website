// src/hooks/useBusinessNotifications.ts
//
// Client-side hook for business notifications (bell surface).
// Queries public.business_notifications via Supabase client.
// Uses RPCs: get_business_notification_unread_count,
//   mark_business_notification_read, mark_all_business_notifications_read,
//   dismiss_business_notification.
//
// Chat-only surfaces (useChat, useChatUnreadCount) are NOT affected.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BusinessNotification = {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  is_read: boolean;
  dismissed: boolean;
  created_at: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000; // 30s — business events are less time-sensitive than chat
const PAGE_SIZE = 30;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBusinessNotifications() {
  const { workspaceId, user } = useWorkspace();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // ── Fetch unread count via RPC ──────────────────────────────────────────

  const fetchUnreadCount = useCallback(async () => {
    if (!workspaceId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await (supabase.rpc as any)(
        'get_business_notification_unread_count',
        { p_workspace_id: workspaceId },
      );
      if (!error && mountedRef.current) {
        setUnreadCount(typeof data === 'number' ? data : 0);
      }
    } catch {
      // Non-fatal — badge shows stale or 0
    }
  }, [workspaceId]);

  // ── Fetch notification list ─────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!workspaceId || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('business_notifications')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!error && mountedRef.current) {
        setNotifications((data ?? []) as BusinessNotification[]);
      }
    } catch {
      // Non-fatal
    }
  }, [workspaceId, userId]);

  // ── Initial load + polling ──────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUnreadCount(), fetchNotifications()]);
      if (mountedRef.current) setLoading(false);
    };

    load();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchUnreadCount, fetchNotifications]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const markRead = useCallback(async (notificationId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await (supabase.rpc as any)('mark_business_notification_read', {
        p_notification_id: notificationId,
      });
    } catch {
      // Revert on failure — next poll will reconcile
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [fetchUnreadCount, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!workspaceId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await (supabase.rpc as any)('mark_all_business_notifications_read', {
        p_workspace_id: workspaceId,
      });
    } catch {
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [workspaceId, fetchUnreadCount, fetchNotifications]);

  const dismiss = useCallback(async (notificationId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Optimistic removal
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    // If the dismissed notification was unread, decrement
    const was = notifications.find((n) => n.id === notificationId);
    if (was && !was.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await (supabase.rpc as any)('dismiss_business_notification', {
        p_notification_id: notificationId,
      });
    } catch {
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [notifications, fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    dismiss,
    refresh: useCallback(async () => {
      await Promise.all([fetchUnreadCount(), fetchNotifications()]);
    }, [fetchUnreadCount, fetchNotifications]),
  };
}
