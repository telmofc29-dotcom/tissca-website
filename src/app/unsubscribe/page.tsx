// src/app/unsubscribe/page.tsx
//
// PURPOSE:
// Public unsubscribe page. Reads token from URL, calls API to unsubscribe.

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');

  const processUnsubscribe = useCallback(async () => {
    if (!token) {
      setStatus('no-token');
      setMessage('No unsubscribe token provided.');
      return;
    }

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('You have been successfully unsubscribed from all non-essential TISSCA emails.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to process unsubscribe request.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again or contact support.');
    }
  }, [token]);

  useEffect(() => {
    processUnsubscribe();
  }, [processUnsubscribe]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Logo */}
          <div className="mb-6 text-center">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">TISSCA</span>
          </div>

          {status === 'loading' && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="text-sm text-slate-600">Processing your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Unsubscribed</h1>
              <p className="text-sm text-slate-600">{message}</p>
              <p className="mt-4 text-xs text-slate-400">
                You can re-enable emails anytime from your{' '}
                <a href="/app/settings/email-preferences" className="text-blue-600 hover:underline">
                  email preferences
                </a>.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
              <p className="text-sm text-slate-600">{message}</p>
              <p className="mt-4 text-xs text-slate-400">
                Please contact{' '}
                <a href="/support" className="text-blue-600 hover:underline">support</a>{' '}
                if this problem persists.
              </p>
            </div>
          )}

          {status === 'no-token' && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
              <p className="text-sm text-slate-600">{message}</p>
              <p className="mt-4 text-xs text-slate-400">
                To manage your email preferences, visit your{' '}
                <a href="/app/settings/email-preferences" className="text-blue-600 hover:underline">
                  settings page
                </a>.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          TISSCA &middot; Trade Industry Software &amp; Standards Compliance Assurance
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
