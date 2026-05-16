/**
 * sign-up/page.tsx — TISSCA Account Creation Page
 * =================================================
 *
 * PURPOSE:
 *   New user registration with email + password + Turnstile.
 *   On success, shows a branded "check your email" verification prompt.
 *
 * BUSINESS RULE:
 *   - Sign-up goes through /api/auth/signup (server-side Turnstile +
 *     rate limiting). Non-enumerating: duplicate emails return success.
 *   - emailRedirectTo points to /auth/callback which exchanges the verify
 *     token server-side, sets session cookies, then redirects to /auth/verified.
 *
 * WHY:
 *   Branded auth header (TisscaAuthHeader) ensures every auth
 *   touchpoint reinforces the TISSCA identity.
 *
 * DO NOT:
 *   - Reveal whether an email is already registered
 *   - Change the emailRedirectTo URL without updating Supabase config
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseEnv, getSupabaseClient } from '@/lib/supabase';
import { PasswordInput } from '@/components/ui/password-input';
import { Turnstile, useTurnstile } from '@/components/ui/turnstile';
import { TisscaAuthHeader } from '@/components/ui/tissca-auth-header';
import { trackEvent } from '@/utils/analytics';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [success, setSuccess] = useState(false);
  const turnstile = useTurnstile();
  const router = useRouter();

  useEffect(() => {
    const env = getSupabaseEnv();
    if (!env) {
      setSupabaseConfigured(false);
      setError('Supabase is not configured. Check your environment variables.');
      return;
    }
    // If already signed in, redirect to dashboard
    getSupabaseClient()?.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabaseConfigured) {
      setError('Supabase is not configured. Cannot sign up.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

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
      return;
    }

    setIsLoading(true);

    try {
      trackEvent('cta_click', '/sign-up', { eventLabel: 'register_submit', metadata: { ctaName: 'register_submit', sourcePage: '/sign-up', sourceSection: 'auth_form', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } });

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          turnstileToken: turnstile.token,
        }),
      });

      const body = await res.json();

      if (res.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (res.status === 403) {
        setError('Security verification failed. Please refresh and try again.');
        turnstile.reset();
      } else if (!res.ok) {
        const msg = (body.error || '').toLowerCase();
        if (msg.includes('valid email') || msg.includes('invalid')) {
          setError('Please enter a valid email address.');
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        // success — could be new user or already-registered (non-enumerating)
        setSuccess(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <TisscaAuthHeader title="Create account" subtitle="Join TISSCA today" />

        <div className="bg-white p-8 rounded shadow-md">
          {success ? (
            <div className="text-center space-y-5">
              {/* Email icon */}
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <polyline points="22,4 12,13 2,4" />
                  </svg>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-primary text-lg mb-2">Check your email</h3>
                <p className="text-secondary text-sm leading-relaxed">
                  We&apos;ve sent a verification link to <strong className="text-primary">{email}</strong>.
                  Open the link to activate your TISSCA account.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-secondary leading-relaxed">
                  Don&apos;t see it? Check your spam folder. The email comes from
                  <span className="font-medium text-primary"> noreply@tissca.com</span>.
                </p>
              </div>
              <p className="text-secondary text-sm">
                Once verified, you can{' '}
                <Link href="/sign-in" className="text-primary font-medium hover:text-accent">
                  sign in here
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignUp}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <p>{error}</p>
                  {!supabaseConfigured && (
                    <p className="text-xs mt-2 text-red-600">
                      Run <code className="bg-red-100 px-1 rounded">npm run check-env</code> to verify setup
                    </p>
                  )}
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
                  disabled={isLoading || !supabaseConfigured}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                  placeholder="you@example.com"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || !supabaseConfigured}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                  placeholder="••••••••"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary mb-2">
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || !supabaseConfigured}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
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
                disabled={isLoading || !supabaseConfigured}
                className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating account\u2026' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-secondary text-sm mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary font-medium hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
