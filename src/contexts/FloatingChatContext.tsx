// src/contexts/FloatingChatContext.tsx
//
// Lightweight context for floating chat panel state.
// Lives at the member app layout level so it persists across navigation.

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type FloatingChatState = {
  conversationId: string | null;
  conversationTitle: string;
  isOpen: boolean;
  position: { x: number; y: number };
};

type FloatingChatActions = {
  open: (conversationId: string, title: string) => void;
  /** Opens the panel without selecting a conversation (shows conversation list). */
  openPanel: () => void;
  close: () => void;
  toggle: () => void;
  setPosition: (pos: { x: number; y: number }) => void;
};

type FloatingChatContextValue = FloatingChatState & FloatingChatActions;

const FloatingChatContext = createContext<FloatingChatContextValue | null>(null);

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FloatingChatState>({
    conversationId: null,
    conversationTitle: '',
    isOpen: false,
    position: { x: -1, y: -1 }, // -1 means "use default"
  });

  const open = useCallback((conversationId: string, title: string) => {
    setState((s) => ({
      ...s,
      conversationId,
      conversationTitle: title,
      isOpen: true,
    }));
  }, []);

  const openPanel = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({
      ...s,
      isOpen: false,
      conversationId: null,
      conversationTitle: '',
    }));
  }, []);

  const toggle = useCallback(() => {
    setState((s) => ({ ...s, isOpen: !s.isOpen }));
  }, []);

  const setPosition = useCallback((pos: { x: number; y: number }) => {
    setState((s) => ({ ...s, position: pos }));
  }, []);

  return (
    <FloatingChatContext.Provider value={{ ...state, open, openPanel, close, toggle, setPosition }}>
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat(): FloatingChatContextValue {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) throw new Error('useFloatingChat must be inside FloatingChatProvider');
  return ctx;
}

/**
 * Returns true if the floating panel should be visible.
 * Hidden when user is on /app/chat (inline thread shown instead).
 */
export function useFloatingChatVisible(): boolean {
  const pathname = usePathname();
  const { isOpen } = useFloatingChat();
  const isOnChatPage = pathname === '/app/chat' || pathname.startsWith('/app/chat/');
  return isOpen && !isOnChatPage;
}
