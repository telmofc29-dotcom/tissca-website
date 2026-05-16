// src/components/chat/ReactionDisplay.tsx
// Shows aggregated reaction badges below a message bubble.

'use client';

import type { ReactionSummary } from '@/lib/chat/chat-types';

interface ReactionDisplayProps {
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
}

export function ReactionDisplay({ reactions, onToggle }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition ${
            r.reacted
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-gray-50 text-slate-600 hover:border-gray-300'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
}
