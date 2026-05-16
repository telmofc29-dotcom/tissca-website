// src/lib/chat/useTypingIndicator.ts
//
// TissChat Phase 5 — Typing indicator using Supabase Realtime Presence.
// Creates a presence channel per active conversation.
// Emits typing state on keystroke (debounced), auto-stops after idle timeout.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const TYPING_TIMEOUT = 3000; // Stop showing "typing" after 3s of inactivity
const EMIT_DEBOUNCE = 1000;  // Debounce typing events to 1 per second

type TypingUser = {
  userId: string;
  displayName: string;
};

export function useTypingIndicator(
  conversationId: string | null,
  userId: string | null,
  displayName: string,
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);
  const lastEmitRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingRef = useRef(false);

  // Subscribe to presence for the active conversation
  useEffect(() => {
    if (!conversationId || !userId) {
      setTypingUsers([]);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const client = supabase;

    const channel = client.channel(`typing-${conversationId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: TypingUser[] = [];
        for (const [key, presences] of Object.entries(presenceState)) {
          if (key === userId) continue; // Don't show self
          const presence = (presences as any[])[0];
          if (presence?.typing) {
            users.push({
              userId: key,
              displayName: presence.displayName || key.slice(0, 8),
            });
          }
        }
        setTypingUsers(users);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.untrack();
      client.removeChannel(channel);
      channelRef.current = null;
      trackingRef.current = false;
      setTypingUsers([]);
    };
  }, [conversationId, userId]);

  // Emit typing event (debounced)
  const emitTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    const now = Date.now();
    if (now - lastEmitRef.current < EMIT_DEBOUNCE) return;
    lastEmitRef.current = now;

    channelRef.current.track({
      typing: true,
      displayName,
    });
    trackingRef.current = true;

    // Auto-stop after timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (channelRef.current && trackingRef.current) {
        channelRef.current.track({
          typing: false,
          displayName,
        });
        trackingRef.current = false;
      }
    }, TYPING_TIMEOUT);
  }, [userId, displayName]);

  // Stop typing explicitly (called on send)
  const stopTyping = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (channelRef.current && trackingRef.current) {
      channelRef.current.track({
        typing: false,
        displayName,
      });
      trackingRef.current = false;
    }
  }, [displayName]);

  return { typingUsers, emitTyping, stopTyping };
}
