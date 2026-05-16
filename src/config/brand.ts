/**
 * brand.ts v2.0.0 (TISSCA SaaS Rebrand)
 * ======================================
 * ✅ NOTES (LOCKED):
 * - Single source of truth for all branding across the platform.
 * - No hard-coded brand strings in components.
 * - JSON-like config only; keep changes minimal and intentional.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial config (as provided)
 * - v1.0.1 (2026-02-04): Canonical domain URLs + support email added
 * - v2.0.0 (2026-03-25): SaaS rebrand — app-first positioning, 4-tier pricing, product nav
 */

export const brandConfig = {
  // Core Identity
  name: 'TISSCA',
  displayName: 'TISSCA',
  tagline: 'Run your trade business smarter',
  description:
    'The platform for tradespeople and construction businesses — quotes, jobs, tools, teams, and workflow in one place.',

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
    email: 'support@tissca.com',
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
    accent: '#3b82f6', // Blue (CTAs, links)
    gold: '#cbb26b', // App-aligned gold accent
    goldDark: '#b89b4a', // Gold hover state
    navy: '#0b141b', // App primary background
    navyBlue: '#2d4152', // App blue tint
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
    defaultTitle: 'TISSCA — Run Your Trade Business Smarter',
    defaultDescription:
      'The platform for tradespeople and construction businesses — quotes, jobs, tools, teams, and workflow in one place.',
    defaultImage: '/og-image.png',
    twitterHandle: null,
  },

  // Navigation Structure
  navigation: {
    main: [
      { label: 'Home', href: '/' },
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#plans' },
      { label: 'Download', href: '/#download' },
    ],
    footer: {
      main: [
        { label: 'About', href: '/about' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Contact', href: '/contact' },
      ],
      product: [
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/#plans' },
        { label: 'Download', href: '/#download' },
      ],
      resources: [
        { label: 'Calculators', href: '/calculators' },
        { label: 'Guides', href: '/guides' },
        { label: 'Standards', href: '/standards' },
        { label: 'Support', href: '/support' },
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
      'The platform for tradespeople and construction businesses — quotes, jobs, tools, teams, and workflow in one place.',
  },

  // Subscription pricing (Stripe-ready, 4-tier)
  pricing: {
    free: {
      tier: 'free',
      name: 'Free',
      members: 1,
      price: 0,
      currency: 'GBP',
      interval: null,
      stripePriceId: null,
      positioning: 'Getting started with the basics',
      features: [
        '1 user',
        'Access to guides & calculators',
        'Save calculator results',
        'Generate basic quotes',
        'Generate basic invoices',
        'TISSCA watermark on documents',
      ],
      cta: 'Get Started',
    },
    pro: {
      tier: 'pro',
      name: 'Pro',
      members: 1,
      price: null, // TBD — set when finalised
      currency: 'GBP',
      interval: 'month',
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
      priceAnnual: null,
      stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
      positioning: 'For solo professionals who need the full toolset',
      features: [
        '1 user',
        'Everything in Free',
        'Unlimited quotes & invoices',
        'Remove TISSCA watermark',
        'No ads anywhere',
        'Upload business logo',
        'Professional branded documents',
        'Full mobile app access',
        'Priority support',
      ],
      cta: 'Start Pro',
      tagline: 'Most popular for individuals',
    },
    team: {
      tier: 'team',
      name: 'Team Starter',
      members: 5,
      price: null, // TBD
      currency: 'GBP',
      interval: 'month',
      stripePriceId: null,
      positioning: 'For growing teams needing collaboration',
      features: [
        'Up to 5 members',
        'Everything in Pro',
        'Multi-user workspace',
        'Team member management',
        'Shared jobs & clients',
        'Role-based access',
        'Team activity feed',
      ],
      cta: 'Start Team',
      tagline: 'Built for collaboration',
    },
    teamPro: {
      tier: 'team-pro',
      name: 'Team Pro',
      members: 200,
      price: null, // TBD
      currency: 'GBP',
      interval: 'month',
      stripePriceId: null,
      positioning: 'Advanced multi-user operations and deeper control',
      features: [
        'Up to 200 members',
        'Everything in Team Starter',
        'Advanced reporting',
        'Custom workflows',
        'Priority onboarding',
        'Dedicated support',
        'API access',
      ],
      cta: 'Start Team Pro',
      tagline: 'Full platform power',
    },
  },
};

export type BrandConfig = typeof brandConfig;
