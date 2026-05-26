/**
 * sign-in/page.tsx — TISSCA Sign-In Page
 * ========================================
 *
 * PURPOSE:
 *   Authenticated entry point. Users sign in with email + password.
 *   Includes Turnstile CAPTCHA, friendly error handling, and email
 *   verification resend.
 *
 * BUSINESS RULE:
 *   - All sign-in attempts go through /api/auth/signin (server-side
 *     Turnstile verification + rate limiting).
 *   - Unverified users see a resend-verification CTA.
 *
 * WHY:
 *   Branded auth header (TisscaAuthHeader) ensures every auth
 *   touchpoint reinforces the TISSCA identity.
 *
 * DO NOT:
 *   - Bypass Turnstile verification
 *   - Expose API internals in error messages
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseEnv, getOrCreateAppProfile, getSupabaseClient } from '@/lib/supabase';
import { PasswordInput } from '@/components/ui/password-input';
import { Turnstile, useTurnstile } from '@/components/ui/turnstile';
import { TisscaAuthHeader } from '@/components/ui/tissca-auth-header';
import { trackEvent } from '@/utils/analytics';

/** Map raw Supabase/API auth errors to user-friendly messages */
function friendlyAuthError(msg: string): { text: string; isUnverified: boolean } {
  const lower = msg.toLowerCase();
  if (lower.includes('email not confirmed')) {
    return { text: 'Your email address hasn\u2019t been verified yet.', isUnverified: true };
  }
  if (lower.includes('invalid login credentials')) {
    return { text: 'Incorrect email or password. Please try again.', isUnverified: false };
  }
  if (lower.includes('too many requests') || lower.includes('too many attempts') || lower.includes('rate limit')) {
    return { text: 'Too many attempts. Please wait a moment and try again.', isUnverified: false };
  }
  if (lower.includes('security verification') || lower.includes('turnstile')) {
    return { text: 'Security verification failed. Please refresh and try again.', isUnverified: false };
  }
  if (lower.includes('network') || lower.includes('fetch failed')) {
    return { text: 'Unable to connect. Please check your internet connection.', isUnverified: false };
  }
  return { text: 'Unable to sign in. Please check your details and try again.', isUnverified: false };
}

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const turnstile = useTurnstile();
  const router = useRouter();

  useEffect(() => {
    const env = getSupabaseEnv();
    if (!env) {
      setSupabaseConfigured(false);
      setCheckingAuth(false);
      setError(
        'Supabase is not configured. Run "npm run check-env" to verify environment variables.'
      );
      return;
    }
    // Verify session server-side before redirecting.
    // getSession() returns cached (possibly stale) data from localStorage.
    // getUser() makes a round-trip to Supabase to prove the token is valid.
    const client = getSupabaseClient();
    if (!client) {
      setCheckingAuth(false);
      return;
    }
    client.auth.getUser().then(({ data: { user }, error }) => {
      console.log('[SignIn] getUser result:', Boolean(user), 'error:', Boolean(error));
      if (user && !error) {
        // Loop guard: if the server layout already bounced us back here once
        // (because cookies are stale even though client tokens are valid),
        // don't try again — clear the stale session and show the form.
        const REDIRECT_KEY = 'tissca_signin_redirect';
        try {
          if (sessionStorage.getItem(REDIRECT_KEY)) {
            sessionStorage.removeItem(REDIRECT_KEY);
            client.auth.signOut().catch(() => {});
            setCheckingAuth(false);
            return;
          }
          sessionStorage.setItem(REDIRECT_KEY, '1');
        } catch { /* SSR / private browsing */ }
        router.replace('/app/overview');
      } else {
        // Stale/expired session detected — clear it so future checks start clean
        if (error) {
          client.auth.signOut().catch(() => {});
        }
        setCheckingAuth(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Guard against duplicate submissions

    setError('');
    setShowResendVerification(false);
    setResendSuccess(false);
    setIsLoading(true); // Disable button immediately — before any async work

    if (turnstile.enabled && !turnstile.token) {
      setError(
        turnstile.status === 'error'
          ? 'Security check failed to load. Please retry it or refresh the page.'
          : turnstile.status === 'expired'
            ? 'Security check expired. Please complete it again.'
            : turnstile.status === 'loading' || turnstile.status === 'ready'
              ? 'Security check is still loading — please wait a moment.'
              : 'Please complete the security check.'
      );
      setIsLoading(false);
      return;
    }

    try {
      trackEvent('signin_view', '/sign-in', { metadata: { ctaName: 'sign_in_submit', sourcePage: '/sign-in', sourceSection: 'auth_form', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } });

      // --- Server-side sign-in with Turnstile verification ---
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          turnstileToken: turnstile.token,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const mapped = friendlyAuthError(body.error || '');
        setError(mapped.text);
        if (mapped.isUnverified) setShowResendVerification(true);
        if (res.status === 403) turnstile.reset();
        setIsLoading(false);
        return;
      }

      // API route already set session cookies.
      // Sync client-side Supabase so auth context picks it up.
      if (body.accessToken && body.refreshToken && supabase) {
        await supabase.auth.setSession({
          access_token: body.accessToken,
          refresh_token: body.refreshToken,
        });
      }

      // Ensure app profile exists
      if (body.user) {
        try {
          await getOrCreateAppProfile(body.user);
        } catch {
          // Non-critical
        }
      }

      let destination = '/app/overview';
      try {
        const meResponse = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${body.accessToken}`,
          },
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData?.is_platform_staff === true) {
            destination = '/admin';
          }
        }
      } catch {
        // Non-critical — default to /dashboard
      }

      setError('');
      // Clear loop guard — this is a fresh sign-in with valid cookies
      try { sessionStorage.removeItem('tissca_signin_redirect'); } catch { /* SSR */ }
      console.log('[SignIn] login success — navigating to', destination);
      router.replace(destination);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(friendlyAuthError(errorMsg).text);
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!supabase || resendLoading) return;
    setResendLoading(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResendSuccess(true);
    } catch {
      // Non-enumerating: show success regardless
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  // While verifying existing session, hold render with matching background.
  // No visible text — prevents flash before redirect or form display.
  if (checkingAuth) {
    console.log('[SignIn] mount — checking existing session');
    return (
      <div className="min-h-screen bg-gray-50" aria-hidden="true" />
    );
  }

  console.log('[SignIn] mount — rendering form');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <TisscaAuthHeader title="Sign in" subtitle="Welcome back to TISSCA" />

        <form onSubmit={handleSignIn} className="bg-white p-8 rounded shadow-md">
          {error && (
            <div className="mb-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
                {showResendVerification && !resendSuccess && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="mt-2 text-sm text-primary font-medium hover:text-accent disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending\u2026' : 'Resend verification email'}
                  </button>
                )}
                {resendSuccess && (
                  <p className="mt-2 text-emerald-700 text-sm">
                    Verification email sent \u2014 check your inbox.
                  </p>
                )}
                {!supabaseConfigured && (
                  <p className="text-red-600 text-xs mt-2">
                    Run <code className="bg-red-100 px-1 rounded">npm run check-env</code> to
                    verify environment variables are set correctly.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabaseConfigured || isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabaseConfigured || isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <Turnstile
            onVerify={turnstile.onVerify}
            onExpire={turnstile.onExpire}
            onError={turnstile.onError}
            onStatusChange={turnstile.onStatusChange}
            className="mb-4"
          />

          <button
            type="submit"
            disabled={!supabaseConfigured || isLoading}
            className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:text-accent">
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="text-center text-secondary text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-primary font-medium hover:text-accent">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
