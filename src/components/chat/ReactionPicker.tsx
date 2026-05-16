// src/components/chat/ReactionPicker.tsx
// Curated emoji picker for message reactions.
// Shows a horizontal row of emoji buttons.

'use client';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  return (
    <div
      className="absolute bottom-full mb-1 flex gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-lg z-10"
      onMouseLeave={onClose}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:scale-125 hover:bg-gray-100"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
