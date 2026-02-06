/**
 * layout.tsx v1.0.1 (TISSCA Canonical Domain + Metadata Source)
 * =============================================================
 * ✅ NOTES (LOCKED):
 * - App Router root layout (single source for global metadata + HTML shell).
 * - Keep changes minimal: only what’s needed for canonical domain + branding.
 * - Metadata remains sourced from config (defaultMetadata) to avoid hard-coding.
 *
 * WHY v1.0.1:
 * - Ensure canonical domain consistency (tissca.com root, not www).
 * - Align HTML lang with the website’s primary language (English).
 * - Add canonical base metadata in one place via metadataBase (safe + SEO).
 *
 * IMPORTANT:
 * - Next.js metadataBase affects absolute URL generation for OG/Twitter/etc.
 * - defaultMetadata is still used, we just add metadataBase here so it’s guaranteed.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Add metadataBase + NOTES header (no UI behaviour change)
 */

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
