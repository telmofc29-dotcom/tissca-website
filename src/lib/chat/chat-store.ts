// src/lib/chat/chat-store.ts
//
// TissChat Phase 1+5 — Local-first state store.
// W-SYNC-1: uses last_message_at instead of updated_at
//
// RULES (from Android source of truth):
// 1. UI reads from local state only — never directly from Supabase
// 2. Remote data (realtime, poll, send response) merges INTO local state
// 3. Messages de-duped by UUID across all receive paths
// 4. Delivery status is monotonic — never downgrade
// 5. Unread belongs to conversation — increment on non-mine, clear on open
// Phase 5: reactions per message, removeConversation, mute/archive filtering

import type { ChatMessage, Conversation, DeliveryStatus, MessageReaction, ReactionSummary } from './chat-types';
import { isStatusPromotion } from './chat-types';

// ─── Store shape ────────────────────────────────────────────────────────────

export type ChatState = {
  conversations: Map<string, Conversation>;
  /** Messages keyed by conversation_id → Map<message_id, ChatMessage> */
  messagesByConversation: Map<string, Map<string, ChatMessage>>;
  /** Reactions keyed by message_id → MessageReaction[] */
  reactionsByMessage: Map<string, MessageReaction[]>;
  activeConversationId: string | null;
  currentUserId: string | null;
};

export function createInitialState(): ChatState {
  return {
    conversations: new Map(),
    messagesByConversation: new Map(),
    reactionsByMessage: new Map(),
    activeConversationId: null,
    currentUserId: null,
  };
}

// ─── Actions ────────────────────────────────────────────────────────────────

/** Merge a list of conversations from the server. Preserves local enrichment. */
export function mergeConversations(
  state: ChatState,
  remote: Conversation[],
): ChatState {
  const next = new Map(state.conversations);
  for (const conv of remote) {
    const existing = next.get(conv.id);
    next.set(conv.id, {
      ...conv,
      // Preserve local enrichment (last_message, unread_count) if we had it
      last_message: conv.last_message ?? existing?.last_message ?? null,
      unread_count: conv.unread_count ?? existing?.unread_count ?? 0,
    });
  }
  return { ...state, conversations: next };
}

/** Add or update a single conversation. */
export function upsertConversation(
  state: ChatState,
  conv: Conversation,
): ChatState {
  const next = new Map(state.conversations);
  const existing = next.get(conv.id);
  next.set(conv.id, {
    ...conv,
    last_message: conv.last_message ?? existing?.last_message ?? null,
    unread_count: conv.unread_count ?? existing?.unread_count ?? 0,
  });
  return { ...state, conversations: next };
}

/**
 * Merge a message into local state. Handles:
 * - De-dupe by UUID (skip if already exists with same or higher status)
 * - Monotonic status promotion
 * - Conversation last_message + unread update
 */
export function mergeMessage(
  state: ChatState,
  msg: ChatMessage,
): ChatState {
  const convId = msg.conversation_id;

  // Get or create message map for this conversation
  const existingMap = state.messagesByConversation.get(convId);
  const msgMap = existingMap ? new Map(existingMap) : new Map<string, ChatMessage>();

  const existing = msgMap.get(msg.id);
  if (existing) {
    // De-dupe: only update if status is a promotion
    if (!isStatusPromotion(existing.delivery_status, msg.delivery_status)) {
      return state; // No change needed
    }
    // Promote status, keep everything else from newer data
    msgMap.set(msg.id, { ...msg, delivery_status: msg.delivery_status });
  } else {
    msgMap.set(msg.id, msg);
  }

  const nextMsgs = new Map(state.messagesByConversation);
  nextMsgs.set(convId, msgMap);

  // Update conversation last_message + unread
  const nextConvs = new Map(state.conversations);
  const conv = nextConvs.get(convId);
  if (conv) {
    const isNewest = !conv.last_message || new Date(msg.created_at) >= new Date(conv.last_message.created_at);
    const isFromOther = msg.sender_id !== state.currentUserId;
    const isActive = state.activeConversationId === convId;

    nextConvs.set(convId, {
      ...conv,
      last_message: isNewest ? msg : conv.last_message,
      // Increment unread only for non-mine messages when conversation is NOT active
      unread_count: (!existing && isFromOther && !isActive)
        ? conv.unread_count + 1
        : conv.unread_count,
      last_message_at: isNewest ? msg.created_at : (conv.last_message_at ?? conv.created_at),
    });
  }

  return { ...state, conversations: nextConvs, messagesByConversation: nextMsgs };
}

/** Merge multiple messages (from poll or initial load). */
export function mergeMessages(
  state: ChatState,
  messages: ChatMessage[],
): ChatState {
  let next = state;
  for (const msg of messages) {
    next = mergeMessage(next, msg);
  }
  return next;
}

/** Update delivery status for a specific message. Monotonic only. */
export function updateMessageStatus(
  state: ChatState,
  messageId: string,
  conversationId: string,
  newStatus: DeliveryStatus,
): ChatState {
  const msgMap = state.messagesByConversation.get(conversationId);
  if (!msgMap) return state;

  const msg = msgMap.get(messageId);
  if (!msg) return state;
  if (!isStatusPromotion(msg.delivery_status, newStatus)) return state;

  const nextMap = new Map(msgMap);
  nextMap.set(messageId, { ...msg, delivery_status: newStatus });

  const nextMsgs = new Map(state.messagesByConversation);
  nextMsgs.set(conversationId, nextMap);

  return { ...state, messagesByConversation: nextMsgs };
}

