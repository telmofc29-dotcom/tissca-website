/**
 * manifest.ts v1.0.0 (PWA Web App Manifest)
 * ==========================================
 * ✅ NOTES:
 * - Next.js App Router auto-serves this as /manifest.webmanifest
 * - Sources branding from brandConfig for consistency
 * - Icons generated from the TISSCA logo mark (scripts/generate-manifest-icons.js)
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TISSCA — Run Your Trade Business Smarter',
    short_name: 'TISSCA',
    description:
      'The platform for tradespeople and construction businesses — quotes, jobs, tools, teams, and workflow in one place.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b141b',
    theme_color: '#0b141b',
    icons: [
      {
        src: '/icons/icon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
