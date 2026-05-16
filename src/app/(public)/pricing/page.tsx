'use client';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { brandConfig } from '@/config/brand';
import { trackEvent } from '@/utils/analytics';

const tiers = [
  {
    key: 'free',
    ...brandConfig.pricing.free,
    accent: false,
  },
  {
    key: 'pro',
    ...brandConfig.pricing.pro,
    accent: true,
    badge: 'Most Popular',
  },
  {
    key: 'team',
    ...brandConfig.pricing.team,
    accent: false,
  },
  {
    key: 'team-pro',
    ...brandConfig.pricing.teamPro,
    accent: false,
  },
];

const faqs = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel your subscription at any time — no questions asked. You keep access until the end of the billing period.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex) via Stripe.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Free tier gives you everything you need to get started. Upgrade when you\'re ready for the full toolset.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. Upgrade, downgrade, or change billing interval anytime from your account settings.',
  },
];

export default function PricingPage() {
  const { isLoggedIn, tier: currentTier } = useAuth();
  const router = useRouter();

  function handleUpgrade(tierKey?: string) {
    const locale = typeof document !== 'undefined' ? document.documentElement.lang : undefined;
    trackEvent('pricing_cta_click', '/pricing', {
      eventLabel: tierKey || 'pricing_upgrade',
      metadata: {
        planTier: tierKey || 'unknown',
        ctaSource: 'pricing_grid',
        ctaName: `${tierKey || 'unknown'}_cta`,
        buttonType: 'tier_cta',
        sourcePage: '/pricing',
        sourceSection: 'pricing_grid',
        locale: locale || undefined,
      },
    });
    if (!isLoggedIn) {
      router.push('/sign-in');
      return;
    }
    router.push('/account/billing');
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Header */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 text-center">
          <p className="text-[#cbb26b] font-semibold text-sm uppercase tracking-wide mb-2">Pricing</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Simple, Transparent Plans</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Start free. Upgrade when you need more power. No hidden fees.
          </p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {tiers.map((t) => {
              const isCurrent = currentTier === t.tier;
              return (
                <div
                  key={t.key}
                  className={`relative bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${
                    t.accent
                      ? 'border-[#cbb26b] ring-1 ring-[#cbb26b]/30'
                      : 'border-slate-200/80'
                  }`}
                >
                  {t.accent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#cbb26b] text-[#0b141b] text-xs font-bold px-3 py-1 rounded-full">
                      {(t as typeof t & { badge?: string }).badge}
                    </span>
                  )}

                  <h2 className="text-lg font-bold text-slate-900 mb-1">{t.name}</h2>
                  <p className="text-slate-500 text-xs mb-4 leading-relaxed">{t.positioning}</p>

                  <div className="mb-5">
                    {t.price === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">£0</span>
                        <span className="text-slate-400 text-sm">/ forever</span>
                      </div>
                    ) : t.price ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">£{t.price}</span>
                        <span className="text-slate-400 text-sm">/ {t.interval}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">Price coming soon</span>
                    )}
                    {isCurrent && (
                      <span className="inline-block mt-2 bg-[#cbb26b]/10 text-[#b89b4a] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Your Current Plan
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-400 cursor-not-allowed mb-5"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(t.key)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors mb-5 ${
                        t.accent
                          ? 'bg-[#cbb26b] hover:bg-[#b89b4a] text-[#0b141b]'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {t.cta}
                    </button>
                  )}

                  {/* Features */}
                  <div className="space-y-2.5 mt-auto">
                    {t.features.map((feat, i) => (
                      <div key={i} className="flex gap-2">
                        <svg className="w-4 h-4 text-[#cbb26b] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className="text-slate-600 text-sm leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 mb-1">{faq.q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bg-[#0b141b] rounded-2xl p-8 md:p-10 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              {isLoggedIn ? 'Manage your plan' : 'Ready to get started?'}
            </h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              {isLoggedIn
                ? 'Head to your account to change plans or update billing.'
                : 'Sign up free — no credit card required. Upgrade when you\'re ready.'}
            </p>
            <Link
              href={isLoggedIn ? '/account' : '/register'}
              className="inline-flex items-center px-6 py-3 bg-[#cbb26b] hover:bg-[#b89b4a] text-[#0b141b] font-semibold rounded-xl transition-colors no-underline"
            >
              {isLoggedIn ? 'Go to Account' : 'Sign Up Free'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
