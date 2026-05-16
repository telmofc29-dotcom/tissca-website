// src/components/chat/ChatBubble.tsx
// Single message bubble — mine (right, blue) vs theirs (left, gray).
// Shows delivery status indicator for own messages.
// Phase 2: Routes structured message types to StructuredMessageCard.
// Phase 4: Delete own messages via hover action button.
// Phase 5: Emoji reactions (picker + display).

'use client';

import { useState } from 'react';
import type { ChatMessage, DeliveryStatus, ReactionSummary } from '@/lib/chat/chat-types';
import { StructuredMessageCard } from './StructuredMessageCard';
import { ReactionPicker } from './ReactionPicker';
import { ReactionDisplay } from './ReactionDisplay';

function StatusIndicator({ status }: { status: DeliveryStatus }) {
  const label: Record<DeliveryStatus, string> = {
    failed: '!',
    saved: '○',
    sending: '◌',
    sent: '✓',
    delivered: '✓✓',
    read: '✓✓',
  };

  const color =
    status === 'failed'
      ? 'text-red-500'
      : status === 'read'
        ? 'text-blue-500'
        : 'text-slate-400';

  return (
    <span className={`ml-1.5 inline-block text-[10px] leading-none ${color}`} title={status}>
      {label[status]}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const STRUCTURED_TYPES = new Set(['image', 'document', 'lead', 'job', 'card', 'invoice', 'quote', 'asset', 'client_profile']);

interface ChatBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  senderName?: string | null;
  showSenderLabel?: boolean;
  reactions?: ReactionSummary[];
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  signedUrlResolver?: (bucket: string, path: string) => string | null;
}

export function ChatBubble({ message, isMine, senderName, showSenderLabel, reactions, onDelete, onToggleReaction, signedUrlResolver }: ChatBubbleProps) {
  const isStructured = STRUCTURED_TYPES.has(message.message_type);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  return (
    <div
      className={`group relative flex ${isMine ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Delete action — own messages only, shown on hover */}
      {isMine && onDelete && showActions && (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          className="mr-1 self-center rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          title="Delete message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {/* Reaction trigger — shown on hover for all messages */}
      {onToggleReaction && showActions && (
        <div className="relative self-center">
          <button
            type="button"
            onClick={() => setShowReactionPicker((v) => !v)}
            className={`${isMine ? 'mr-1' : 'ml-1'} rounded-full p-1 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600`}
            title="React"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {showReactionPicker && (
            <ReactionPicker
              onSelect={(emoji) => onToggleReaction(message.id, emoji)}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isMine
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-slate-900 rounded-bl-md'
        }`}
      >
        {/* Group sender label — shown only when sender changes */}
        {showSenderLabel && !isMine && senderName && (
          <p className="mb-0.5 text-[11px] font-semibold text-blue-600">{senderName}</p>
        )}
        {isStructured ? (
          <StructuredMessageCard message={message} isMine={isMine} signedUrlResolver={signedUrlResolver} />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        )}
        <div
          className={`mt-0.5 flex items-center justify-end gap-0.5 text-[10px] ${
            isMine ? 'text-blue-200' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
          {isMine && <StatusIndicator status={message.delivery_status} />}
        </div>
      </div>
      {/* Reactions display */}
      {reactions && reactions.length > 0 && onToggleReaction && (
        <div className={`${isMine ? 'flex justify-end' : ''}`}>
          <ReactionDisplay
            reactions={reactions}
            onToggle={(emoji) => onToggleReaction(message.id, emoji)}
          />
        </div>
      )}
    </div>
  );
}
