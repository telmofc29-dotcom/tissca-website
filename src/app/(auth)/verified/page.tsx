/**
 * auth/verified/page.tsx v1.0.0 (Email Verified Landing Page - No More Black Screen)
 * ================================================================================
 * ✅ NOTES (LOCKED):
 * - This page is the hosted end-point after Supabase email verification.
 * - Purpose: never show a blank/black screen; always show a clean confirmation page.
 * - Includes a deep link button back to the app: tissca://auth/callback
 * - Keep it simple, fast, and readable on mobile.
 *
 * NEXT STEP (SUPABASE):
 * - Add https://tissca.com/auth/verified to Supabase Auth Redirect URLs.
 * - Keep tissca://auth/callback for mobile deep linking.
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Email Verified',
  description: `Your email has been verified. You can now return to the ${brandConfig.displayName} app.`,
};

export default function VerifiedPage() {
  const deepLink = 'tissca://auth/callback';

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl border border-gray-200 rounded-xl p-6 md:p-8 bg-white">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3">
          Email verified ✅
        </h1>

        <p className="text-secondary leading-relaxed mb-6">
          Your email address is now verified. You can return to the {brandConfig.displayName} app and sign in.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={deepLink}
            className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-blue-600 text-white font-semibold rounded transition-colors"
          >
            Open {brandConfig.displayName} App
          </a>

          <Link
            href="/support"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary border border-gray-200 hover:bg-gray-50 font-semibold rounded transition-colors"
          >
            Need help?
          </Link>
        </div>

        <div className="mt-6 text-sm text-secondary space-y-2">
          <p>
            If the button doesn&apos;t open the app, please open the app manually and sign in.
          </p>
          <p>
            You can also contact support at{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