/** Clear unread for a conversation (user opened it). */
export function clearUnread(
  state: ChatState,
  conversationId: string,
): ChatState {
  const nextConvs = new Map(state.conversations);
  const conv = nextConvs.get(conversationId);
  if (conv && conv.unread_count > 0) {
    nextConvs.set(conversationId, { ...conv, unread_count: 0 });
  }
  return { ...state, conversations: nextConvs, activeConversationId: conversationId };
}

/** Set active conversation (also clears unread). */
export function setActiveConversation(
  state: ChatState,
  conversationId: string | null,
): ChatState {
  if (conversationId) {
    return clearUnread({ ...state, activeConversationId: conversationId }, conversationId);
  }
  return { ...state, activeConversationId: null };
}

/** Get sorted messages for a conversation (oldest first). */
export function getMessages(state: ChatState, conversationId: string): ChatMessage[] {
  const msgMap = state.messagesByConversation.get(conversationId);
  if (!msgMap) return [];
  return Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/** Get conversations sorted by most recent activity. Uses last_message_at with updated_at fallback. */
export function getSortedConversations(state: ChatState): Conversation[] {
  return Array.from(state.conversations.values()).sort(
    (a, b) => {
      const aTime = a.last_message_at ?? a.created_at;
      const bTime = b.last_message_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    },
  );
}

/** Total unread count across all conversations. */
export function getTotalUnread(state: ChatState): number {
  let total = 0;
  for (const conv of state.conversations.values()) {
    total += conv.unread_count;
  }
  return total;
}

/** Remove a message from local state. Updates conversation last_message if needed. */
export function removeMessage(
  state: ChatState,
  messageId: string,
  conversationId: string,
): ChatState {
  const msgMap = state.messagesByConversation.get(conversationId);
  if (!msgMap || !msgMap.has(messageId)) return state;

  const nextMap = new Map(msgMap);
  nextMap.delete(messageId);

  const nextMsgs = new Map(state.messagesByConversation);
  nextMsgs.set(conversationId, nextMap);

  // Re-compute conversation last_message from remaining messages
  const nextConvs = new Map(state.conversations);
  const conv = nextConvs.get(conversationId);
  if (conv) {
    let latestMsg: ChatMessage | null = null;
    for (const m of nextMap.values()) {
      if (!latestMsg || new Date(m.created_at) > new Date(latestMsg.created_at)) {
        latestMsg = m;
      }
    }
    nextConvs.set(conversationId, { ...conv, last_message: latestMsg });
  }

  // Also clean up reactions for the deleted message
  const nextReactions = new Map(state.reactionsByMessage);
  nextReactions.delete(messageId);

  return { ...state, conversations: nextConvs, messagesByConversation: nextMsgs, reactionsByMessage: nextReactions };
}

/** Remove an entire conversation and its messages from local state. */
export function removeConversation(
  state: ChatState,
  conversationId: string,
): ChatState {
  const nextConvs = new Map(state.conversations);
  nextConvs.delete(conversationId);

  const nextMsgs = new Map(state.messagesByConversation);
  // Clean up reactions for all messages in this conversation
  const msgMap = nextMsgs.get(conversationId);
  const nextReactions = new Map(state.reactionsByMessage);
  if (msgMap) {
    for (const msgId of msgMap.keys()) {
      nextReactions.delete(msgId);
    }
  }
  nextMsgs.delete(conversationId);

  return {
    ...state,
    conversations: nextConvs,
    messagesByConversation: nextMsgs,
    reactionsByMessage: nextReactions,
    activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
  };
}

// ─── Reaction state management ──────────────────────────────────────────────

/** Merge reactions for a message (typically from API response). */
export function mergeReactions(
  state: ChatState,
  messageId: string,
  reactions: MessageReaction[],
): ChatState {
  const nextReactions = new Map(state.reactionsByMessage);
  nextReactions.set(messageId, reactions);
  return { ...state, reactionsByMessage: nextReactions };
}

/** Add a reaction optimistically. */
export function addReaction(
  state: ChatState,
  messageId: string,
  userId: string,
  emoji: string,
): ChatState {
  const existing = state.reactionsByMessage.get(messageId) ?? [];
  // Check if already exists
  if (existing.some((r) => r.user_id === userId && r.emoji === emoji)) return state;
  const nextReactions = new Map(state.reactionsByMessage);
  nextReactions.set(messageId, [
    ...existing,
    { message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString() },
  ]);
  return { ...state, reactionsByMessage: nextReactions };
}

/** Remove a reaction optimistically. */
export function removeReaction(
  state: ChatState,
  messageId: string,
  userId: string,
  emoji: string,
): ChatState {
  const existing = state.reactionsByMessage.get(messageId);
  if (!existing) return state;
  const filtered = existing.filter((r) => !(r.user_id === userId && r.emoji === emoji));
  const nextReactions = new Map(state.reactionsByMessage);
  nextReactions.set(messageId, filtered);
  return { ...state, reactionsByMessage: nextReactions };
}

/** Get aggregated reaction summaries for a message. */
export function getReactionSummaries(
  state: ChatState,
  messageId: string,
): ReactionSummary[] {
  const reactions = state.reactionsByMessage.get(messageId);
  if (!reactions || reactions.length === 0) return [];

  const emojiMap = new Map<string, { count: number; reacted: boolean; userIds: string[] }>();
  for (const r of reactions) {
    const entry = emojiMap.get(r.emoji) ?? { count: 0, reacted: false, userIds: [] };
    entry.count++;
    entry.userIds.push(r.user_id);
    if (r.user_id === state.currentUserId) entry.reacted = true;
    emojiMap.set(r.emoji, entry);
  }

  return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reacted: data.reacted,
    userIds: data.userIds,
  }));
}
