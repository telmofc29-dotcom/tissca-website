// src/app/(public)/page.tsx v3.0
//
// PURPOSE:
// - Server component wrapper that provides metadata for the homepage.
// - Delegates rendering to HomePageClient for i18n + animations.
//
// VERSION HISTORY:
// - v1.0: Educational content homepage
// - v1.1: White public theme
// - v2.0 (2026-03-25): Full SaaS rebrand — product-first landing page
// - v2.1 (2026-03-25): Visual rhythm — alternating light/dark sections
// - v2.2 (2026-03-25): Visual polish — blue icon accents, card elevation
// - v3.0 (2026-03-25): i18n + FadeIn animations + visual rhythm balance

import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
  title: brandConfig.seo.defaultTitle,
  description: brandConfig.seo.defaultDescription,
};

export default function HomePage() {
  return <HomePageClient />;
}