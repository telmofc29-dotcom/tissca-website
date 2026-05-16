// src/app/(public)/HomePageClient.tsx v4.0
//
// PURPOSE:
// - Client-side SaaS landing page with i18n support + scroll animations.
// - Wrapped by the server page.tsx which provides metadata.
//
// SECTIONS:
// 1. Hero — dark navy gradient, product-led CTAs + app mockup
// 2. Trust strip — light credibility bar
// 3. Features — light, 6 product capability cards with blue accents
// 4. Why TISSCA — dark navy gradient, benefit cards
// 5. Plans — light, 4-tier pricing cards
// 6. Download — premium ecosystem section
// 7. Final CTA — light off-white close
//
// VERSION HISTORY:
// - v2.2: Static homepage with visual polish
// - v3.0 (2026-03-25): i18n + FadeIn animations + visual rhythm balance
// - v4.0 (2026-03-25): Hero app mockup + download upgrade + contrast fix

'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n';
import { brandConfig } from '@/config/brand';
import { FadeIn } from '@/components/FadeIn';
import { AppMockup } from '@/components/AppMockup';
import { ToolsMockup } from '@/components/ToolsMockup';
import { trackEvent } from '@/utils/analytics';

/* ─────────────────────────────── Feature icons ─────────────────────────────── */

const featureIcons = [
  // Leads & Jobs
  <svg key="leads" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>,
  // Quotes & Invoices
  <svg key="quotes" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>,
  // Built-in Tools
  <svg key="tools" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="10" y2="14" />
    <line x1="14" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="10" y2="18" />
    <line x1="14" y1="18" x2="16" y2="18" />
  </svg>,
  // Team Workspace
  <svg key="team" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>,
  // Assets & Organisation
  <svg key="assets" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>,
  // Business Growth
  <svg key="growth" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>,
];

/* ─────────────────────────────── Plans data ─────────────────────────────── */

const plans = [
  {
    name: 'Free',
    positioning: '1 user · Basic access',
    features: brandConfig.pricing.free.features,
    cta: 'Get Started',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    positioning: '1 user · Full solo toolkit',
    features: brandConfig.pricing.pro.features,
    cta: 'Start Pro',
    href: '/register',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Team Starter',
    positioning: 'Up to 5 members · Collaboration features',
    features: brandConfig.pricing.team.features,
    cta: 'Start Team',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Team Pro',
    positioning: 'Up to 200 members · Advanced team control',
    features: brandConfig.pricing.teamPro.features,
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false,
    badge: 'Full Power',
  },
];

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */

