// src/app/(public)/layout.tsx v2.0.0
/**
 * (public)/layout.tsx v2.0.0 (SaaS Dark Premium Shell)
 * =====================================================
 * ✅ NOTES (LOCKED):
 * - Public layout wrapper for marketing pages only.
 * - Public chrome MUST live here (NOT in root layout) so member/admin do not inherit it.
 * - Dark premium surface for SaaS landing page look.
 *
 * VERSION HISTORY:
 * - v1.0.0: Metadata + children only
 * - v1.0.1: Public shell + footer
 * - v1.0.2: Add GlobalHeader + FeedbackButton
 * - v1.0.3: DEBUG banner
 * - v1.0.4 (2026-03-01): White public shell
 * - v1.0.5 (2026-03-01): Light header variant
 * - v2.0.0 (2026-03-25): Dark premium SaaS shell + product-first header
 */

import type { Metadata } from 'next';
import { GlobalHeader } from '@/components/GlobalHeader';
import { GlobalFooter } from '@/components/GlobalFooter';
import FeedbackButton from '@/components/FeedbackButton';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: brandConfig.seo.defaultTitle,
  description: brandConfig.seo.defaultDescription,
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0f14]">
      <GlobalHeader tone="dark" />

      <main className="min-h-[calc(100vh-4rem)]">{children}</main>

      <GlobalFooter />
      <FeedbackButton />
    </div>
  );
}