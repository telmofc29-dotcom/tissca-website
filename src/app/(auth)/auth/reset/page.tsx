// src/app/auth/reset/page.tsx
//
// PURPOSE:
// - Password reset landing page.
// - User arrives here after clicking the reset link in their email.
// - Supabase recovery flow: email link → Supabase auth server verifies token →
//   redirects here with ?code=... (PKCE) or #access_token=... (implicit).
// - This page exchanges the code/token for a session, then lets the user
//   enter a new password and calls supabase.auth.updateUser({ password }).
//
// FLOW:
// 1. Parse code/token from URL
// 2. Exchange for session
// 3. Show password form
// 4. Update password
// 5. Show success + link to sign-in
//
// STYLING: Matches existing (auth) pages (sign-in, forgot-password).

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PasswordInput } from '@/components/ui/password-input';
import { TisscaAuthHeader } from '@/components/ui/tissca-auth-header';

type Phase = 'loading' | 'ready' | 'updating' | 'success' | 'error';

/**
 * Create a standalone Supabase client for this page.
 * We use env vars so there are no hardcoded credentials.
 */
function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // handles hash-fragment tokens automatically
    },
  });
}

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientRef, setClientRef] = useState<SupabaseClient | null>(null);

  // On mount: parse URL params, exchange code/token for session
  useEffect(() => {
    const client = getClient();
    if (!client) {
      setError('Supabase is not configured. Please contact support.');
      setPhase('error');
      return;
    }
    setClientRef(client);

    async function exchangeSession(sb: SupabaseClient) {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');
        const token = url.searchParams.get('token');
        const email = url.searchParams.get('email');

        // Hash fragment params (implicit grant / older Supabase flow)
        const hash = (window.location.hash || '').replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // 1) PKCE code flow (most common with Supabase v2+)
        if (code) {
          const { error: codeErr } = await sb.auth.exchangeCodeForSession(code);
          if (codeErr) throw codeErr;
          setPhase('ready');
          return;
        }

        // 2) token_hash flow
        if (tokenHash) {
          const { error: thErr } = await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type === 'recovery' || type === 'reset') ? 'recovery' : 'recovery',
          });
          if (thErr) throw thErr;
          setPhase('ready');
          return;
        }

        // 3) Legacy token + email flow
        if (token && email) {
          const { error: otpErr } = await sb.auth.verifyOtp({
            token,
            email,
            type: 'recovery',
          });
          if (otpErr) throw otpErr;
          setPhase('ready');
          return;
        }

        // 4) Hash fragment session (implicit flow)
        if (accessToken && refreshToken) {
          const { error: sessErr } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessErr) throw sessErr;
          setPhase('ready');
          return;
        }

        // 5) Check if detectSessionInUrl already picked up the session
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          setPhase('ready');
          return;
        }

        throw new Error('Missing reset parameters. Please request a new reset link.');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not verify your reset link.';
        setError(msg);
        setPhase('error');
      }
    }

    exchangeSession(client);
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pw = password.trim();
    const cpw = confirmPassword.trim();

    if (!pw || pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== cpw) {
      setError('Passwords do not match.');
      return;
    }

    if (!clientRef) {
      setError('Supabase client not available. Please try again.');
      return;
    }

    setPhase('updating');

    try {
      const { error: updateErr } = await clientRef.auth.updateUser({ password: pw });
      if (updateErr) throw updateErr;
      setPhase('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update password. Please try again.';
      setError(msg);
      setPhase('ready');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <TisscaAuthHeader
          title={phase === 'success' ? 'Password updated' : 'Reset your password'}
          subtitle={
            phase === 'loading' ? 'Verifying your reset link…'
            : phase === 'ready' ? 'Enter your new password below.'
            : phase === 'updating' ? 'Updating your password…'
            : phase === 'success' ? 'You can now sign in with your new password.'
            : 'Something went wrong.'
          }
        />

        <div className="bg-white p-8 rounded shadow-md">
          {/* Loading state */}
          {phase === 'loading' && (
            <div className="text-center py-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
              <p className="text-secondary text-sm mt-4">Verifying reset link…</p>
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <div className="text-center space-y-3">
                <p className="text-secondary text-sm">
                  Your reset link may have expired or already been used.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-block bg-primary text-white py-2 px-6 rounded font-medium hover:bg-accent transition-colors"
                >
                  Request a new reset link
                </Link>
              </div>
            </div>
          )}

          {/* Password form */}
          {(phase === 'ready' || phase === 'updating') && (
            <form onSubmit={handleUpdatePassword}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="new-password" className="block text-sm font-medium text-secondary mb-2">
                  New password
                </label>
                <PasswordInput
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={phase === 'updating'}
                  required
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary mb-2">
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={phase === 'updating'}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={phase === 'updating'}
                className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'updating' ? 'Updating…' : 'Update password'}
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Use a strong password with at least 8 characters.
              </p>
            </form>
          )}

          {/* Success state */}
          {phase === 'success' && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md">
                <p className="text-emerald-800 text-sm">
                  Your password has been updated successfully.
                </p>
              </div>
              <Link
                href="/sign-in"
                className="inline-block bg-primary text-white py-2 px-6 rounded font-medium hover:bg-accent transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-secondary text-sm mt-6">
          <Link href="/sign-in" className="text-primary font-medium hover:text-accent">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
