// src/lib/chat/useChat.ts
//
// TissChat Phase 1+2+3+5 — React hook for chat state management.
//
// RECEIVE PATHS (Android spec):
// 1. Supabase Realtime subscription on messages table
// 2. Foreground poll fallback (~5 seconds)
// Both de-dupe by UUID and merge into local state.
//
// SEND FLOW:
// compose → generate UUID → local insert → update UI → send to Supabase → update status
//
// PHASE 2 ADDITIONS:
// - sendFileMessage: upload file → send structured message (image/document)
// - sendStructuredMessage: send lead/job card (no file upload)
//
// PHASE 3 ADDITIONS:
// - createConversation accepts optional member_ids for group creation
// - memberNamesMap: resolved sender_id → display name for group sender labels
// - onIncomingMessage callback for notification integration
//
// PHASE 5 ADDITIONS:
// - deleteConversation: remove conversation + messages
// - muteConversation / archiveConversation: per-user conversation controls
// - toggleReaction / fetchReactions: emoji reactions on messages

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getSupabaseClient } from '@/lib/supabase';
import type { ChatMessage, Conversation, MessageType } from './chat-types';
import type { StructuredPayload } from './chat-payloads';
import { serializePayload } from './chat-payloads';
import { compressChatImage } from './compress-image';
import {
  type ChatState,
  createInitialState,
  mergeConversations,
  upsertConversation,
  mergeMessage,
  mergeMessages,
  updateMessageStatus,
  removeMessage,
  removeConversation,
  addReaction,
  removeReaction,
  mergeReactions,
  setActiveConversation,
  getMessages,
  getSortedConversations,
  getTotalUnread,
} from './chat-store';

const POLL_INTERVAL = 5000; // 5 seconds — active when realtime down
const HEARTBEAT_INTERVAL = 60000; // 60 seconds — passive when realtime healthy
const PAGE_SIZE = 50;

function generateUUID(): string {
  return crypto.randomUUID();
}

