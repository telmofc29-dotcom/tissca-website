// src/app/(member)/app/chat/page.tsx v7.0
//
// PURPOSE:
// - TissChat Phase 1+2+3+4+5 — workspace messaging with structured messages,
//   group chats, deep-link, browser notifications, message deletion,
//   in-thread search, group management, invoice/quote/asset sharing,
//   typing indicators, reactions, conversation controls (mute/archive/delete).
//
// ARCHITECTURE:
// - Local-first: UI reads only from client state via useChat hook.
// - Receive paths: Supabase Realtime + poll fallback (~5s).
// - De-dupe: All paths merge through UUID-keyed store.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI.
// - v2.0: Wire workspace/user context.
// - v3.0: Full Phase 1 implementation — conversations + messages.
// - v4.0: Phase 2 — structured messages (image, document, lead, job).
// - v5.0: Phase 3 — group chats, member picker, deep-link, notifications.
// - v6.0: Phase 4 — invoice/quote/asset sharing, message deletion, search,
//          group management, document.title unread badge.
// - v7.0: Phase 5 — typing indicators, reactions, conversation controls
//          (mute/archive/delete), expanded settings panel.

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChat } from '@/lib/chat/useChat';
import { useNotifications } from '@/lib/chat/useNotifications';
import { useTypingIndicator } from '@/lib/chat/useTypingIndicator';
import { getReactionSummaries } from '@/lib/chat/chat-store';
import { ConversationList } from '@/components/chat/ConversationList';
import { ConversationThread } from '@/components/chat/ConversationThread';
import { MessageInput } from '@/components/chat/MessageInput';
import { ThreadSearch } from '@/components/chat/ThreadSearch';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { GroupSettingsPanel } from '@/components/chat/GroupSettingsPanel';
import { SharePicker, type LeadItem, type JobItem, type ShareEntityType, type ShareEntity } from '@/components/chat/SharePicker';
import { MemberPicker } from '@/components/chat/MemberPicker';
import type { ChatMessage } from '@/lib/chat/chat-types';
import { useFloatingChat } from '@/contexts/FloatingChatContext';
import {
  leadPreviewText,
  jobPreviewText,
  clientProfilePreviewText,
  type ChatLeadPayload,
  type ChatJobPayload,
  type ChatClientProfilePayload,
} from '@/lib/chat/chat-payloads';

