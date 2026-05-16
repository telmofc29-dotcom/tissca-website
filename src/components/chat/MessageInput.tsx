// src/components/chat/MessageInput.tsx
// Text input with send button + attachment menu for Phase 2 structured messages.

'use client';

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { AttachmentMenu } from './AttachmentMenu';
import type { ShareEntityType } from './SharePicker';

interface MessageInputProps {
  onSend: (body: string) => void;
  onAttachFile: (file: File, category: 'image' | 'document') => void;
  onShareEntity: (entityType: ShareEntityType) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const DOCUMENT_ACCEPT = 'application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

export function MessageInput({ onSend, onAttachFile, onShareEntity, onTyping, onStopTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCategoryRef = useRef<'image' | 'document'>('image');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onStopTyping?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectFile = useCallback((category: 'image' | 'document') => {
    pendingCategoryRef.current = category;
    if (fileInputRef.current) {
      fileInputRef.current.accept = category === 'image' ? IMAGE_ACCEPT : DOCUMENT_ACCEPT;
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(() => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      onAttachFile(file, pendingCategoryRef.current);
    }
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onAttachFile]);

  return (
    <div className="relative flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Attachment button */}
      <div className="relative">
        <AttachmentMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelectFile={handleSelectFile}
          onSelectEntity={onShareEntity}
        />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={disabled}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 transition hover:bg-gray-50 hover:text-slate-700 disabled:opacity-40"
          title="Attach"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        disabled={disabled}
        rows={1}
        className="min-h-[38px] max-h-[120px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Send"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
