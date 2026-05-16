// src/components/chat/FloatingChatPanel.tsx
//
// Draggable floating chat window rendered at the member app shell level.
// Self-contained: owns its own useChat instance for the active conversation.
// Only mounts when floating context says isOpen AND user is NOT on /app/chat.

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFloatingChat, useFloatingChatVisible } from '@/contexts/FloatingChatContext';
import { useChat } from '@/lib/chat/useChat';
import { useTypingIndicator } from '@/lib/chat/useTypingIndicator';
import { getReactionSummaries } from '@/lib/chat/chat-store';
import { ConversationThread } from './ConversationThread';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import type { ShareEntityType } from './SharePicker';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 560;
const MIN_WIDTH = 340;

export function FloatingChatPanel() {
  const visible = useFloatingChatVisible();
  const { conversationId, conversationTitle, position, setPosition, close, open: openFloating } =
    useFloatingChat();

  const {
    conversations,
    activeMessages,
    activeConversation,
    userId,
    memberNamesMap,
    state: chatState,
    sendMessage,
    sendFileMessage,
    deleteMessage,
    toggleReaction,
    fetchReactionsForMessage,
    openConversation,
    fetchOlderMessages,
    hasMoreMessages,
    isLoadingOlder,
    getSignedUrl,
  } = useChat();

  // Open the conversation in this useChat instance when it becomes visible
  useEffect(() => {
    if (visible && conversationId) {
      openConversation(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conversationId]);

  // Fetch reactions when messages load
  useEffect(() => {
    if (visible && conversationId && activeMessages.length > 0) {
      for (const msg of activeMessages) {
        fetchReactionsForMessage(msg.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conversationId, activeMessages.length]);

  // Typing indicator
  const currentUserName = memberNamesMap.get(userId ?? '') ?? 'You';
  const { typingUsers, emitTyping, stopTyping } = useTypingIndicator(
    visible ? conversationId : null,
    userId,
    currentUserName,
  );

  // Reactions helper
  const getReactions = useCallback(
    (messageId: string) => getReactionSummaries(chatState, messageId),
    [chatState],
  );

  // Message handlers
  const handleSend = useCallback(
    (body: string) => {
      if (conversationId) sendMessage(conversationId, body);
    },
    [conversationId, sendMessage],
  );

  const handleAttachFile = useCallback(
    (file: File, category: 'image' | 'document') => {
      if (conversationId) sendFileMessage(conversationId, file, category);
    },
    [conversationId, sendFileMessage],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (conversationId) deleteMessage(messageId, conversationId);
    },
    [conversationId, deleteMessage],
  );

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (conversationId) toggleReaction(messageId, conversationId, emoji);
    },
    [conversationId, toggleReaction],
  );

  // No-op for share entity in floating panel (structured sharing only on chat page)
  const handleShareEntity = useCallback((_type: ShareEntityType) => {}, []);

  const stableMemberNames = useMemo(() => memberNamesMap, [memberNamesMap]);

  // ─── Dragging logic ───────────────────────────────────────────────────

  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setIsDragging(true);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - MIN_WIDTH));
      const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 60));
      setPosition({ x, y });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, setPosition]);

  // Default position: bottom-right with padding
  const posX = position.x >= 0 ? position.x : window.innerWidth - DEFAULT_WIDTH - 32;
  const posY = position.y >= 0 ? position.y : window.innerHeight - DEFAULT_HEIGHT - 32;

  // Title: use context title, fall back to active conversation
  const title = conversationTitle || activeConversation?.title || 'Chat';

  if (!visible) return null;

  // ─── Conversation list view (panel open but no conversation selected) ──

  if (!conversationId) {
    return (
      <div
        ref={panelRef}
        className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        style={{
          left: posX,
          top: posY,
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
          maxWidth: `calc(100vw - 16px)`,
          maxHeight: `calc(100vh - 16px)`,
          userSelect: isDragging ? 'none' : 'auto',
        }}
      >
        {/* Header */}
        <div
          onMouseDown={onDragStart}
          className="flex shrink-0 cursor-grab items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 active:cursor-grabbing"
        >
          <div className="flex flex-col gap-0.5 opacity-40">
            <div className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-white" />
              <span className="h-1 w-1 rounded-full bg-white" />
            </div>
            <div className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-white" />
              <span className="h-1 w-1 rounded-full bg-white" />
            </div>
          </div>
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">TissChat</h3>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-blue-200 transition hover:bg-white/20 hover:text-white"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-gray-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 12c0 4.4-3.6 8-8 8-1.1 0-2.2-.2-3.2-.6L4 20l.9-4.3c-.6-1.1-.9-2.3-.9-3.7 0-4.4 3.6-8 8-8s8 3.6 8 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p>No conversations yet</p>
              <p className="text-xs text-gray-300">Open TissChat to start a conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => openFloating(conv.id, conv.title)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  {conv.is_group ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{conv.title}</p>
                  {conv.last_message && (
                    <p className="truncate text-xs text-gray-400">{conv.last_message.body}</p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── Active conversation view ──────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      style={{
        left: posX,
        top: posY,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        maxWidth: `calc(100vw - 16px)`,
        maxHeight: `calc(100vh - 16px)`,
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Drag handle + header */}
      <div
        onMouseDown={onDragStart}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 active:cursor-grabbing"
      >
        {/* Drag indicator dots */}
        <div className="flex flex-col gap-0.5 opacity-40">
          <div className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
          <div className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          {activeConversation?.is_group && activeConversation.members && (
            <p className="truncate text-[11px] text-blue-200">
              {activeConversation.members.length} member{activeConversation.members.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Minimise — navigate to chat page */}
        <button
          type="button"
          onClick={() => {
            window.location.href = `/app/chat?conversation=${conversationId}`;
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-blue-200 transition hover:bg-white/20 hover:text-white"
          title="Open in TissChat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={close}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-blue-200 transition hover:bg-white/20 hover:text-white"
          title="Close chat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <ConversationThread
        messages={activeMessages}
        currentUserId={userId}
        isGroup={activeConversation?.is_group}
        memberNames={stableMemberNames}
        onDeleteMessage={handleDeleteMessage}
        onToggleReaction={handleToggleReaction}
        getReactions={getReactions}
        hasMore={conversationId ? hasMoreMessages(conversationId) : false}
        loadingOlder={conversationId ? isLoadingOlder(conversationId) : false}
        onLoadOlder={conversationId ? () => fetchOlderMessages(conversationId) : undefined}
        signedUrlResolver={getSignedUrl}
      />

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Composer */}
      <MessageInput
        onSend={handleSend}
        onAttachFile={handleAttachFile}
        onShareEntity={handleShareEntity}
        onTyping={emitTyping}
        onStopTyping={stopTyping}
      />
    </div>
  );
}