export function useChat(onIncomingMessage?: (msg: ChatMessage) => void) {
  const { accessToken, workspaceId, user } = useWorkspace();
  const userId = user?.id ?? null;

  const [state, setState] = useState<ChatState>(() => ({
    ...createInitialState(),
    currentUserId: null,
  }));

  // Keep refs for use in callbacks/intervals without re-renders
  const stateRef = useRef(state);
  stateRef.current = state;
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;
  const workspaceRef = useRef(workspaceId);
  workspaceRef.current = workspaceId;
  const onIncomingRef = useRef(onIncomingMessage);
  onIncomingRef.current = onIncomingMessage;

  // Set current user
  useEffect(() => {
    if (userId) {
      setState((s) => ({ ...s, currentUserId: userId }));
    }
  }, [userId]);

  // ─── API helpers ──────────────────────────────────────────────────────────

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${tokenRef.current}`,
    'Content-Type': 'application/json',
  }), []);

  // ─── Fetch conversations ─────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: authHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const convs = (data.conversations ?? []) as Conversation[];
      setState((s) => mergeConversations(s, convs));
    } catch (err) {
      console.warn('[useChat] Failed to fetch conversations:', err);
    }
  }, [authHeaders]);

  // ─── Signed URL cache (populated from batch pre-signing in messages response) ─
  const signedUrlCacheRef = useRef<Map<string, { url: string; expires: number }>>(new Map());

  /** Resolve a pre-signed URL for a media path. Returns null if not cached. */
  const getSignedUrl = useCallback((bucket: string, path: string): string | null => {
    const key = `${bucket}/${path}`;
    const entry = signedUrlCacheRef.current.get(key);
    if (!entry) return null;
    // Expired? (with 5 min buffer)
    if (Date.now() > entry.expires - 300_000) {
      signedUrlCacheRef.current.delete(key);
      return null;
    }
    return entry.url;
  }, []);

  // ─── Pagination state per conversation ─────────────────────────────────
  // hasMore: whether more history pages exist above
  // oldestCursor: the created_at of the oldest loaded message (for pagination)
  const paginationRef = useRef<Map<string, { hasMore: boolean; oldestCursor: string | null; loading: boolean }>>(new Map());

  // Track realtime health for adaptive polling
  const realtimeHealthyRef = useRef(false);

  // ─── Fetch messages for a conversation (latest page) ──────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.messages ?? []) as ChatMessage[];
      setState((s) => mergeMessages(s, msgs));

      // Populate signed URL cache from batch pre-signing
      if (data.signed_urls) {
        const expires = Date.now() + 3600_000; // 1 hour from now
        for (const [key, url] of Object.entries(data.signed_urls)) {
          signedUrlCacheRef.current.set(key, { url: url as string, expires });
        }
      }

      // Update pagination cursor
      paginationRef.current.set(conversationId, {
        hasMore: data.has_more ?? false,
        oldestCursor: data.oldest_cursor ?? null,
        loading: false,
      });
    } catch (err) {
      console.warn('[useChat] Failed to fetch messages:', err);
    }
  }, [authHeaders]);

  // ─── Fetch older messages (triggered by scroll-to-top) ────────────────────

  const fetchOlderMessages = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!tokenRef.current) return false;

    const pg = paginationRef.current.get(conversationId);
    if (!pg || !pg.hasMore || pg.loading || !pg.oldestCursor) return false;

    // Mark loading to prevent concurrent requests
    paginationRef.current.set(conversationId, { ...pg, loading: true });

    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(pg.oldestCursor)}`,
        { headers: authHeaders(), cache: 'no-store' },
      );
      if (!res.ok) return false;
      const data = await res.json();
      const msgs = (data.messages ?? []) as ChatMessage[];
      setState((s) => mergeMessages(s, msgs));

      // Populate signed URL cache from batch pre-signing
      if (data.signed_urls) {
        const expires = Date.now() + 3600_000;
        for (const [key, url] of Object.entries(data.signed_urls)) {
          signedUrlCacheRef.current.set(key, { url: url as string, expires });
        }
      }

      paginationRef.current.set(conversationId, {
        hasMore: data.has_more ?? false,
        oldestCursor: data.oldest_cursor ?? pg.oldestCursor,
        loading: false,
      });

      return msgs.length > 0;
    } catch (err) {
      console.warn('[useChat] Failed to fetch older messages:', err);
      paginationRef.current.set(conversationId, { ...pg, loading: false });
      return false;
    }
  }, [authHeaders]);

  /** Check if a conversation has more history to load. */
  const hasMoreMessages = useCallback((conversationId: string): boolean => {
    return paginationRef.current.get(conversationId)?.hasMore ?? false;
  }, []);

  /** Check if older messages are currently being fetched. */
  const isLoadingOlder = useCallback((conversationId: string): boolean => {
    return paginationRef.current.get(conversationId)?.loading ?? false;
  }, []);

  // ─── Send message ────────────────────────────────────────────────────────
  // compose → generate UUID → local insert → update UI → send to Supabase → update status

  const sendMessage = useCallback(async (conversationId: string, body: string) => {
    if (!tokenRef.current || !workspaceRef.current || !userId) return;

    const msgId = generateUUID();
    const now = new Date().toISOString();

    const optimistic: ChatMessage = {
      id: msgId,
      conversation_id: conversationId,
      workspace_id: workspaceRef.current,
      sender_id: userId,
      body: body.trim(),
      message_type: 'text',
      payload: null,
      delivery_status: 'sending',
      created_at: now,
    };

    // 1. Local insert → update UI immediately
    setState((s) => mergeMessage(s, optimistic));

    // 2. Send to Supabase
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          id: msgId,
          conversation_id: conversationId,
          body: body.trim(),
          message_type: 'text',
        }),
      });

      if (!res.ok) {
        setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
        return;
      }

      // 3. Promote to 'sent'
      setState((s) => updateMessageStatus(s, msgId, conversationId, 'sent'));
    } catch {
      setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
    }
  }, [userId, authHeaders]);

  // ─── Send structured message (LEAD / JOB — no file upload) ───────────────
  // Same engine as text: UUID → local insert → POST → status update

  const sendStructuredMessage = useCallback(async (
    conversationId: string,
    messageType: MessageType,
    body: string,
    payload: StructuredPayload,
  ) => {
    if (!tokenRef.current || !workspaceRef.current || !userId) return;

    const msgId = generateUUID();
    const now = new Date().toISOString();
    const payloadStr = serializePayload(payload);

    const optimistic: ChatMessage = {
      id: msgId,
      conversation_id: conversationId,
      workspace_id: workspaceRef.current,
      sender_id: userId,
      body,
      message_type: messageType,
      payload: payloadStr,
      delivery_status: 'sending',
      created_at: now,
    };

    setState((s) => mergeMessage(s, optimistic));

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          id: msgId,
          conversation_id: conversationId,
          body,
          message_type: messageType,
          payload: payloadStr,
        }),
      });

      if (!res.ok) {
        setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
        return;
      }
      setState((s) => updateMessageStatus(s, msgId, conversationId, 'sent'));
    } catch {
      setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
    }
  }, [userId, authHeaders]);

  // ─── Send file message (IMAGE / DOCUMENT — compress + upload then send) ────
  // For images: compress in browser first, then upload.
  // Upload file → receive relay metadata → send structured message.

  const sendFileMessage = useCallback(async (
    conversationId: string,
    file: File,
    category: 'image' | 'document',
  ) => {
    if (!tokenRef.current || !workspaceRef.current || !userId) return;

    const msgId = generateUUID();
    const now = new Date().toISOString();
    const previewBody = category === 'image' ? `📷 ${file.name}` : `📎 ${file.name}`;

    // Optimistic local insert (status = 'sending')
    const optimistic: ChatMessage = {
      id: msgId,
      conversation_id: conversationId,
      workspace_id: workspaceRef.current,
      sender_id: userId,
      body: previewBody,
      message_type: category,
      payload: null,
      delivery_status: 'sending',
      created_at: now,
    };

    setState((s) => mergeMessage(s, optimistic));

    try {
      // 0. Compress images in browser before upload
      const fileToUpload = category === 'image'
        ? await compressChatImage(file)
        : file;

      // 1. Upload file (compressed or original)
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('conversation_id', conversationId);
      formData.append('category', category);

      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
        return;
      }

      const uploadData = await uploadRes.json();
      // Merge fileName from the user's original file (not compressed name)
      // and sizeBytes from actual uploaded file for accuracy.
      // Uses contract-aligned camelCase keys.
      const relayPayload = {
        ...uploadData.payload,
        fileName: file.name,
        sizeBytes: fileToUpload.size,
      };
      const payloadStr = JSON.stringify(relayPayload);

      // 2. Send message with payload
      const sendRes = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          id: msgId,
          conversation_id: conversationId,
          body: previewBody,
          message_type: category,
          payload: payloadStr,
        }),
      });

      if (!sendRes.ok) {
        setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
        return;
      }

      // Update local message with payload so it renders correctly
      setState((s) => {
        const convMsgs = s.messagesByConversation.get(conversationId);
        if (!convMsgs) return s;
        const existing = convMsgs.get(msgId);
        if (!existing) return s;
        const nextMap = new Map(convMsgs);
        nextMap.set(msgId, { ...existing, payload: payloadStr, delivery_status: 'sent' });
        const nextMsgs = new Map(s.messagesByConversation);
        nextMsgs.set(conversationId, nextMap);
        return { ...s, messagesByConversation: nextMsgs };
      });
    } catch {
      setState((s) => updateMessageStatus(s, msgId, conversationId, 'failed'));
    }
  }, [userId, authHeaders]);

  // ─── Delete message (own messages only) ───────────────────────────────────

  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    if (!tokenRef.current) return;

    // Optimistic removal from local state
    setState((s) => removeMessage(s, messageId, conversationId));

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ message_id: messageId }),
      });

      if (!res.ok) {
        // Revert: re-fetch messages for the conversation to restore state
        await fetchMessages(conversationId);
      }
    } catch {
      await fetchMessages(conversationId);
    }
  }, [authHeaders, fetchMessages]);

  // ─── Create conversation ─────────────────────────────────────────────────

  const createConversation = useCallback(async (title: string, memberIds?: string[]): Promise<{ id: string } | { error: string }> => {
    if (!tokenRef.current) return { error: 'Not authenticated' };
    try {
      const payload: { title: string; member_ids?: string[] } = { title };
      if (memberIds && memberIds.length > 0) {
        payload.member_ids = memberIds;
      }
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        return { error: errData?.error || `Server error (${res.status})` };
      }
      const data = await res.json();
      // If the conversation already existed (DM dedup), just return the id
      const conv = data.conversation as Conversation;
      if (!data.existing) {
        setState((s) => upsertConversation(s, conv));
      }
      return { id: conv.id };
    } catch {
      return { error: 'Network error — could not reach server' };
    }
  }, [authHeaders]);

  // ─── Group management ────────────────────────────────────────────────────

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    if (!tokenRef.current) return false;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, title }),
      });
      if (!res.ok) return false;
      // Update local state
      setState((s) => {
        const conv = s.conversations.get(conversationId);
        if (!conv) return s;
        const next = new Map(s.conversations);
        next.set(conversationId, { ...conv, title });
        return { ...s, conversations: next };
      });
      return true;
    } catch {
      return false;
    }
  }, [authHeaders]);

  const addGroupMembers = useCallback(async (conversationId: string, memberIds: string[]) => {
    if (!tokenRef.current || memberIds.length === 0) return false;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, add_members: memberIds }),
      });
      if (!res.ok) return false;
      // Refresh conversations to get updated member list
      await fetchConversations();
      return true;
    } catch {
      return false;
    }
  }, [authHeaders, fetchConversations]);

  const removeGroupMember = useCallback(async (conversationId: string, memberId: string) => {
    if (!tokenRef.current) return false;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, remove_members: [memberId] }),
      });
      if (!res.ok) return false;
      await fetchConversations();
      return true;
    } catch {
      return false;
    }
  }, [authHeaders, fetchConversations]);

  const leaveGroup = useCallback(async (conversationId: string) => {
    if (!tokenRef.current) return false;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, leave: true }),
      });
      if (!res.ok) return false;
      // Close and remove from local state
      setState((s) => removeConversation(s, conversationId));
      return true;
    } catch {
      return false;
    }
  }, [authHeaders]);

  // ─── Delete conversation ─────────────────────────────────────────────────

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!tokenRef.current) return false;

    // Optimistic removal from local state
    setState((s) => removeConversation(s, conversationId));

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      if (!res.ok) {
        // Revert: re-fetch conversations
        await fetchConversations();
        return false;
      }
      return true;
    } catch {
      await fetchConversations();
      return false;
    }
  }, [authHeaders, fetchConversations]);

  // ─── Mute / archive conversation ─────────────────────────────────────────

  const muteConversation = useCallback(async (conversationId: string, muted: boolean) => {
    if (!tokenRef.current) return false;
    // Optimistic update
    setState((s) => {
      const conv = s.conversations.get(conversationId);
      if (!conv) return s;
      const next = new Map(s.conversations);
      next.set(conversationId, { ...conv, is_muted: muted });
      return { ...s, conversations: next };
    });
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, is_muted: muted }),
      });
      if (!res.ok) {
        await fetchConversations();
        return false;
      }
      return true;
    } catch {
      await fetchConversations();
      return false;
    }
  }, [authHeaders, fetchConversations]);

  const archiveConversation = useCallback(async (conversationId: string, archived: boolean) => {
    if (!tokenRef.current) return false;
    // Optimistic update
    setState((s) => {
      const conv = s.conversations.get(conversationId);
      if (!conv) return s;
      const next = new Map(s.conversations);
      next.set(conversationId, { ...conv, is_archived: archived });
      return { ...s, conversations: next };
    });
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_id: conversationId, is_archived: archived }),
      });
      if (!res.ok) {
        await fetchConversations();
        return false;
      }
      return true;
    } catch {
      await fetchConversations();
      return false;
    }
  }, [authHeaders, fetchConversations]);

  // ─── Reactions ───────────────────────────────────────────────────────────

  const toggleReaction = useCallback(async (messageId: string, _conversationId: string, emoji: string) => {
    if (!tokenRef.current || !userId) return;

    // Check if user already reacted — toggle accordingly
    const existing = stateRef.current.reactionsByMessage.get(messageId) ?? [];
    const alreadyReacted = existing.some((r) => r.user_id === userId && r.emoji === emoji);

    // Optimistic update
    if (alreadyReacted) {
      setState((s) => removeReaction(s, messageId, userId, emoji));
    } else {
      setState((s) => addReaction(s, messageId, userId, emoji));
    }

    try {
      const res = await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      if (!res.ok) {
        // Revert: re-fetch reactions
        await fetchReactionsForMessage(messageId);
      }
    } catch {
      await fetchReactionsForMessage(messageId);
    }
  }, [userId, authHeaders]);

  const fetchReactionsForMessage = useCallback(async (messageId: string) => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(`/api/chat/reactions?message_id=${messageId}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setState((s) => mergeReactions(s, messageId, data.reactions ?? []));
    } catch {
      // non-fatal
    }
  }, [authHeaders]);

  // ─── Open conversation (mark read) ───────────────────────────────────────

  const openConversation = useCallback(async (conversationId: string) => {
    // 1. Clear unread locally immediately
    setState((s) => setActiveConversation(s, conversationId));

    // 2. Fetch messages for this conversation
    await fetchMessages(conversationId);

    // 3. Call backend mark-read with latest message_id (W-SYNC-1 cursor-based)
    if (tokenRef.current) {
      // Find the latest message in this conversation to use as read cursor
      const convMsgs = stateRef.current.messagesByConversation.get(conversationId);
      let latestMsgId: string | undefined;
      if (convMsgs && convMsgs.size > 0) {
        let latestTime = '';
        for (const m of convMsgs.values()) {
          if (m.created_at > latestTime) {
            latestTime = m.created_at;
            latestMsgId = m.id;
          }
        }
      }
      const markReadBody: Record<string, string> = { conversation_id: conversationId };
      if (latestMsgId) markReadBody.message_id = latestMsgId;

      fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(markReadBody),
      }).catch(() => { /* non-fatal */ });
    }
  }, [fetchMessages, authHeaders]);

  // ─── Close conversation ──────────────────────────────────────────────────

  const closeConversation = useCallback(() => {
    setState((s) => setActiveConversation(s, null));
  }, []);

  // ─── Supabase Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    if (!workspaceId || !accessToken) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`chat-messages-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          // De-dupe happens inside mergeMessage (checks existing UUID + status)
          setState((s) => mergeMessage(s, msg));
          // Fire notification callback for non-mine messages
          if (msg.sender_id !== stateRef.current.currentUserId) {
            onIncomingRef.current?.(msg);
          }
        },
      )
      .subscribe((status) => {
        // Track realtime health for adaptive polling
        realtimeHealthyRef.current = status === 'SUBSCRIBED';
      });

    return () => {
      realtimeHealthyRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [workspaceId, accessToken]);

  // ─── Adaptive poll (60s heartbeat when RT healthy, 5s when RT down) ───────

  useEffect(() => {
    if (!accessToken || !workspaceId) return;

    // Initial fetch
    fetchConversations();

    // Use a ref-based interval that checks RT health each tick
    const tick = () => {
      fetchConversations();

      const activeId = stateRef.current.activeConversationId;
      // Only re-fetch active messages when realtime is DOWN (fallback mode)
      if (activeId && !realtimeHealthyRef.current) {
        fetchMessages(activeId);
      }
    };

    // Start with the shorter interval; the tick itself is cheap when RT is up
    // because it only fetches conversations (lightweight) and skips messages.
    let intervalId: ReturnType<typeof setInterval>;

    const scheduleNext = () => {
      const delay = realtimeHealthyRef.current ? HEARTBEAT_INTERVAL : POLL_INTERVAL;
      intervalId = setTimeout(() => {
        tick();
        scheduleNext();
      }, delay) as unknown as ReturnType<typeof setInterval>;
    };

    scheduleNext();

    return () => clearTimeout(intervalId as unknown as number);
  }, [accessToken, workspaceId, fetchConversations, fetchMessages]);

  // ─── Derived state ───────────────────────────────────────────────────────

  const conversations = getSortedConversations(state);
  const activeConversationId = state.activeConversationId;
  const activeMessages = activeConversationId ? getMessages(state, activeConversationId) : [];
  const totalUnread = getTotalUnread(state);
  const activeConversation = activeConversationId
    ? state.conversations.get(activeConversationId) ?? null
    : null;

  // Build member name map for the active conversation (used for group sender labels)
  const memberNamesMap = new Map<string, string>();
  if (activeConversation?.members) {
    for (const m of activeConversation.members) {
      memberNamesMap.set(m.user_id, m.full_name || m.email || m.user_id.slice(0, 8));
    }
  }

  return {
    // State
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    totalUnread,
    userId,
    memberNamesMap,
    state, // expose for getReactionSummaries

    // Actions
    sendMessage,
    sendStructuredMessage,
    sendFileMessage,
    deleteMessage,
    deleteConversation,
    muteConversation,
    archiveConversation,
    toggleReaction,
    fetchReactionsForMessage,
    createConversation,
    renameConversation,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
    openConversation,
    closeConversation,
    fetchConversations,
    fetchOlderMessages,
    hasMoreMessages,
    isLoadingOlder,
    getSignedUrl,
  };
}
