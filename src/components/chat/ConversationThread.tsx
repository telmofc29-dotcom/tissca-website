// src/components/chat/ConversationThread.tsx
// Message thread with auto-scroll-to-bottom on new messages.
// Phase 3: Passes sender names and shows labels when sender changes in group chats.
// Phase 5: Reactions per message, typing indicator.
// v2.0: Scroll-to-top "Load older" with no visible jump on prepend.

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ReactionSummary } from '@/lib/chat/chat-types';
import { ChatBubble } from './ChatBubble';

interface ConversationThreadProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  isGroup?: boolean;
  memberNames?: Map<string, string>;
  onDeleteMessage?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  getReactions?: (messageId: string) => ReactionSummary[];
  highlightMessageId?: string | null;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  signedUrlResolver?: (bucket: string, path: string) => string | null;
}

export function ConversationThread({ messages, currentUserId, isGroup, memberNames, onDeleteMessage, onToggleReaction, getReactions, highlightMessageId, hasMore, loadingOlder, onLoadOlder, signedUrlResolver }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Auto-scroll to bottom on initial load or when a NEW message arrives at the end
  useEffect(() => {
    if (!highlightMessageId) {
      const wasAppend = messages.length > prevMessageCountRef.current;
      const isNewAtEnd = wasAppend && prevMessageCountRef.current > 0;

      if (isInitialLoadRef.current || isNewAtEnd) {
        bottomRef.current?.scrollIntoView({ behavior: isInitialLoadRef.current ? 'instant' : 'smooth' });
        isInitialLoadRef.current = false;
      }
      // If messages grew but first message changed → prepend (load older) → do NOT scroll
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, highlightMessageId, messages]);

  // Reset initial load flag when conversation changes (messages array identity changes)
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessageCountRef.current = 0;
  }, [currentUserId]);

  // Scroll to highlighted (search match) message
  useEffect(() => {
    if (highlightMessageId) {
      const el = containerRef.current?.querySelector(`[data-msg-id="${highlightMessageId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightMessageId]);

  // Detect scroll to top → trigger load older
  const handleScroll = useCallback(() => {
    if (!hasMore || loadingOlder || !onLoadOlder) return;
    const el = containerRef.current;
    if (!el) return;
    // Trigger when scrolled within 80px of top
    if (el.scrollTop < 80) {
      // Save scroll position so we can restore after prepend
      const prevScrollHeight = el.scrollHeight;
      onLoadOlder();
      // After DOM update, restore scroll position to prevent jump
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight;
      });
    }
  }, [hasMore, loadingOlder, onLoadOlder]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2" onScroll={handleScroll}>
      {/* Load older indicator */}
      {hasMore && (
        <div className="flex justify-center py-2">
          {loadingOlder ? (
            <span className="text-xs text-slate-400">Loading older messages\u2026</span>
          ) : (
            <button
              type="button"
              onClick={onLoadOlder}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition"
            >
              Load older messages
            </button>
          )}
        </div>
      )}

      {messages.map((msg, idx) => {
        const isMine = msg.sender_id === currentUserId;
        // Show sender label when sender changes (group only, non-mine messages)
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const showSenderLabel = !!(isGroup && !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id));
        const senderName = memberNames?.get(msg.sender_id) ?? null;

        return (
          <div key={msg.id} data-msg-id={msg.id} className={highlightMessageId === msg.id ? 'rounded-2xl ring-2 ring-blue-400 ring-offset-1 transition-all' : ''}>
            <ChatBubble
              message={msg}
              isMine={isMine}
              senderName={senderName}
              showSenderLabel={showSenderLabel}
              reactions={getReactions?.(msg.id)}
              onDelete={isMine ? onDeleteMessage : undefined}
              onToggleReaction={onToggleReaction}
              signedUrlResolver={signedUrlResolver}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
