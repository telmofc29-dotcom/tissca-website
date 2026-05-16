#!/usr/bin/env python3
"""Write the verified page file safely."""
import pathlib

PAGE = r'''/**
 * auth/verified/page.tsx v2.0.0 (Premium Verification Landing Page + Server-Side Callback Flow)
 * ==============================================================================================
 * PURPOSE:
 *   Public landing page for Supabase email verification results.
 *   Shows branded success/error/loading states after /auth/callback
 *   has completed server-side token exchange.
 *
 * BUSINESS RULE:
 *   - PRIMARY flow: /auth/callback (GET route handler) exchanges the PKCE code
 *     or token_hash server-side, sets session cookies, then redirects here with
 *     ?verified=1&type=<type> (success) or ?error=<message> (failure).
 *     This page reads those query params and renders the result. No client-side
 *     Supabase calls are needed in the primary flow.
 *   - FALLBACK flow: if someone lands directly with ?code=, ?token_hash=, or
 *     #access_token=, the client-side logic still attempts verification
 *     (best-effort \u2014 no HTTP-only cookies will be set).
 *   - Shows deep link button for the TISSCA mobile app.
 *   - NEVER shows success unless Supabase verification actually completed.
 *
 * WHY:
 *   The old flow tried to verify client-side with a bare createClient(),
 *   which failed to set "Confirmed at" in Supabase because PKCE code exchange
 *   needs a code_verifier the browser didn't have, and verifyOtp() only stored
 *   the session in memory (no cookies). This page now trusts the server-side
 *   callback result passed via query params.
 *
 * DO NOT:
 *   - Show success UI without ?verified=1 or a confirmed Supabase response.
 *   - Remove the client-side fallback \u2014 it handles edge cases / old email links.
 *   - Change the expected query params (?verified, ?error, ?type) without
 *     updating the callback route.
 *   - Point emailRedirectTo back to this page \u2014 it must go to /auth/callback.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ===== Types ===== */

type UiState =
  | { status: 'working' }
  | { status: 'success'; title: string; message: string }
  | { status: 'error'; error: string; isExpired: boolean; debugHref?: string };

/* ===== Helpers ===== */

function normaliseType(
  input: string | null,
): 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite' {
  const t = (input || 'signup').toLowerCase().trim();

  if (t === 'reset' || t === 'recovery') return 'recovery';
  if (t === 'magic' || t === 'magiclink') return 'magiclink';
  if (t === 'change_email' || t === 'email_change' || t === 'emailchange') return 'email_change';
  if (t === 'invite') return 'invite';
  if (t === 'signup') return 'signup';

  return 'signup';
}

function successCopy(type: string | null): { title: string; message: string } {
  const t = normaliseType(type);

  if (t === 'email_change')
    return {
      title: 'Email confirmed',
      message:
        'Your email address has been updated. You can now return to the app and sign in using your new email.',
    };
  if (t === 'magiclink')
    return {
      title: 'Signed in',
      message: 'You\u2019re signed in securely. You can now return to the app.',
    };
  if (t === 'invite')
    return {
      title: 'Invitation accepted',
      message: 'Thanks \u2014 your invitation has been accepted. You can now open the app.',
    };
  if (t === 'recovery')
    return {
      title: 'Password reset confirmed',
      message:
        'We\u2019ve confirmed your reset request. You can now continue to set a new password in the app, or continue on the web.',
    };

  return {
    title: 'Email verified',
    message:
      'Thank you \u2014 your email has been verified. You can now return to the app and sign in.',
  };
}

function parseParams(href: string) {
  const url = new URL(href);
  const q = url.searchParams;

  const hash = (url.hash || '').replace(/^#/, '');
  const h = new URLSearchParams(hash);

  return {
    code: q.get('code'),
    type: q.get('type'),
    token_hash: q.get('token_hash') || q.get('token'),
    access_token: h.get('access_token'),
    refresh_token: h.get('refresh_token'),
  };
}

function isExpiredError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('expired') ||
    lower.includes('otp') ||
    lower.includes('invalid') ||
    lower.includes('token')
  );
}

/* ===== SVG Components ===== */

function ShieldIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z"
        fill="rgba(45,65,82,.8)"
        stroke="rgba(203,178,107,.6)"
        strokeWidth="1.5"
      />
      <path
        d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z"
        fill="url(#shieldGrad)"
        opacity="0.4"
      />
      <defs>
        <radialGradient id="shieldGrad" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="rgba(203,178,107,.5)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 1.2s linear infinite' }}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
      <path
        d="M24 4a20 20 0 0 1 20 20"
        stroke="rgba(203,178,107,.8)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="27" fill="rgba(16,185,129,.14)" stroke="rgba(16,185,129,.5)" strokeWidth="1.5" />
      <path
        d="M17 28.5l7.5 7.5L39.5 20"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="27" fill="rgba(239,68,68,.10)" stroke="rgba(255,180,180,.5)" strokeWidth="1.5" />
      <path d="M28 18v14" stroke="#ffb4b4" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="38" r="2" fill="#ffb4b4" />
    </svg>
  );
}

/* ===== Main Component ===== */

export default function VerifiedPage() {
  const deepLink = 'tissca://auth/callback';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnon) return null;
    return createClient(supabaseUrl, supabaseAnon);
  }, [supabaseUrl, supabaseAnon]);

  const [ui, setUi] = useState<UiState>({ status: 'working' });
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const run = async () => {
      const href = window.location.href;
      const url = new URL(href);

      // Fast path: arriving from server-side /auth/callback redirect
      const verifiedParam = url.searchParams.get('verified');
      const errorParam = url.searchParams.get('error');
      const typeParam = url.searchParams.get('type');

      if (verifiedParam === '1') {
        const copy = successCopy(typeParam);
        setUi({ status: 'success', title: copy.title, message: copy.message });
        return;
      }

      if (errorParam) {
        setUi({
          status: 'error',
          error: errorParam,
          isExpired: isExpiredError(errorParam),
          debugHref: href,
        });
        return;
      }

      // Fallback: client-side verification for direct/old links
      if (!supabase) {
        setUi({
          status: 'error',
          error: 'Supabase client is not configured.',
          isExpired: false,
          debugHref: href,
        });
        return;
      }

      try {
        const p = parseParams(href);

        if (p.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(p.code);
          if (error) throw error;
        } else if (p.token_hash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: p.token_hash,
            type: normaliseType(p.type),
          });
          if (error) throw error;
        } else if (p.access_token && p.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: p.access_token,
            refresh_token: p.refresh_token,
          });
          if (error) throw error;
        } else {
          throw new Error(
            'Missing verification parameters in the link. Please request a new email.',
          );
        }

        const copy = successCopy(p.type);
        setUi({ status: 'success', title: copy.title, message: copy.message });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error.';
        setUi({
          status: 'error',
          error: msg,
          isExpired: isExpiredError(msg),
          debugHref: window.location.href,
        });
      }
    };

    run();
  }, [supabase]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        :root {
          --blue: #2d4152;
          --gold1: #CBB26B;
          --bg: #0b141b;
          --bg2: #0e1a23;
          --card: rgba(16,28,38,.78);
          --text: rgba(255,255,255,.92);
          --muted: rgba(255,255,255,.70);
          --border: rgba(255,255,255,.12);
          --danger: #ffb4b4;
        }

        .tisscaBody {
          min-height: 100vh;
          margin: 0;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
          background:
            radial-gradient(1200px 900px at 50% 20%, rgba(45,65,82,.22), transparent 60%),
            radial-gradient(900px 700px at 20% 80%, rgba(203,178,107,.10), transparent 62%),
            linear-gradient(180deg, var(--bg), var(--bg2));
          color: var(--text);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          position: relative;
        }

        .ambient {
          position: fixed; inset: -20%; z-index: 0;
          background:
            radial-gradient(950px 720px at 30% 22%, rgba(45,65,82,.34), transparent 62%),
            radial-gradient(900px 700px at 75% 70%, rgba(203,178,107,.14), transparent 62%),
            radial-gradient(1200px 900px at 55% 48%, rgba(255,255,255,.05), transparent 70%);
          filter: blur(18px);
          animation: ambientFloat 16s ease-in-out infinite;
          opacity: .9;
          pointer-events: none;
        }
        @keyframes ambientFloat {
          0%   { transform: translate3d(-2%,-1%,0) scale(1) }
          50%  { transform: translate3d(2%,1%,0) scale(1.03) }
          100% { transform: translate3d(-2%,-1%,0) scale(1) }
        }

        .noise {
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          opacity: .055; mix-blend-mode: overlay;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 2px, transparent 4px),
            repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0px, rgba(0,0,0,.05) 1px, transparent 2px, transparent 5px);
          animation: noiseShift 7s steps(6) infinite;
        }
        @keyframes noiseShift {
          0%   { transform: translate3d(0,0,0) }
          20%  { transform: translate3d(-2%,1%,0) }
          40%  { transform: translate3d(1%,-2%,0) }
          60%  { transform: translate3d(2%,2%,0) }
          80%  { transform: translate3d(-1%,-1%,0) }
          100% { transform: translate3d(0,0,0) }
        }

        .wrap { padding: 22px; position: relative; z-index: 2; }
        .card {
          max-width: 560px;
          margin: 8vh auto;
          background: linear-gradient(180deg, var(--card), rgba(16,28,38,.62));
          border-radius: 22px;
          padding: 32px 28px;
          border: 1px solid rgba(255,255,255,.08);
          box-shadow:
            0 28px 90px rgba(0,0,0,.58),
            0 0 0 1px rgba(45,65,82,.14),
            inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(12px);
          text-align: center;
        }

        .brandHeader { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
        .wordmark {
          font-size: 22px; font-weight: 800; letter-spacing: 3px;
          background: linear-gradient(135deg, #CBB26B 0%, #e8dbb0 50%, #CBB26B 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stateIcon { margin: 18px 0 12px; }

        .title { margin: 0 0 8px; font-size: 26px; letter-spacing: -0.2px; font-weight: 700; }
        .msg { margin: 6px 0 0; line-height: 1.6; color: var(--muted); font-size: 15px; }

        .row { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
        a.btn {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 13px 20px; border-radius: 999px;
          text-decoration: none; font-weight: 800; letter-spacing: .2px;
          min-width: 200px;
          border: 1px solid rgba(255,255,255,.12);
          overflow: hidden;
          transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, border-color .22s ease;
          font-size: 15px;
        }
        a.primary {
          color: rgba(255,255,255,.92);
          background:
            radial-gradient(900px 200px at 20% 0%, rgba(203,178,107,.18), transparent 55%),
            linear-gradient(145deg, rgba(45,65,82,.92), rgba(20,36,48,.86));
          box-shadow:
            0 14px 44px rgba(0,0,0,.46),
            0 0 0 1px rgba(45,65,82,.18),
            0 0 28px rgba(45,65,82,.16),
            inset 0 1px 0 rgba(255,255,255,.10);
        }
        a.secondary {
          color: rgba(255,255,255,.90);
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          box-shadow: 0 12px 36px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.06);
        }
        a.btn::after {
          content: "";
          position: absolute; top: -40%; left: -60%;
          width: 60%; height: 180%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.16) 26%, rgba(203,178,107,.14) 36%, rgba(255,255,255,.06) 46%, transparent 70%);
          transform: rotate(16deg);
          opacity: .28;
          animation: sheen 6.6s ease-in-out infinite;
          pointer-events: none;
          mix-blend-mode: soft-light;
        }
        @keyframes sheen {
          0%   { left: -60%; opacity: .10 }
          30%  { opacity: .28 }
          55%  { opacity: .14 }
          100% { left: 120%; opacity: .10 }
        }
        a.btn:hover {
          transform: translateY(-2px);
          border-color: rgba(203,178,107,.22);
          box-shadow: 0 18px 58px rgba(0,0,0,.55), 0 0 0 1px rgba(203,178,107,.12), inset 0 1px 0 rgba(255,255,255,.10);
        }
        a.btn:active { transform: translateY(0); }

        .errBox {
          margin-top: 16px;
          padding: 14px 16px;
          background: rgba(239,68,68,.06);
          border: 1px solid rgba(255,180,180,.18);
          border-radius: 12px;
          text-align: left;
        }
        .errMsg { color: var(--danger); font-size: 14px; line-height: 1.5; margin: 0; }
        .errHint { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 8px 0 0; }
        .debugToggle {
          background: none; border: none; color: rgba(255,255,255,.40);
          font-size: 12px; cursor: pointer; padding: 6px 0 0; text-decoration: underline;
        }
        .debugUrl {
          margin-top: 6px; font-size: 11px; color: rgba(255,255,255,.35);
          word-break: break-all; font-family: monospace;
        }

        .footer {
          margin-top: 22px; padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.06);
          font-size: 12px; color: rgba(255,255,255,.40);
        }
      `}</style>

      <main className="tisscaBody">
        <div className="ambient" />
        <div className="noise" />

        <div className="wrap">
          <div className="card">
            <div className="brandHeader">
              <ShieldIcon />
              <span className="wordmark">TISSCA</span>
            </div>

            <div className="stateIcon">
              {ui.status === 'working' && <SpinnerIcon />}
              {ui.status === 'success' && <CheckIcon />}
              {ui.status === 'error' && <AlertIcon />}
            </div>

            <h1 className="title">
              {ui.status === 'working' && 'Verifying\u2026'}
              {ui.status === 'success' && ui.title}
              {ui.status === 'error' && 'Verification failed'}
            </h1>

            <p className="msg">
              {ui.status === 'working' && 'Please wait while we confirm your request.'}
              {ui.status === 'success' && ui.message}
              {ui.status === 'error' &&
                'We couldn\u2019t complete this verification. See details below.'}
            </p>

            {ui.status === 'success' && (
              <div className="row">
                <a className="btn primary" href={deepLink}>
                  Open TISSCA App
                </a>
                <a className="btn secondary" href="/sign-in">
                  Sign in on web
                </a>
              </div>
            )}

            {ui.status === 'error' && (
              <>
                <div className="errBox">
                  <p className="errMsg">{ui.error}</p>

                  {ui.isExpired && (
                    <p className="errHint">
                      This usually means the link has expired or was already used.
                      Please sign up again or request a new verification email from
                      the sign-in page.
                    </p>
                  )}

                  {ui.debugHref && (
                    <>
                      <button
                        className="debugToggle"
                        onClick={() => setShowDebug((v) => !v)}
                        type="button"
                      >
                        {showDebug ? 'Hide' : 'Show'} link details
                      </button>
                      {showDebug && <div className="debugUrl">{ui.debugHref}</div>}
                    </>
                  )}
                </div>

                <div className="row">
                  <a className="btn secondary" href="/sign-up">
                    Try signing up again
                  </a>
                  <a className="btn secondary" href="/sign-in">
                    Go to sign in
                  </a>
                </div>
              </>
            )}

            <div className="footer">TISSCA &mdash; secure verification</div>
          </div>
        </div>
      </main>
    </>
  );
}
'''

target = pathlib.Path('/Users/inekshacarvalho/Documents/Projects/TISSCA-website/src/app/(public)/auth/verified/page.tsx')
target.write_text(PAGE.lstrip('\n'))
print(f'Written {len(PAGE.lstrip(chr(10)).splitlines())} lines, {len(PAGE.lstrip(chr(10)))} bytes')
