// src/hooks/useChatUnreadCount.ts
//
// Lightweight hook that fetches TissChat unread conversation count
// for the header badge. Does NOT instantiate the full useChat machinery.
// Polls /api/chat/conversations and sums unread_count across conversations.
//
// Used by: MemberAppLayout header badge

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const POLL_INTERVAL = 15_000; // 15s — lighter than full chat poll (5s)

export function useChatUnreadCount(): number {
  const { accessToken } = useWorkspace();
  const [unread, setUnread] = useState(0);
  const mountedRef = useRef(true);

  const fetchUnread = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!mountedRef.current) return;
      const conversations: { unread_count?: number }[] = data.conversations ?? [];
      const total = conversations.reduce(
        (sum, c) => sum + (c.unread_count ?? 0),
        0,
      );
      setUnread(total);
    } catch {
      // Non-fatal — badge shows stale or 0
    }
  }, [accessToken]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchUnread]);

  return unread;
}
