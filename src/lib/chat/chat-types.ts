// src/lib/chat/chat-types.ts
//
// TissChat W-SYNC-1 — shared types aligned with LIVE TISSCA server contract.
// Preserves: 9 message types, 6 delivery statuses, monotonic promotion, reactions.

// ─── Delivery status (monotonic — NEVER downgrade) ──────────────────────────

export type DeliveryStatus = 'failed' | 'saved' | 'sending' | 'sent' | 'delivered' | 'read';

const STATUS_ORDER: Record<DeliveryStatus, number> = {
  failed: 0,
  saved: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  read: 5,
};

/** Returns true if `next` is a promotion over `current`. */
export function isStatusPromotion(current: DeliveryStatus, next: DeliveryStatus): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}

// ─── Message type (Phase 1: text only, extensible) ──────────────────────────

export type MessageType = 'text' | 'image' | 'document' | 'card' | 'lead' | 'job' | 'invoice' | 'quote' | 'asset' | 'client_profile';

// ─── Conversation type (live server contract) ───────────────────────────────

export type ConversationType = 'dm' | 'group';

// ─── Core models ────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;               // client-generated UUID
  conversation_id: string;
  workspace_id: string;
  sender_id: string;
  body: string;
  message_type: MessageType;
  payload: string | null;    // JSON for structured message metadata
  delivery_status: DeliveryStatus;
  created_at: string;        // ISO timestamp
};

export type ConversationMember = {
  id?: string;               // server-assigned UUID
  workspace_id?: string;
  user_id: string;
  role: string;              // 'admin' | 'member'
  joined_at: string;
  // Client-side enrichment (resolved from profiles)
  full_name?: string;
  email?: string;
};

export type ConversationMemberState = {
  conversation_id: string;
  user_id: string;
  workspace_id: string;
  last_delivered_message_id: string | null;
  last_delivered_at: string | null;
  last_read_message_id: string | null;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  workspace_id: string;
  type: ConversationType;
  title: string;
  created_by: string | null;
  is_group: boolean;         // kept for backward compat; derived from type
  created_at: string;
  last_message_id: string | null;
  last_message_at: string | null;
  dm_key: string | null;
  // Per-user state (from conversation_member_state)
  is_muted?: boolean;
  is_archived?: boolean;
  // Client-side enrichment (not stored in DB)
  last_message?: ChatMessage | null;
  unread_count: number;
  members?: ConversationMember[];
};

// ─── Reactions ──────────────────────────────────────────────────────────────

export type MessageReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

/** Aggregated reaction for display: emoji + count + whether current user reacted. */
export type ReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean; // current user reacted with this emoji
  userIds: string[];
};
