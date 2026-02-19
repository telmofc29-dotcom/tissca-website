/**
 * metadata.ts v1.0.1 (Canonical URLs + Absolute OG Image Safety)
 * ==============================================================
 * ✅ NOTES (LOCKED):
 * - Central metadata config used by RootLayout.
 * - Keep brand strings sourced from brandConfig (no hard-coded branding).
 * - Keep changes minimal and safe for Next.js Metadata typing.
 *
 * WHY v1.0.1:
 * - Canonical should point to the root domain (no www) and be consistent.
 * - Avoid double-prefixing baseUrl when defaultImage might already be absolute later.
 * - Ensure OpenGraph URL uses a canonical absolute URL string (from brandConfig.baseUrl).
 *
 * IMPORTANT:
 * - RootLayout sets metadataBase; Next.js will resolve relative OG image URLs properly.
 * - Therefore: prefer relative image path (brandConfig.seo.defaultImage) rather than `${baseUrl}${path}`.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Canonical consistency + OG image URL safety
 */

import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const defaultMetadata: Metadata = {
  title: {
    template: `%s | ${brandConfig.displayName}`,
    default: `${brandConfig.displayName} - ${brandConfig.tagline}`,
  },
  description: brandConfig.description,
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: brandConfig.baseUrl,
    siteName: brandConfig.displayName,
    title: `${brandConfig.displayName} - ${brandConfig.tagline}`,
    description: brandConfig.description,
    images: [
      {
        // NOTE:
        // - With metadataBase set in RootLayout, this can be relative safely.
        // - Prevents accidental double baseUrl if this becomes absolute later.
        url: brandConfig.seo.defaultImage,
        width: 1200,
        height: 630,
        alt: brandConfig.displayName,
      },
    ],
  },
  twitter: brandConfig.seo.twitterHandle
    ? {
        card: 'summary_large_image',
        creator: brandConfig.seo.twitterHandle,
        site: brandConfig.seo.twitterHandle,
      }
    : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: brandConfig.baseUrl,
  },
};

export function generateDefaultJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brandConfig.displayName,
    url: brandConfig.baseUrl,
    description: brandConfig.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${brandConfig.baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
