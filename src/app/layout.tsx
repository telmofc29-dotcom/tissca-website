/**
 * layout.tsx v1.0.3 (Premium Global Theme Wiring + Ambient Layers)
 * ==============================================================
 * ✅ NOTES (LOCKED):
 * - App Router root layout (single source for global metadata + HTML shell).
 * - Keep changes minimal: only what’s needed for canonical domain + branding + premium theme.
 * - Metadata remains sourced from config (defaultMetadata) to avoid hard-coding.
 *
 * WHY v1.0.3:
 * - FIX: Root layout was forcing bg-white, which overrides the premium espresso background in globals.css.
 * - ADD: Ambient + noise layers (defined in globals.css) are mounted once globally for consistent premium theme.
 *
 * IMPORTANT:
 * - Next.js metadataBase affects absolute URL generation for OG/Twitter/etc.
 * - defaultMetadata is still used; metadataBase is guaranteed here.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Add metadataBase + NOTES header (no UI behaviour change)
 * - v1.0.2 (2026-02-13): Force dynamic root to prevent static build calling API routes
 * - v1.0.3 (2026-02-24): Remove forced white body + mount ambient/noise layers globally
 */

// ✅ BUILD FIX (LOCKED MINIMAL):
// Prevent Next from trying to statically render routes during build.
// This avoids "Dynamic server usage" errors for API routes that read request.headers.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { defaultMetadata } from '@/config/metadata';
import FeedbackButton from '@/components/FeedbackButton';
import { GlobalHeader } from '@/components/GlobalHeader';
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
      {/* NOTE:
          We do NOT force bg-white here. Body background is owned by globals.css (premium espresso theme). */}
      <body className="min-h-screen bg-[#0b141b] text-white">
        {/* Premium ambient layers (CSS in globals.css) */}
        <div className="tissca-ambient" />
        <div className="tissca-noise" />

        <GlobalHeader />
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}