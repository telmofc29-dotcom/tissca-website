/**
 * layout.tsx v1.0.4 (Route-Group Layout Ownership Fix)
 * ====================================================
 * ✅ NOTES (LOCKED):
 * - Root layout is the HTML + metadata shell only.
 * - NO public header/footer/widgets here (they belong to (public) layout).
 * - NO forced body theme classes here (each route-group owns its theme).
 *
 * WHY v1.0.4:
 * - FIX: GlobalHeader + FeedbackButton were mounted globally, causing public chrome to appear in member routes.
 * - FIX: Forced body bg/text was overriding route-group themes and mixing public/member UI.
 * - CHANGE: Ambient/noise layers must be mounted by the correct route group (member), not globally.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Add metadataBase + NOTES header (no UI behaviour change)
 * - v1.0.2 (2026-02-13): Force dynamic root to prevent static build calling API routes
 * - v1.0.3 (2026-02-24): Remove forced white body + mount ambient/noise layers globally
 * - v1.0.4 (2026-02-28): Remove global public chrome + remove forced theme; route groups own layout/theme
 */

// ✅ BUILD FIX (LOCKED MINIMAL):
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { defaultMetadata } from '@/config/metadata';
import { CookieConsent } from '@/components/CookieConsent';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import { LanguageProvider } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  ...defaultMetadata,
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
          Do not force theme here. Route-groups own their own UI (public vs member vs admin). */}
      <body className="min-h-screen">
        <LanguageProvider>
          {children}
          <CookieConsent />
          <AnalyticsTracker />
        </LanguageProvider>
      </body>
    </html>
  );
}