export default function AppChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permission, isSupported, requestPermission, showNotification } = useNotifications();

  // Stable callback ref — useChat stores this in a ref so updating it doesn't cause re-subscription
  const incomingCallbackRef = useRef<(msg: ChatMessage) => void>(() => {});
  const stableIncomingCallback = useCallback((msg: ChatMessage) => {
    incomingCallbackRef.current(msg);
  }, []);

  const {
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    totalUnread,
    userId,
    memberNamesMap,
    state: chatState,
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
    fetchOlderMessages,
    hasMoreMessages,
    isLoadingOlder,
    getSignedUrl,
  } = useChat(stableIncomingCallback);

  // Update the ref-based callback so it always has fresh conversations/memberNamesMap
  useEffect(() => {
    incomingCallbackRef.current = (msg: ChatMessage) => {
      const conv = conversations.find((c) => c.id === msg.conversation_id);
      if (conv?.is_muted) return;
      const senderName = memberNamesMap.get(msg.sender_id);
      showNotification('TissChat', msg.body || 'New message', () => {
        router.replace(`/app/chat?conversation=${msg.conversation_id}`);
      }, senderName);
    };
  }, [conversations, memberNamesMap, showNotification, router]);

  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showAddMemberPicker, setShowAddMemberPicker] = useState(false);
  const [shareType, setShareType] = useState<ShareEntityType | null>(null);
  const [pendingShare, setPendingShare] = useState<{ entity: ShareEntity; type: 'lead' | 'job' } | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  // ─── Floating chat ────────────────────────────────────────────────────
  const floatingChat = useFloatingChat();

  // ─── Chat creation error ──────────────────────────────────────────────
  const [chatError, setChatError] = useState<string | null>(null);

  // ─── Typing indicator ─────────────────────────────────────────────────
  const currentUserName = memberNamesMap.get(userId ?? '') ?? 'You';
  const { typingUsers, emitTyping, stopTyping } = useTypingIndicator(
    activeConversationId,
    userId,
    currentUserName,
  );

  // ─── Reactions — get summaries for a message ──────────────────────────
  const getReactions = useCallback(
    (messageId: string) => getReactionSummaries(chatState, messageId),
    [chatState],
  );

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (activeConversationId) {
        toggleReaction(messageId, activeConversationId, emoji);
      }
    },
    [activeConversationId, toggleReaction],
  );

  // Fetch reactions when opening a conversation
  useEffect(() => {
    if (activeConversationId && activeMessages.length > 0) {
      // Fetch reactions for visible messages (batch)
      for (const msg of activeMessages) {
        fetchReactionsForMessage(msg.id);
      }
    }
    // Only re-run when conversation changes or messages length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, activeMessages.length]);

  // ─── Search state ─────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return activeMessages
      .filter((m) => m.body.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [activeMessages, searchQuery]);

  const highlightMessageId = searchMatches.length > 0
    ? searchMatches[searchMatchIdx % searchMatches.length] ?? null
    : null;

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setSearchMatchIdx(0);
  }, []);

  const handleSearchNext = useCallback(() => {
    setSearchMatchIdx((i) => (searchMatches.length > 0 ? (i + 1) % searchMatches.length : 0));
  }, [searchMatches.length]);

  const handleSearchPrev = useCallback(() => {
    setSearchMatchIdx((i) => (searchMatches.length > 0 ? (i - 1 + searchMatches.length) % searchMatches.length : 0));
  }, [searchMatches.length]);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchMatchIdx(0);
  }, []);

  // ─── Deep-link: ?conversation=<id> ────────────────────────────────────
  useEffect(() => {
    if (deepLinkHandled) return;
    const convId = searchParams.get('conversation');
    if (convId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === convId);
      if (conv) {
        openConversation(convId);
        floatingChat.open(convId, conv.title ?? 'Chat');
      }
      setDeepLinkHandled(true);
      // Clear query param to avoid re-opening on refresh
      router.replace('/app/chat', { scroll: false });
    }
  }, [searchParams, conversations, deepLinkHandled, openConversation, router, floatingChat]);

  // ─── Notification permission prompt (one-time) ────────────────────────
  const [notifDismissed, setNotifDismissed] = useState(false);
  const showNotifBanner = isSupported && permission === 'default' && !notifDismissed;

  // ─── Document.title unread badge ──────────────────────────────────────
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) TissChat` : 'TissChat';
    return () => { document.title = 'TissChat'; };
  }, [totalUnread]);

  // ─── Message deletion handler ─────────────────────────────────────────
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (activeConversationId) {
      deleteMessage(messageId, activeConversationId);
    }
  }, [activeConversationId, deleteMessage]);

  // ─── Unified chat creation handlers ─────────────────────────────────
  const handleCreateDm = async (memberId: string, memberName: string) => {
    setChatError(null);
    const result = await createConversation(memberName, [memberId]);
    if ('id' in result) {
      openConversation(result.id);
      floatingChat.open(result.id, memberName);
    } else {
      setChatError(result.error);
      return; // keep modal open so user sees the error
    }
    setShowNewChat(false);
  };

  const handleCreateGroup = async (title: string, memberIds: string[]) => {
    setChatError(null);
    const result = await createConversation(title, memberIds);
    if ('id' in result) {
      openConversation(result.id);
      floatingChat.open(result.id, title);
    } else {
      setChatError(result.error);
      return;
    }
    setShowNewChat(false);
  };

  const handleSend = (body: string) => {
    if (activeConversationId) {
      sendMessage(activeConversationId, body);
    }
  };

  const handleAttachFile = useCallback((file: File, category: 'image' | 'document') => {
    if (activeConversationId) {
      sendFileMessage(activeConversationId, file, category);
    }
  }, [activeConversationId, sendFileMessage]);

  const handleShareEntity = useCallback((entityType: ShareEntityType) => {
    if (entityType === 'client_profile') {
      setShowContactForm(true);
    } else {
      setShareType(entityType);
    }
  }, []);

  const handleEntitySelected = useCallback((entity: ShareEntity) => {
    if (!activeConversationId || !shareType) return;
    // Store entity + type for values dialog (don't send yet)
    setPendingShare({ entity, type: shareType as 'lead' | 'job' });
    setShareType(null);
  }, [activeConversationId, shareType]);

  // ─── With/without values confirm ─────────────────────────────────────
  const handleValuesConfirm = useCallback((includeValues: boolean) => {
    if (!activeConversationId || !pendingShare) return;

    if (pendingShare.type === 'lead') {
      const lead = pendingShare.entity as LeadItem;
      const name = lead.client_name || 'Unnamed lead';
      const val = includeValues ? (lead.estimated_value ?? 0) : 0;
      const payload: ChatLeadPayload = {
        type: 'lead',
        id: lead.id,
        clientName: name,
        status: lead.status || 'new',
        value: val,
        includeValues: includeValues ? 'true' : 'false',
        sourceToolKey: lead.source ?? null,
        notes: lead.notes ?? null,
        shareable: true,
        preview: leadPreviewText(name, includeValues ? lead.estimated_value : null),
      };
      sendStructuredMessage(activeConversationId, 'lead', payload.preview, payload);
    } else if (pendingShare.type === 'job') {
      const job = pendingShare.entity as JobItem;
      const title = job.client_name || 'Untitled job';
      const val = includeValues ? (job.job_value ?? 0) : 0;
      const payload: ChatJobPayload = {
        type: 'job',
        id: job.id,
        clientName: title,
        status: job.status || 'scheduled',
        value: val,
        includeValues: includeValues ? 'true' : 'false',
        scheduled_date: job.start_date_millis != null ? String(job.start_date_millis) : null,
        notes: job.notes ?? null,
        shareable: true,
        preview: jobPreviewText(title, includeValues ? job.job_value : null),
      };
      sendStructuredMessage(activeConversationId, 'job', payload.preview, payload);
    }

    setPendingShare(null);
  }, [activeConversationId, pendingShare, sendStructuredMessage]);

  // ─── Contact form send ────────────────────────────────────────────────
  const handleContactSend = useCallback(() => {
    if (!activeConversationId || !contactName.trim()) return;
    const name = contactName.trim();
    const payload: ChatClientProfilePayload = {
      type: 'client_profile',
      name,
      phone: contactPhone.trim() || null,
      email: contactEmail.trim() || null,
      address: contactAddress.trim() || null,
      preview: clientProfilePreviewText(name),
    };
    sendStructuredMessage(activeConversationId, 'client_profile', payload.preview, payload);
    setShowContactForm(false);
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactAddress('');
  }, [activeConversationId, contactName, contactPhone, contactEmail, contactAddress, sendStructuredMessage]);

  // Memoize member names map so reference is stable
  const stableMemberNames = useMemo(() => memberNamesMap, [memberNamesMap]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
      {/* Left: Conversation list — hidden on mobile when a thread is open */}
      <div
        className={`w-full border-r border-gray-200 md:w-80 md:shrink-0 ${
          activeConversationId ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(id) => {
            openConversation(id);
            const conv = conversations.find((c) => c.id === id);
            floatingChat.open(id, conv?.title ?? 'Chat');
          }}
          onNewChat={() => setShowNewChat(true)}
        />

        {/* Notification permission banner */}
        {showNotifBanner && (
          <div className="border-t border-gray-200 px-4 py-2 flex items-center gap-2">
            <p className="flex-1 text-xs text-slate-500">Enable notifications?</p>
            <button
              type="button"
              onClick={requestPermission}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Allow
            </button>
            <button
              type="button"
              onClick={() => setNotifDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unread badge footer */}
        {totalUnread > 0 && (
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-slate-500">
            {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Right: Thread or empty state */}
      <div className="flex flex-1 flex-col">
        {activeConversationId && activeConversation ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              {/* Back button on mobile */}
              <button
                type="button"
                onClick={closeConversation}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-gray-100 md:hidden"
                title="Back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {activeConversation.title}
                </h2>
                {activeConversation.is_group && activeConversation.members && activeConversation.members.length > 0 && (
                  <p className="truncate text-[11px] text-slate-400">
                    {activeConversation.members.length} member{activeConversation.members.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {/* Search button */}
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-gray-100 hover:text-slate-600"
                title="Search messages"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {/* Group settings button — now shown for all conversations */}
              <button
                type="button"
                onClick={() => setShowGroupSettings(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-gray-100 hover:text-slate-600"
                title="Conversation settings"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Search bar */}
            {searchOpen && (
              <ThreadSearch
                onSearch={handleSearchChange}
                matchCount={searchMatches.length}
                currentMatch={searchMatchIdx}
                onPrev={handleSearchPrev}
                onNext={handleSearchNext}
                onClose={handleSearchClose}
              />
            )}

            {/* Messages */}
            <ConversationThread
              messages={activeMessages}
              currentUserId={userId}
              isGroup={activeConversation.is_group}
              memberNames={stableMemberNames}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              getReactions={getReactions}
              highlightMessageId={highlightMessageId}
              hasMore={hasMoreMessages(activeConversationId!)}
              loadingOlder={isLoadingOlder(activeConversationId!)}
              onLoadOlder={() => fetchOlderMessages(activeConversationId!)}
              signedUrlResolver={getSignedUrl}
            />

            {/* Typing indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onAttachFile={handleAttachFile}
              onShareEntity={handleShareEntity}
              onTyping={emitTyping}
              onStopTyping={stopTyping}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-slate-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 12c0 4.4-3.6 8-8 8-1.1 0-2.2-.2-3.2-.6L4 20l.9-4.3c-.6-1.1-.9-2.3-.9-3.7 0-4.4 3.6-8 8-8s8 3.6 8 8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M8 12h8M8 9h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Select a conversation or start a new one
            </p>
          </div>
        )}
      </div>

      {/* Unified new chat modal — DM (1 selected) or Group (2+ selected) */}
      {showNewChat && (
        <>
          {chatError && (
            <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shadow-lg">
              {chatError}
            </div>
          )}
          <MemberPicker
            onCreateDm={handleCreateDm}
            onCreateGroup={handleCreateGroup}
            onCancel={() => { setShowNewChat(false); setChatError(null); }}
          />
        </>
      )}

      {/* Share picker modal (lead/job only) */}
      {shareType && shareType !== 'client_profile' && (
        <SharePicker
          entityType={shareType}
          onSelect={handleEntitySelected}
          onClose={() => setShareType(null)}
        />
      )}

      {/* With/without values dialog */}
      {pendingShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setPendingShare(null)}>
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-gray-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Share {pendingShare.type}</h3>
            <p className="mt-1 text-sm text-slate-500">Include financial values in this shared {pendingShare.type}?</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleValuesConfirm(true)}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Share with values
              </button>
              <button
                type="button"
                onClick={() => handleValuesConfirm(false)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-gray-50"
              >
                Share without values
              </button>
              <button
                type="button"
                onClick={() => setPendingShare(null)}
                className="mt-1 text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact form modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowContactForm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Share Contact</h3>
            <div className="mt-3 flex flex-col gap-2.5">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name *"
                maxLength={100}
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone"
                maxLength={30}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Email"
                maxLength={100}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="Address"
                maxLength={200}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowContactForm(false); setContactName(''); setContactPhone(''); setContactEmail(''); setContactAddress(''); }}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContactSend}
                disabled={!contactName.trim()}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group settings modal — now available for all conversations */}
      {showGroupSettings && activeConversation && (
        <GroupSettingsPanel
          title={activeConversation.title}
          members={activeConversation.members ?? []}
          currentUserId={userId}
          isGroup={activeConversation.is_group}
          isMuted={activeConversation.is_muted}
          isArchived={activeConversation.is_archived}
          onRename={(t) => renameConversation(activeConversationId!, t)}
          onRemoveMember={(id) => removeGroupMember(activeConversationId!, id)}
          onAddMembers={activeConversation.is_group ? () => {
            setShowGroupSettings(false);
            setShowAddMemberPicker(true);
          } : undefined}
          onLeave={() => leaveGroup(activeConversationId!)}
          onMute={(muted) => muteConversation(activeConversationId!, muted)}
          onArchive={(archived) => archiveConversation(activeConversationId!, archived)}
          onDelete={() => deleteConversation(activeConversationId!)}
          onClose={() => setShowGroupSettings(false)}
        />
      )}

      {/* Add member picker modal (for existing groups) */}
      {showAddMemberPicker && activeConversation?.is_group && (
        <MemberPicker
          mode="add"
          onAddMembers={async (memberIds: string[]) => {
            if (activeConversationId && memberIds.length > 0) {
              await addGroupMembers(activeConversationId, memberIds);
            }
            setShowAddMemberPicker(false);
            setShowGroupSettings(true);
          }}
          onCancel={() => {
            setShowAddMemberPicker(false);
            setShowGroupSettings(true);
          }}
        />
      )}
    </div>
  );
}
