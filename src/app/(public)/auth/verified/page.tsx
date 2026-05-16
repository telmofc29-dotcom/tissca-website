/**
 * auth/verified/page.tsx v1.2.0 (Premium Verification Landing Page + Server-Side Callback Flow)
 * ==============================================================================================
 * ✅ NOTES (LOCKED):
 * - This is a public landing page for Supabase email verification results.
 * - PRIMARY flow: /auth/callback (server-side GET route) exchanges the PKCE code/token_hash,
 *   sets session cookies, then redirects here with ?verified=1&type=<type>.
 *   This page just reads those query params and shows the appropriate success/error UI.
 * - FALLBACK flow: if someone lands directly here with ?code=, ?token_hash=, or #access_token=,
 *   the client-side logic still attempts verification (best-effort, no cookie-setting).
 * - Shows deep link button back to the app: tissca://auth/callback
 * - Keep it simple, fast, and readable on mobile.
 *
 * SUPABASE (REQUIRED):
 * - Add https://www.tissca.com/auth/callback to Supabase Auth Redirect URLs.
 * - emailRedirectTo in signup/recovery must point to /auth/callback (NOT /auth/verified).
 *
 * ENV (REQUIRED):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type UiState =
  | { status: 'working' }
  | { status: 'success'; title: string; message: string }
  | { status: 'error'; error: string; debugHref?: string };

function normaliseType(input: string | null): 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite' {
  const t = (input || 'signup').toLowerCase().trim();

  if (t === 'reset') return 'recovery';
  if (t === 'recovery') return 'recovery';

  if (t === 'magic') return 'magiclink';
  if (t === 'magiclink') return 'magiclink';

  if (t === 'change_email') return 'email_change';
  if (t === 'email_change') return 'email_change';
  if (t === 'emailchange') return 'email_change';

  if (t === 'invite') return 'invite';
  if (t === 'signup') return 'signup';

  return 'signup';
}

function successCopy(type: string | null): { title: string; message: string } {
  const t = normaliseType(type);

  if (t === 'email_change') {
    return {
      title: 'Email confirmed',
      message:
        'Your email address has been updated. You can now return to the app and sign in using your new email.',
    };
  }

  if (t === 'magiclink') {
    return {
      title: 'Signed in',
      message: 'You’re signed in securely. You can now return to the app.',
    };
  }

  if (t === 'invite') {
    return {
      title: 'Invitation accepted',
      message: 'Thanks — your invitation has been accepted. You can now open the app.',
    };
  }

  if (t === 'recovery') {
    return {
      title: 'Password reset requested',
      message:
        'We’ve confirmed your reset request. You can now continue to set a new password in the app, or continue on the web.',
    };
  }

  return {
    title: 'Email verified',
    message: 'Thank you — your email has been verified. You can now return to the app and sign in.',
  };
}

function parseParams(href: string) {
  const url = new URL(href);
  const q = url.searchParams;

  const hash = (url.hash || '').replace(/^#/, '');
  const h = new URLSearchParams(hash);

  const tokenFromQuery = q.get('token');
  const tokenHashFromQuery = q.get('token_hash');

  return {
    code: q.get('code'),
    type: q.get('type'),

    token_hash: tokenHashFromQuery || tokenFromQuery,

    access_token: h.get('access_token'),
    refresh_token: h.get('refresh_token'),
  };
}

export default function VerifiedPage() {
  const deepLink = 'tissca://auth/callback';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Create client only when env is present.
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnon) return null;
    return createClient(supabaseUrl, supabaseAnon);
  }, [supabaseUrl, supabaseAnon]);

  const [ui, setUi] = useState<UiState>({ status: 'working' });

  useEffect(() => {
    const run = async () => {
      const href = window.location.href;
      const url = new URL(href);

      // ─── Fast path: arriving from the server-side /auth/callback redirect ───
      // The callback route already exchanged the code/token server-side and set
      // session cookies. We only need to read the result from query params.
      const verifiedParam = url.searchParams.get('verified');
      const errorParam = url.searchParams.get('error');
      const typeParam = url.searchParams.get('type');

      if (verifiedParam === '1') {
        const copy = successCopy(typeParam);
        setUi({ status: 'success', title: copy.title, message: copy.message });
        return;
      }

      if (errorParam) {
        setUi({ status: 'error', error: errorParam, debugHref: href });
        return;
      }

      // ─── Fallback: client-side verification for direct links / hash fragments ───
      // Handles edge cases where someone lands here with ?code=, ?token_hash=,
      // or #access_token= instead of going through /auth/callback first.
      if (!supabase) {
        setUi({
          status: 'error',
          error:
            'Supabase client is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          debugHref: href,
        });
        return;
      }

      try {
        const p = parseParams(href);

        // Establish session from link (supports the 3 common Supabase patterns)
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
          throw new Error('Missing verification parameters in the link. Please request a new email.');
        }

        const copy = successCopy(p.type);
        setUi({ status: 'success', title: copy.title, message: copy.message });
      } catch (e: any) {
        setUi({
          status: 'error',
          error: e?.message || 'Unknown error.',
          debugHref: window.location.href,
        });
      }
    };

    run();
  }, [supabase]);

  const showActions = ui.status === 'success';

  return (
    <>
      <style>{`
        :root{
          --blue:#2d4152;
          --gold1:#CBB26B;
          --bg:#0b141b;
          --bg2:#0e1a23;
          --card:rgba(16,28,38,.78);
          --text:rgba(255,255,255,.92);
          --muted:rgba(255,255,255,.70);
          --border:rgba(255,255,255,.12);
          --danger:#ffb4b4;
        }

        .tisscaBody{
          min-height:100vh;
          margin:0;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
          background: radial-gradient(1200px 900px at 50% 20%, rgba(45,65,82,.22), transparent 60%),
                      radial-gradient(900px 700px at 20% 80%, rgba(203,178,107,.10), transparent 62%),
                      linear-gradient(180deg, var(--bg), var(--bg2));
          color:var(--text);
          -webkit-font-smoothing:antialiased;
          overflow-x:hidden;
          position:relative;
        }

        .ambient{
          position:fixed; inset:-20%; z-index:0;
          background:
            radial-gradient(950px 720px at 30% 22%, rgba(45,65,82,.34), transparent 62%),
            radial-gradient(900px 700px at 75% 70%, rgba(203,178,107,.14), transparent 62%),
            radial-gradient(1200px 900px at 55% 48%, rgba(255,255,255,.05), transparent 70%);
          filter: blur(18px);
          animation: ambientFloat 16s ease-in-out infinite;
          opacity:.9;
          pointer-events:none;
        }
        @keyframes ambientFloat{
          0%{transform:translate3d(-2%,-1%,0) scale(1)}
          50%{transform:translate3d(2%,1%,0) scale(1.03)}
          100%{transform:translate3d(-2%,-1%,0) scale(1)}
        }

        .noise{
          position:fixed; inset:0; z-index:1; pointer-events:none;
          opacity:.055; mix-blend-mode:overlay;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 2px, transparent 4px),
            repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0px, rgba(0,0,0,.05) 1px, transparent 2px, transparent 5px);
          animation: noiseShift 7s steps(6) infinite;
        }
        @keyframes noiseShift{
          0%{transform:translate3d(0,0,0)}
          20%{transform:translate3d(-2%,1%,0)}
          40%{transform:translate3d(1%,-2%,0)}
          60%{transform:translate3d(2%,2%,0)}
          80%{transform:translate3d(-1%,-1%,0)}
          100%{transform:translate3d(0,0,0)}
        }

        .wrap{padding:22px; position:relative; z-index:2;}
        .card{
          max-width:560px;
          margin:10vh auto;
          background: linear-gradient(180deg, var(--card), rgba(16,28,38,.62));
          border-radius:22px;
          padding:28px;
          border:1px solid rgba(255,255,255,.08);
          box-shadow:
            0 28px 90px rgba(0,0,0,.58),
            0 0 0 1px rgba(45,65,82,.14),
            inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(12px);
        }

        .title{margin:0 0 10px;font-size:28px;letter-spacing:-0.2px;}
        .msg{margin:10px 0;line-height:1.55;color:var(--muted);}

        .row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}

        a.btn{
          position:relative;
          display:inline-flex;align-items:center;justify-content:center;
          padding:12px 16px;border-radius:999px;
          text-decoration:none;font-weight:800;letter-spacing:.2px;
          min-width:220px;
          border:1px solid rgba(255,255,255,.12);
          overflow:hidden;
          transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, border-color .22s ease;
        }

        a.primary{
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

        a.secondary{
          color: rgba(255,255,255,.90);
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          box-shadow: 0 12px 36px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.06);
        }

        a.btn::after{
          content:"";
          position:absolute;top:-40%;left:-60%;
          width:60%;height:180%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.16) 26%, rgba(203,178,107,.14) 36%, rgba(255,255,255,.06) 46%, transparent 70%);
          transform: rotate(16deg);
          opacity:.28;
          animation: sheen 6.6s ease-in-out infinite;
          pointer-events:none;
          mix-blend-mode: soft-light;
        }
        @keyframes sheen{
          0%{left:-60%;opacity:.10}
          30%{opacity:.28}
          55%{opacity:.14}
          100%{left:120%;opacity:.10}
        }

        a.btn:hover{
          transform: translateY(-2px);
          border-color: rgba(203,178,107,.22);
          box-shadow: 0 18px 58px rgba(0,0,0,.55), 0 0 0 1px rgba(203,178,107,.12), inset 0 1px 0 rgba(255,255,255,.10);
        }
        a.btn:active{transform: translateY(0);}

        .err{margin-top:12px;color:var(--danger);font-size:13px;line-height:1.45;}
        .debug{margin-top:12px;font-size:12px;color:rgba(255,255,255,.50);word-break:break-all;}
        .footer{margin-top:14px;font-size:12px;color:rgba(255,255,255,.50);}
      `}</style>

      <main className="tisscaBody">
        <div className="ambient" />
        <div className="noise" />

        <div className="wrap">
          <div className="card">
            <h1 className="title">
              {ui.status === 'working' ? 'Working…' : ui.status === 'success' ? ui.title : 'Something went wrong'}
            </h1>

            <p className="msg">
              {ui.status === 'working'
                ? 'Please wait while we confirm your request.'
                : ui.status === 'success'
                  ? ui.message
                  : 'We couldn’t complete this request.'}
            </p>

            {showActions && (
              <div className="row">
                <a className="btn primary" href={deepLink}>
                  Open the app
                </a>
                <a className="btn secondary" href="https://www.tissca.com">
                  Continue on web
                </a>
              </div>
            )}

            {ui.status === 'error' && (
              <>
                <div className="err">{ui.error}</div>
                {ui.debugHref && <div className="debug">{ui.debugHref}</div>}
              </>
            )}

            <div className="footer">TISSCA — secure verification</div>
          </div>
        </div>
      </main>
    </>
  );
}