/**
 * layout.tsx v1.0.2 (TISSCA Canonical Domain + Metadata Source + FORCE DYNAMIC ROOT)
 * =============================================================
 * ✅ NOTES (LOCKED):
 * - App Router root layout (single source for global metadata + HTML shell).
 * - Keep changes minimal: only what’s needed for canonical domain + branding.
 * - Metadata remains sourced from config (defaultMetadata) to avoid hard-coding.
 *
 * WHY v1.0.2:
 * - FIX: Vercel build was attempting static rendering which triggered API routes
 *   that access request.headers, causing DYNAMIC_SERVER_USAGE + build failure.
 * - Force the root layout to be dynamic so Next does not statically render
 *   authenticated/app pages during build while the website is still evolving.
 *
 * IMPORTANT:
 * - Next.js metadataBase affects absolute URL generation for OG/Twitter/etc.
 * - defaultMetadata is still used, we just add metadataBase here so it’s guaranteed.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Add metadataBase + NOTES header (no UI behaviour change)
 * - v1.0.2 (2026-02-13): Force dynamic root to prevent static build calling API routes
 */

// ✅ BUILD FIX (LOCKED MINIMAL):
// Prevent Next from trying to statically render routes during build.
// This avoids "Dynamic server usage" errors for API routes that read request.headers.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { defaultMetadata } from '@/config/metadata';
import FeedbackButton from '@/components/FeedbackButton';
import './globals.css';

export const metadata: Metadata = {
  ...defaultMetadata,
  // NOTE (CANONICAL):
  // - Primary domain: https://tissca.com
  // - www should redirect to root at the hosting/DNS layer.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://tissca.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className="bg-white text-primary">
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}