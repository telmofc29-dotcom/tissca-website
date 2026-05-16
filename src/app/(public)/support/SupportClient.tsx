'use client';

import { useState } from 'react';
import Link from 'next/link';
import { brandConfig } from '@/config/brand';
import { trackEvent } from '@/utils/analytics';

/* ─── FAQ Data ─── */

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  title: string;
  icon: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { q: 'What is TISSCA?', a: 'TISSCA is an all-in-one platform for tradespeople and construction businesses. It helps you manage quotes, invoices, leads, jobs, and your team — all from one place.' },
      { q: 'How do I create an account?', a: 'Click "Get Started" on the homepage or go to the sign-in page and choose "Create account". You can start with the Free plan — no credit card required.' },
      { q: 'Is there a free plan?', a: 'Yes. The Free plan gives you access to guides, calculators, and basic quote and invoice generation at no cost.' },
      { q: 'Can I try premium features before paying?', a: 'All paid plans come with a trial period so you can explore advanced features risk-free before committing.' },
    ],
  },
  {
    title: 'Accounts & Sign-in',
    icon: '🔑',
    items: [
      { q: 'I forgot my password — how do I reset it?', a: 'On the sign-in page, click "Forgot password?" and enter your email. You will receive a reset link within a few minutes.' },
      { q: 'Can I change my email address?', a: 'Yes. Go to Settings in the member app and update your email. You will need to verify the new address.' },
      { q: 'How do I delete my account?', a: 'Go to Settings → Account → Delete Account. This action is permanent and cannot be undone.' },
    ],
  },
  {
    title: 'Plans & Billing',
    icon: '💳',
    items: [
      { q: 'What plans are available?', a: 'We offer four plans: Free, Pro, Team Starter (up to 5 members), and Team Pro (up to 200 members). Visit the Pricing page for a full comparison.' },
      { q: 'How do I upgrade or downgrade my plan?', a: 'Go to Settings → Subscription in the member app. You can change your plan at any time. Changes take effect at the start of your next billing cycle.' },
      { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel at any time from Settings → Subscription. You will retain access until the end of your current billing period.' },
      { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards through our secure payment provider.' },
    ],
  },
  {
    title: 'Quotes & Invoices',
    icon: '📄',
    items: [
      { q: 'How do I create a quote?', a: 'In the member app, go to Quotes → New Quote. Fill in the client details, add line items, and send it directly to your client by email or as a PDF.' },
      { q: 'Can I convert a quote to an invoice?', a: 'Yes. On any accepted quote, click "Convert to Invoice". All details carry over automatically.' },
      { q: 'Can I customise my invoice branding?', a: 'Yes. On Pro and above, go to Settings → Branding to upload your logo, set your colours, and create professional branded documents. The Free plan includes a TISSCA watermark.' },
    ],
  },
  {
    title: 'Leads & Jobs',
    icon: '🏗️',
    items: [
      { q: 'What is the difference between a lead and a job?', a: 'A lead is a potential project or enquiry. Once you win the work and begin, you convert it into a job to track progress, costs, and timelines.' },
      { q: 'How do I track job progress?', a: 'Each job has a status pipeline (e.g. Quoted → In Progress → Complete). Update the status as work progresses.' },
      { q: 'Can I assign jobs to team members?', a: 'Yes, on Team Starter and Team Pro plans you can assign jobs and tasks to individual team members.' },
    ],
  },
  {
    title: 'Downloads & Mobile App',
    icon: '📱',
    items: [
      { q: 'Is there a mobile app?', a: 'TISSCA is a progressive web app (PWA) that works on any device. You can add it to your home screen for a native app experience.' },
      { q: 'How do I install the PWA?', a: 'Open TISSCA in your mobile browser, tap the Share button (iOS) or the browser menu (Android), then choose "Add to Home Screen".' },
      { q: 'Does TISSCA work offline?', a: 'Basic features work offline. Your data syncs automatically when you reconnect.' },
    ],
  },
  {
    title: 'Teams & Workspace',
    icon: '👥',
    items: [
      { q: 'How do I invite team members?', a: 'Go to Settings → Team and click "Invite member". Enter their email address and choose their role.' },
      { q: 'What roles are available?', a: 'Team roles include Admin (full access), Manager (manage jobs and team), and Member (view and update assigned work).' },
      { q: 'Is there a limit on team size?', a: 'The Free and Pro plans are single-user. Team Starter supports up to 5 members, and Team Pro supports up to 200 members.' },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: '🛠️',
    items: [
      { q: 'The page is not loading — what should I do?', a: 'Try clearing your browser cache and cookies, then reload. If the problem persists, try a different browser or check your internet connection.' },
      { q: 'I found a bug — how do I report it?', a: 'Use the feedback button (💬) in the bottom-right corner of any page. Select "Report an Issue" and describe what happened.' },
      { q: 'How do I contact support?', a: 'You can reach us at support@tissca.com or use the contact form on the Contact page. We aim to respond within 24 hours.' },
    ],
  },
];

/* ─── Accordion Component ─── */

function Accordion({ items, categoryTitle }: { items: FAQItem[]; categoryTitle?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => {
                const opening = !isOpen;
                setOpenIndex(opening ? i : null);
                if (opening) {
                  trackEvent('faq_open', '/support', { eventLabel: item.q, metadata: { ctaName: 'faq_question', faqCategory: categoryTitle || 'unknown', sourcePage: '/support', sourceSection: 'faq_accordion', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } });
                }
              }}
              className="w-full flex items-center justify-between py-4 px-1 text-left text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors"
            >
              <span>{item.q}</span>
              <span className={`ml-4 text-lg transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            {isOpen && (
              <div className="pb-4 px-1 text-sm text-slate-600 leading-relaxed">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ─── */

export default function SupportClient() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">How can we help?</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Browse our FAQ below or reach out directly — we are here to help.
          </p>
        </div>
      </section>

      {/* Category Grid */}
      <section className="bg-[#f6f7f9] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {FAQ_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => {
                  const opening = activeCategory !== i;
                  setActiveCategory(opening ? i : null);
                  if (opening) {
                    trackEvent('faq_open', '/support', { eventLabel: cat.title, metadata: { ctaName: 'faq_category', faqCategory: cat.title, sourcePage: '/support', sourceSection: 'category_grid', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } });
                  }
                }}
                className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
                  activeCategory === i
                    ? 'border-blue-400 bg-white shadow-md ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="mt-2 text-sm font-semibold text-slate-800">{cat.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cat.items.length} questions</p>
              </button>
            ))}
          </div>

          {/* Active Category FAQ */}
          {activeCategory !== null && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{FAQ_CATEGORIES[activeCategory].icon}</span>
                <h2 className="text-xl font-bold text-slate-900">{FAQ_CATEGORIES[activeCategory].title}</h2>
              </div>
              <Accordion items={FAQ_CATEGORIES[activeCategory].items} categoryTitle={FAQ_CATEGORIES[activeCategory].title} />
            </div>
          )}

          {/* All FAQs (when no category selected) */}
          {activeCategory === null && (
            <div className="space-y-8">
              {FAQ_CATEGORIES.map((cat, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="text-xl font-bold text-slate-900">{cat.title}</h2>
                  </div>
                  <Accordion items={cat.items} categoryTitle={cat.title} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-[#f6f7f9] to-white py-12 md:py-16 border-t border-slate-200/60">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Still need help?</h2>
          <p className="text-slate-500 mb-6">
            Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              onClick={() => trackEvent('support_open', '/support', { metadata: { ctaName: 'contact_us', sourcePage: '/support', sourceSection: 'support_cta', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              Contact Us
            </Link>
            <a
              href={`mailto:${brandConfig.contact.supportEmail}`}
              onClick={() => trackEvent('support_open', '/support', { metadata: { ctaName: 'email_support', sourcePage: '/support', sourceSection: 'support_cta', locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined } })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              ✉️ {brandConfig.contact.supportEmail}
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            You can also use the 💬 feedback button on any page to report issues or suggest improvements.
          </p>
        </div>
      </section>
    </>
  );
}
