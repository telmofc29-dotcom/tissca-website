// src/components/chat/ThreadSearch.tsx
//
// In-thread message search bar with match count and prev/next navigation.
// Client-side filter on message body text.

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface ThreadSearchProps {
  onSearch: (query: string) => void;
  matchCount: number;
  currentMatch: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ThreadSearch({ onSearch, matchCount, currentMatch, onPrev, onNext, onClose }: ThreadSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearch(val);
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) onPrev();
      else onNext();
    }
  }, [onClose, onPrev, onNext]);

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search messages…"
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
      />
      {query && (
        <span className="shrink-0 text-xs text-slate-400">
          {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : 'No matches'}
        </span>
      )}
      {query && matchCount > 1 && (
        <>
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-gray-200 hover:text-slate-600"
            title="Previous match"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-gray-200 hover:text-slate-600"
            title="Next match"
          >
            ▼
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-gray-200 hover:text-slate-600"
        title="Close search"
      >
        ✕
      </button>
    </div>
  );
}
