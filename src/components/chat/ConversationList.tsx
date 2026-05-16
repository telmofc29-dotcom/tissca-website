// src/components/chat/ConversationList.tsx
// Left-side conversation list with title, last message preview, time, unread badge.
// Phase 5: Mute/archive visual indicators, archive filter.

'use client';

import { useState } from 'react';
import type { Conversation } from '@/lib/chat/chat-types';

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationList({ conversations, activeId, onSelect, onNewChat }: ConversationListProps) {
  const [showArchived, setShowArchived] = useState(false);

  const activeConvs = conversations.filter((c) => !c.is_archived);
  const archivedConvs = conversations.filter((c) => c.is_archived);
  const displayConvs = showArchived ? archivedConvs : activeConvs;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">Chats</h2>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 transition hover:bg-gray-50 hover:text-slate-900"
          title="New chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Archive toggle */}
      {archivedConvs.length > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs font-medium text-slate-500 hover:bg-gray-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="20" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" stroke="currentColor" strokeWidth="2" />
            <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {showArchived ? 'Back to chats' : `Archived (${archivedConvs.length})`}
        </button>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayConvs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            {showArchived ? 'No archived conversations' : 'No conversations yet'}
          </div>
        )}

        {displayConvs.map((conv) => {
          const isActive = conv.id === activeId;
          const preview = conv.last_message?.body ?? 'No messages yet';
          const time = conv.last_message?.created_at ?? conv.last_message_at ?? conv.created_at;

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition ${
                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  {conv.is_group && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <p className="truncate text-sm font-semibold text-slate-900">{conv.title}</p>                  {conv.is_muted && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400" aria-hidden="true">
                      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(time)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-500">{preview}</p>
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
