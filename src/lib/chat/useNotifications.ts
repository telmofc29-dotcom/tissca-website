// src/lib/chat/useNotifications.ts
//
// TissChat Phase 3+5 — Browser Notification API hook.
// Handles permission flow and exposes a function to show notifications.
// Does NOT use Service Workers (no push). Fires only while tab is open.
// Phase 5: Richer body text with sender name, mute-aware suppression.

'use client';

import { useState, useCallback, useEffect } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Sync initial permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
    } catch {
      // Some browsers throw on permission request
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, onClick?: () => void, senderName?: string) => {
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      ) {
        return;
      }
      // Don't notify if tab is focused
      if (document.hasFocus()) return;

      // Build richer body with sender name if provided
      const displayBody = senderName ? `${senderName}: ${body}` : body;

      try {
        const n = new Notification(title, {
          body: displayBody,
          icon: '/favicon.ico',
          tag: 'tisschat', // Collapse repeated notifications
        });
        if (onClick) {
          n.onclick = () => {
            window.focus();
            onClick();
            n.close();
          };
        }
        // Auto-close after 5s
        setTimeout(() => n.close(), 5000);
      } catch {
        // Notification constructor can throw in some environments
      }
    },
    [],
  );

  return {
    permission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    requestPermission,
    showNotification,
  };
}
