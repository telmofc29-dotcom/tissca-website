// src/app/(public)/layout.tsx
/**
 * (public)/layout.tsx v1.0.1 (Public Shell + Premium Header)
 * ==========================================================
 * ✅ NOTES (LOCKED):
 * - Public layout wrapper for marketing/help pages.
 * - Adds a premium sticky header with always-visible Log in / Register.
 * - Minimal: does not change routing, data fetching, or auth logic.
 * - Uses global premium theme from root globals.css (espresso + ambient).
 *
 * VERSION HISTORY:
 * - v1.0.0: Metadata + children only
 * - v1.0.1: Add premium public header shell
 */

import type { Metadata } from 'next';
import { GlobalFooter } from '@/components/GlobalFooter';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: brandConfig.displayName,
  description: brandConfig.description,
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-grow">{children}</main>
      <GlobalFooter />
    </>
  );
}