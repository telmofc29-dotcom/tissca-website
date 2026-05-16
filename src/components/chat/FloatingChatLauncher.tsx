// src/components/chat/FloatingChatLauncher.tsx
//
// Persistent corner bubble for TissChat — visible to eligible team workspace
// users on all /app/* pages except /app/chat (where the full page is shown).
//
// Behaviour:
// - Toggles the floating chat panel open/closed.
// - Shows unread badge when there are unread messages.
// - Hidden on /app/chat and for non-team-tier users.
//
// NOTE: chatUnread is passed as a prop from the layout to avoid a duplicate
// useChatUnreadCount polling interval. The layout already polls.

'use client';

import { usePathname } from 'next/navigation';
import { useFloatingChat } from '@/contexts/FloatingChatContext';

export function FloatingChatLauncher({ isTeamTier, chatUnread }: { isTeamTier: boolean; chatUnread: number }) {
  const pathname = usePathname();
  const { isOpen, toggle } = useFloatingChat();

  const isOnChatPage = pathname === '/app/chat' || pathname.startsWith('/app/chat/');

  // Don't render for non-team users or when already on the chat page
  if (!isTeamTier || isOnChatPage) return null;

  const handleClick = () => {
    toggle(); // open/close the floating panel
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={chatUnread > 0 ? `${chatUnread} unread message${chatUnread !== 1 ? 's' : ''}` : 'Open TissChat'}
      className={`fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
        isOpen
          ? 'bg-blue-700 text-white ring-2 ring-blue-300'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      aria-label="TissChat"
    >
      {/* Chat bubble icon */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 12c0 4.4-3.6 8-8 8-1.1 0-2.2-.2-3.2-.6L4 20l.9-4.3c-.6-1.1-.9-2.3-.9-3.7 0-4.4 3.6-8 8-8s8 3.6 8 8Z"
          fill="currentColor"
          opacity="0.15"
        />
        <path
          d="M20 12c0 4.4-3.6 8-8 8-1.1 0-2.2-.2-3.2-.6L4 20l.9-4.3c-.6-1.1-.9-2.3-.9-3.7 0-4.4 3.6-8 8-8s8 3.6 8 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 12h8M8 9h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>

      {/* Unread badge */}
      {chatUnread > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow">
          {chatUnread > 99 ? '99+' : chatUnread}
        </span>
      )}
    </button>
  );
}
