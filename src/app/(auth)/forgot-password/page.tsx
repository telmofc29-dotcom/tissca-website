// src/app/(auth)/forgot-password/page.tsx
//
// PURPOSE:
// - Let users request a password reset email.
// - Calls POST /api/auth/reset-password { email }.
// - Shows success state regardless (no email enumeration).
// - Links back to sign-in.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Turnstile, useTurnstile } from '@/components/ui/turnstile';
import { TisscaAuthHeader } from '@/components/ui/tissca-auth-header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState('');
  const turnstile = useTurnstile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
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

    setPhase('sending');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, turnstileToken: turnstile.token }),
      });

      if (!res.ok) {
        throw new Error('Failed to send reset email. Please try again.');
      }

      setPhase('sent');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      setPhase('form');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <TisscaAuthHeader
          title="Reset password"
          subtitle={phase === 'sent' ? 'Check your email' : "Enter your email and we'll send you a reset link"}
        />

        <div className="bg-white p-8 rounded shadow-md">
          {phase === 'sent' ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md">
                <p className="text-emerald-800 text-sm">
                  If an account exists for <strong>{email}</strong>, you will receive a password
                  reset email shortly. Check your inbox (and spam folder).
                </p>
              </div>

              <p className="text-secondary text-sm">
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  onClick={() => setPhase('form')}
                  className="text-primary font-medium hover:text-accent"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-secondary mb-2"
                >
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={phase === 'sending'}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                  autoFocus
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
                disabled={phase === 'sending'}
                className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'sending' ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
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
