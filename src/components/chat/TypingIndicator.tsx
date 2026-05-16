// src/components/chat/TypingIndicator.tsx
// Shows "User is typing…" below the message thread.

'use client';

type TypingUser = { userId: string; displayName: string };

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0].displayName} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing…`
        : `${typingUsers[0].displayName} and ${typingUsers.length - 1} others are typing…`;

  return (
    <div className="px-4 py-1">
      <p className="text-xs text-slate-400 animate-pulse">{text}</p>
    </div>
  );
}
