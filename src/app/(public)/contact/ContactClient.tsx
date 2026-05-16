// src/app/(public)/contact/ContactClient.tsx
// Client component wrapper for translated Contact page content.

'use client';

import { useLanguage } from '@/i18n';
import { ContactFormSection } from './ContactFormSection';
import { FadeIn } from '@/components/FadeIn';

export default function ContactClient() {
  const { t } = useLanguage();

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <FadeIn>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{t.contact.title}</h1>
            <p className="text-lg text-slate-500 max-w-2xl">
              {t.contact.description}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Form + info */}
      <section className="bg-[#f6f7f9] py-12 md:py-16">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Form card */}
            <div className="md:col-span-3">
              <FadeIn>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                  <ContactFormSection />
                </div>
              </FadeIn>
            </div>

            {/* Side info */}
            <div className="md:col-span-2 space-y-6">
              <FadeIn delay={100}>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    {t.contact.sidebar.emailLabel}
                  </h3>
                  <a
                    href="mailto:support@tissca.com"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm no-underline"
                  >
                    support@tissca.com
                  </a>
                </div>
              </FadeIn>

              <FadeIn delay={180}>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    {t.contact.sidebar.responseLabel}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t.contact.sidebar.responseText}
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={260}>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    {t.contact.sidebar.helpLabel}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t.contact.sidebar.helpText}
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