export default function HomePageClient() {
  const { t } = useLanguage();

  return (
    <>
      {/* ──── 1. HERO (DARK) — Split: copy left, mockup right ──── */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28 bg-gradient-to-b from-[#0b141b] via-[#0e1720] to-[#111c28]">
        {/* App-authentic ambient glow — navy + gold */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />
        <div className="pointer-events-none absolute top-0 left-1/3 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-[#2d4152]/[0.18] blur-[140px] animate-[heroPulse_8s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute top-20 left-1/4 w-[400px] h-[300px] rounded-full bg-[#cbb26b]/[0.04] blur-[100px]" />

        <style>{`
          @keyframes heroPulse {
            0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
            50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
          }
        `}</style>

        <div className="relative max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <FadeIn duration={800}>
                <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold mb-6 leading-[1.1] tracking-tight text-white">
                  {t.hero.title}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cbb26b] to-[#e0d5a0]">
                    {t.hero.titleAccent}
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={150} duration={800}>
                <p className="text-lg md:text-xl text-white/60 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {t.hero.subtitle}
                </p>
              </FadeIn>

              <FadeIn delay={300} duration={800}>
                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                  <Link
                    href="/app/overview"
                    onClick={() => trackEvent('open_app_click', '/', { metadata: { ctaName: 'hero_open_app', sourcePage: '/', sourceSection: 'hero', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                    className="inline-flex items-center justify-center rounded-xl bg-[#cbb26b] px-8 py-3.5 text-base font-semibold text-[#0b141b] hover:bg-[#b89b4a] transition-all duration-200 no-underline hover:no-underline shadow-lg shadow-[#cbb26b]/20 hover:shadow-xl hover:shadow-[#cbb26b]/25 hover:-translate-y-0.5"
                  >
                    {t.hero.ctaPrimary}
                  </Link>

                  <Link
                    href="#download"
                    onClick={() => trackEvent('cta_click', '/', { metadata: { ctaName: 'hero_download', sourcePage: '/', sourceSection: 'hero', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200 no-underline hover:no-underline hover:-translate-y-0.5"
                  >
                    {t.hero.ctaSecondary}
                  </Link>
                </div>

                <Link
                  href="#plans"
                  className="inline-block mt-5 text-sm text-white/40 hover:text-white/60 transition-colors no-underline hover:no-underline"
                >
                  {t.hero.viewPlans}
                </Link>
              </FadeIn>
            </div>

            {/* Right: app mockup */}
            <FadeIn delay={400} duration={1000} distance={40}>
              <div className="flex justify-center lg:justify-end">
                <div className="relative transform lg:rotate-[2deg] hover:rotate-0 transition-transform duration-700 ease-out">
                  <AppMockup />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ──── 2. TRUST STRIP (transition) ──── */}
      <section className="border-y border-slate-200/80 bg-[#f6f7f9]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {t.trust.items.map((point) => (
              <p key={point} className="text-sm font-medium text-slate-600">
                {point}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ──── 3. FEATURES (LIGHT) ──── */}
      <section id="features" className="py-20 md:py-28 bg-[#f6f7f9]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t.features.heading}
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                {t.features.subheading}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.cards.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-slate-300/80 hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#cbb26b]/[0.08] text-[#b89b4a] group-hover:bg-[#cbb26b]/[0.12] group-hover:text-[#cbb26b] transition-colors">
                    {featureIcons[i]}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──── 4. WHY TISSCA (DARK) — copy + product mockup ──── */}
      <section className="relative py-20 md:py-28 bg-gradient-to-b from-[#0b141b] to-[#0e1720] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2d4152]/[0.08] via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-32 right-0 w-[500px] h-[500px] rounded-full bg-[#cbb26b]/[0.03] blur-[120px]" />
        <div className="relative max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: copy + compact benefit list */}
            <FadeIn>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                  {t.whyTissca.heading}
                </h2>
                <p className="text-white/55 text-lg leading-relaxed mb-8">
                  {t.whyTissca.description}
                </p>

                <div className="space-y-4">
                  {t.whyTissca.benefits.map((b) => (
                    <div key={b.title} className="flex items-start gap-3">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="text-[#cbb26b] mt-0.5 flex-shrink-0"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{b.title}</h3>
                        <p className="text-xs text-white/45 leading-relaxed mt-0.5">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Right: Tools mockup — real app screen */}
            <FadeIn delay={200} duration={1000} distance={40}>
              <div className="flex justify-center lg:justify-end">
                <div className="relative transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ease-out">
                  <ToolsMockup />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ──── 5. PLANS (LIGHT) ──── */}
      <section id="plans" className="py-20 md:py-28 bg-[#f6f7f9]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t.plans.heading}
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                {t.plans.subheading}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 80}>
                <div
                  className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-200 hover:-translate-y-0.5 h-full ${
                    plan.highlighted
                      ? 'border-[#cbb26b] bg-white shadow-lg shadow-[#cbb26b]/10 ring-1 ring-[#cbb26b]/20 hover:shadow-xl hover:shadow-[#cbb26b]/15'
                      : 'border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-slate-300/80'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#cbb26b] to-[#b89b4a] px-3 py-1 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mb-6">{plan.positioning}</p>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="text-[#cbb26b] mt-0.5 flex-shrink-0"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    onClick={() => trackEvent('pricing_cta_click', '/', { eventLabel: plan.name.toLowerCase().replace(/\s+/g, '_'), metadata: { planTier: plan.name.toLowerCase().replace(/\s+/g, '_'), ctaName: `${plan.name.toLowerCase().replace(/\s+/g, '_')}_cta`, ctaSource: 'homepage_plans', sourcePage: '/', sourceSection: 'plans', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                    className={`block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 no-underline hover:no-underline hover:-translate-y-0.5 ${
                      plan.highlighted
                        ? 'bg-[#cbb26b] text-[#0b141b] hover:bg-[#b89b4a] shadow-md shadow-[#cbb26b]/20'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Enterprise note */}
          <FadeIn delay={200}>
            <p className="mt-10 text-center text-sm text-slate-500">
              {t.plans.enterprise}{' '}
              <Link href="/contact" className="text-[#cbb26b] hover:text-[#b89b4a] no-underline hover:no-underline">
                {t.plans.contactUs}
              </Link>{' '}
              for a custom solution.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ──── 6. DOWNLOAD — Premium ecosystem section ──── */}
      <section id="download" className="relative py-20 md:py-28 bg-gradient-to-b from-[#0e1720] via-[#0b141b] to-[#0b141b] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#2d4152]/[0.06] via-transparent to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#cbb26b]/[0.04] blur-[120px]" />

        <div className="relative max-w-[1200px] mx-auto px-4 md:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t.download.heading}
              </h2>
              <p className="text-white/55 text-lg max-w-xl mx-auto">
                {t.download.subheading}
              </p>
            </div>
          </FadeIn>

          {/* Platform cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-[800px] mx-auto">
            {/* Google Play */}
            <FadeIn delay={0}>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('download_click', '/', { metadata: { ctaName: 'google_play', sourcePage: '/', sourceSection: 'download', buttonType: 'store_link', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                className="group relative flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300 no-underline hover:no-underline hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.2l2.302 2.3a1 1 0 0 1 0 1.386l-2.302 2.3-2.544-2.543 2.544-2.543zM5.864 3.457L16.8 9.79l-2.302 2.302-8.635-8.635z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-white/40 leading-none mb-1">Get it on</p>
                  <p className="text-base font-semibold text-white leading-tight">{t.download.googlePlay}</p>
                </div>
                <span className="text-[10px] text-white/25 font-medium">Android</span>
              </a>
            </FadeIn>

            {/* App Store */}
            <FadeIn delay={100}>
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('download_click', '/', { metadata: { ctaName: 'app_store', sourcePage: '/', sourceSection: 'download', buttonType: 'store_link', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                className="group relative flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300 no-underline hover:no-underline hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/15 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-white/40 leading-none mb-1">Download on the</p>
                  <p className="text-base font-semibold text-white leading-tight">{t.download.appStore}</p>
                </div>
                <span className="text-[10px] text-white/25 font-medium">iOS</span>
              </a>
            </FadeIn>

            {/* Web App */}
            <FadeIn delay={200}>
              <Link
                href="/app/overview"
                onClick={() => trackEvent('open_app_click', '/', { metadata: { ctaName: 'web_app_download', sourcePage: '/', sourceSection: 'download', buttonType: 'store_link', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                className="group relative flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300 no-underline hover:no-underline hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/15 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-white/40 leading-none mb-1">Open in</p>
                  <p className="text-base font-semibold text-white leading-tight">{t.download.web}</p>
                </div>
                <span className="text-[10px] text-white/25 font-medium">Browser</span>
              </Link>
            </FadeIn>
          </div>

          {/* Ecosystem tagline */}
          <FadeIn delay={300}>
            <p className="text-center text-sm text-white/30 mt-10">
              Available on Android, iOS, and Web — your data syncs everywhere.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ──── 7. FINAL CTA (LIGHT) ──── */}
      <section className="py-20 md:py-28 bg-[#f6f7f9]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.cta.heading}
            </h2>
            <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto">
              {t.cta.subheading}
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app/overview"
                onClick={() => trackEvent('open_app_click', '/', { metadata: { ctaName: 'final_cta_get_started', sourcePage: '/', sourceSection: 'final_cta', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                className="inline-flex items-center justify-center rounded-xl bg-[#cbb26b] px-8 py-3.5 text-base font-semibold text-[#0b141b] hover:bg-[#b89b4a] transition-all duration-200 no-underline hover:no-underline shadow-lg shadow-[#cbb26b]/20 hover:shadow-xl hover:-translate-y-0.5"
              >
                {t.cta.primary}
              </Link>

              <Link
                href="#download"
                onClick={() => trackEvent('cta_click', '/', { metadata: { ctaName: 'final_cta_download', sourcePage: '/', sourceSection: 'final_cta', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200 no-underline hover:no-underline hover:-translate-y-0.5"
              >
                {t.cta.secondary}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
