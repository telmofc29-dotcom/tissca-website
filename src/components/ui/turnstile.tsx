// src/components/ui/turnstile.tsx
//
// Cloudflare Turnstile widget — resilient managed mode.
// - Module-level singleton promise for script loading (avoids React
//   lifecycle race conditions with StrictMode double-mount).
// - Drops the onload=callback URL parameter; uses script.onload + polling.
// - Shows Cloudflare error code in UI so hostname/config issues are diagnosable.
// - SITE_KEY read once as a module constant (inlined at build time by Next.js).

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: Record<string, unknown>,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

/** Turnstile lifecycle states visible to forms */
export type TurnstileStatus = 'loading' | 'ready' | 'verified' | 'error' | 'expired';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  onStatusChange?: (status: TurnstileStatus) => void;
  className?: string;
}

// --- constants ---------------------------------------------------------------
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const POLL_INTERVAL = 200;   // ms
const POLL_TIMEOUT = 20_000; // ms

// Inline the key at build time — Next.js replaces this with the literal value.
const SITE_KEY: string | undefined = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// --- script loader (singleton promise) ---------------------------------------
// Module-level promise: React can call loadScript() any number of times
// (StrictMode double-mount, SPA navigations) and only one <script> tag is
// injected, resolving to the same promise.

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Already available (SPA nav after previous page loaded it)
    if (typeof window !== 'undefined' && window.turnstile) {
      resolve();
      return;
    }

    // Reuse existing tag (e.g. React strict-mode re-mount)
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      pollForApi(resolve, reject);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;

    script.onload = () => pollForApi(resolve, reject);
    script.onerror = () => {
      scriptPromise = null; // allow future retry
      reject(new Error('Turnstile script network error'));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Poll for window.turnstile after script tag fires onload. */
function pollForApi(resolve: () => void, reject: (e: Error) => void) {
  if (window.turnstile) { resolve(); return; }

  let elapsed = 0;
  const iv = setInterval(() => {
    elapsed += POLL_INTERVAL;
    if (window.turnstile) {
      clearInterval(iv);
      resolve();
    } else if (elapsed >= POLL_TIMEOUT) {
      clearInterval(iv);
      scriptPromise = null;
      reject(new Error('Turnstile API not available after ' + (POLL_TIMEOUT / 1000) + 's'));
    }
  }, POLL_INTERVAL);
}

// --- <Turnstile /> component -------------------------------------------------
export function Turnstile({ onVerify, onExpire, onError, onStatusChange, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const retries = useRef(0);
  const alive = useRef(true); // is this instance still mounted?

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorDetail, setErrorDetail] = useState('');

  // Stable callback refs — never trigger re-renders
  const vRef = useRef(onVerify);  vRef.current = onVerify;
  const eRef = useRef(onExpire);  eRef.current = onExpire;
  const rRef = useRef(onError);   rRef.current = onError;
  const sRef = useRef(onStatusChange); sRef.current = onStatusChange;
  const notify = useCallback((s: TurnstileStatus) => sRef.current?.(s), []);

  // -- safely remove the current widget --
  const removeWidget = useCallback(() => {
    if (widgetId.current && window.turnstile) {
      try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
    }
    widgetId.current = null;
  }, []);

  // -- render widget into the container --
  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || !SITE_KEY) return;
    removeWidget();
    retries.current = 0;

    try {
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,

        callback: (token: string) => {
          vRef.current(token);
          if (alive.current) { setPhase('ready'); setErrorDetail(''); }
          notify('verified');
        },

        'expired-callback': () => {
          eRef.current?.();
          notify('expired');
        },

        'error-callback': (code?: string) => {
          console.error('[Turnstile] error-callback, code:', code ?? 'none');

          // One auto-retry before surfacing the error
          if (retries.current < 1 && widgetId.current && window.turnstile) {
            retries.current++;
            try { window.turnstile.reset(widgetId.current); return; } catch { /* fall through */ }
          }

          rRef.current?.();
          if (alive.current) {
            setPhase('error');
            setErrorDetail(code ? 'code ' + code : 'widget-error');
          }
          notify('error');
        },

        'timeout-callback': () => {
          console.error('[Turnstile] timeout-callback');
          if (retries.current < 1 && widgetId.current && window.turnstile) {
            retries.current++;
            try { window.turnstile.reset(widgetId.current); return; } catch { /* fall through */ }
          }
          rRef.current?.();
          if (alive.current) { setPhase('error'); setErrorDetail('challenge-timeout'); }
          notify('error');
        },

        appearance: 'always',
        theme: 'light',
      });

      // render() succeeded synchronously
      if (alive.current) { setPhase('ready'); setErrorDetail(''); }
      notify('ready');
    } catch (err) {
      console.error('[Turnstile] render() threw:', err);
      if (alive.current) {
        setPhase('error');
        setErrorDetail(err instanceof Error ? err.message : 'render-exception');
      }
      notify('error');
    }
  }, [notify, removeWidget]);

  // -- main lifecycle: load script then render --
  useEffect(() => {
    if (!SITE_KEY) return;
    alive.current = true;

    loadScript()
      .then(() => { if (alive.current) renderWidget(); })
      .catch((err) => {
        console.error('[Turnstile] Script load failed:', err?.message);
        if (alive.current) {
          setPhase('error');
          setErrorDetail('script: ' + (err?.message ?? 'unknown'));
          notify('error');
        }
      });

    return () => {
      alive.current = false;
      removeWidget();
    };
  }, [renderWidget, removeWidget, notify]);

  // No key configured -> graceful no-op
  if (!SITE_KEY) return null;

  // Full retry: wipe script + API, start fresh
  const handleRetry = () => {
    setPhase('loading');
    setErrorDetail('');
    notify('loading');
    retries.current = 0;

    removeWidget();
    const tag = document.getElementById(SCRIPT_ID);
    if (tag) tag.remove();
    delete window.turnstile;
    delete window.onTurnstileLoad;
    scriptPromise = null;

    loadScript()
      .then(() => renderWidget())
      .catch((err) => {
        console.error('[Turnstile] retry failed:', err?.message);
        setPhase('error');
        setErrorDetail('retry: ' + (err?.message ?? 'unknown'));
        notify('error');
      });
  };

  return (
    <div className={className}>
      <div ref={containerRef} />

      {phase === 'loading' && (
        <p className="text-xs text-gray-400 mt-1">Loading security check&hellip;</p>
      )}

      {phase === 'error' && (
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 text-xs">
            Security check couldn&apos;t load.{' '}
            <button type="button" onClick={handleRetry}
              className="font-medium underline hover:text-amber-900">
              Retry
            </button>
            {' \u00b7 '}
            <span className="text-amber-600">
              Try disabling ad blockers if this persists.
            </span>
          </p>
          {errorDetail && (
            <p className="text-amber-500 text-[10px] mt-1 font-mono">
              ({errorDetail})
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- useTurnstile hook -------------------------------------------------------
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>(SITE_KEY ? 'loading' : 'ready');

  const onVerify  = useCallback((t: string) => { setToken(t); setStatus('verified'); }, []);
  const onExpire  = useCallback(() => { setToken(null); setStatus('expired'); }, []);
  const onError   = useCallback(() => { setToken(null); setStatus('error'); }, []);
  const reset     = useCallback(() => { setToken(null); setStatus('loading'); }, []);

  const onStatusChange = useCallback((s: TurnstileStatus) => {
    setStatus(s);
    if (s === 'error' || s === 'expired') setToken(null);
  }, []);

  return {
    token,
    enabled: !!SITE_KEY,
    status,
    onVerify,
    onExpire,
    onError,
    onStatusChange,
    reset,
  };
}
