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
    locale: 'en_US',
    url: brandConfig.baseUrl,
    siteName: brandConfig.displayName,
    title: `${brandConfig.displayName} - ${brandConfig.tagline}`,
    description: brandConfig.description,
    images: [
      {
        url: `${brandConfig.baseUrl}${brandConfig.seo.defaultImage}`,
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
