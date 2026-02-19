/**
 * brand.ts v1.0.1 (TISSCA Website Rebrand + Domain Canonical)
 * ==========================================================
 * ✅ NOTES (LOCKED):
 * - Single source of truth for all branding across the platform.
 * - No hard-coded brand strings in components.
 * - JSON-like config only; keep changes minimal and intentional.
 *
 * WHY v1.0.1:
 * - Canonical domain choice: tissca.com (root) is primary.
 * - www.tissca.com should redirect to tissca.com (hosting/DNS).
 * - Base URL + structured data URL updated to avoid www mismatch.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial config (as provided)
 * - v1.0.1 (2026-02-04): Canonical domain URLs + support email added
 */

export const brandConfig = {
  // Core Identity
  name: 'TISSCA',
  displayName: 'TISSCA',
  tagline: 'The Construction Authority',
  description:
    'Construction authority platform - The global reference for construction, renovations, workmanship standards, and calculations.',

  // Company
  companyName: 'TISSCA',
  companyLegalName: 'TISSCA',
  year: new Date().getFullYear(),

  // URLs
  // NOTE (CANONICAL):
  // - Primary domain: https://tissca.com
  // - www should redirect to the root domain at the hosting layer.
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://tissca.com',
  domain: 'tissca.com',

  // Contact & Social
  contact: {
    email: 'hello@tissca.com',
    supportEmail: 'support@tissca.com', // Used for /support (professional support presence)
    phone: null, // Add if needed
  },
  social: {
    twitter: null,
    linkedin: null,
    youtube: null,
    instagram: null,
  },

  // Branding Colors
  colors: {
    primary: '#1f2937', // Dark slate
    secondary: '#374151', // Medium slate
    accent: '#3b82f6', // Blue
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    white: '#ffffff',
    light: '#f3f4f6',
    dark: '#111827',
  },

  // Typography
  fonts: {
    family: 'system-ui, -apple-system, sans-serif',
    sizes: {
      h1: '2.25rem',
      h2: '1.875rem',
      h3: '1.5rem',
      h4: '1.25rem',
      body: '1rem',
      small: '0.875rem',
    },
  },

  // Layout
  layout: {
    headerHeight: '64px',
    maxWidth: '1200px',
    gutter: '1rem',
    mobileGutter: '1rem',
    desktopGutter: '2rem',
  },

  // Logo
  logo: {
    alt: 'TISSCA Logo',
    url: '/logo.svg', // Update with actual logo path when available
    darkUrl: '/logo-dark.svg',
  },

  // Platform Features
  features: {
    enableAdvertising: true, // Show ads to free tier users
    enableMembership: true, // Premium subscription available
    enableUserAccounts: true, // User authentication enabled
    enablePdfExport: true, // PDF generation for quotes/invoices
    enableCalculators: true, // All calculators enabled
  },

  // SEO Defaults
  seo: {
    defaultTitle: 'TISSCA - Construction Authority',
    defaultDescription:
      'The global reference for construction, renovations, workmanship standards, and calculations.',
    defaultImage: '/og-image.png', // Update with actual image path when available
    twitterHandle: null,
  },

  // Navigation Structure
  navigation: {
    main: [
      { label: 'Home', href: '/' },
      { label: 'Is This Done Properly?', href: '/workmanship' },
      { label: 'How Much Should This Cost?', href: '/construction-costs' },
      { label: 'Avoid Scams', href: '/avoid-scams' },
      { label: 'Calculators', href: '/calculators' },
      { label: 'How To Do It', href: '/guides' },
      { label: 'Learn', href: '/education' },
    ],
    footer: {
      main: [
        { label: 'About', href: '/about' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Contact', href: '/contact' },
      ],
      resources: [
        { label: 'Calculators', href: '/calculators' },
        { label: 'Guides', href: '/guides' },
        { label: 'Standards', href: '/standards' },
        { label: 'Blog', href: '/blog' },
      ],
    },
  },

  // Metadata for structured data
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TISSCA',
    url: 'https://tissca.com',
    description:
      'The global reference for construction, renovations, workmanship standards, and calculations.',
  },

  // Subscription pricing (Stripe-ready)
  pricing: {
    free: {
      tier: 'free',
      name: 'Free',
      price: 0,
      currency: 'GBP',
      interval: null,
      stripePriceId: null,
      features: [
        'Access to all guides & calculators',
        'Save calculator results',
        'Generate basic quotes',
        'Generate basic invoices',
        'With TISSCA watermark',
      ],
      cta: 'Get Started',
    },
    pro: {
      tier: 'pro',
      name: 'Pro',
      price: 3,
      currency: 'GBP',
      interval: 'month',
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY, // Set in .env
      priceAnnual: 20,
      stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL, // Set in .env
      features: [
        'Everything in Free',
        'No ads anywhere',
        'Full mobile app access (iOS & Android)',
        'Unlimited quotes & invoices',
        'Upload your business logo',
        'Remove TISSCA watermark',
        'Save client details',
        'Professional branded documents',
        'Priority support',
      ],
      cta: 'Start Pro',
      tagline: 'For the price of a coffee',
    },
  },
};

export type BrandConfig = typeof brandConfig;
