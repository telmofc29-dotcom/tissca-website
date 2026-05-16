// src/app/(public)/about/AboutClient.tsx
// Client component wrapper for translated About page content.

'use client';

import { useLanguage } from '@/i18n';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import { FadeIn } from '@/components/FadeIn';

export default function AboutClient() {
  const { t } = useLanguage();

  return (
    <ContentPageLayout
      title={t.about.title}
      description={t.about.description}
      slug="about"
    >
      <div className="space-y-10">
        <FadeIn>
          <section>
            <h2>{t.about.whatIs.heading}</h2>
            <p>{t.about.whatIs.p1}</p>
            <p>{t.about.whatIs.p2}</p>
          </section>
        </FadeIn>

        <FadeIn delay={80}>
          <section>
            <h2>{t.about.whatDoes.heading}</h2>
            <ul className="list-disc list-inside space-y-2">
              {t.about.whatDoes.items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>
        </FadeIn>

        <FadeIn delay={160}>
          <section>
            <h2>{t.about.whoFor.heading}</h2>
            <p>{t.about.whoFor.text}</p>
          </section>
        </FadeIn>

        <FadeIn delay={240}>
          <section>
            <h2>{t.about.approach.heading}</h2>
            <ul className="list-disc list-inside space-y-2">
              {t.about.approach.items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>
        </FadeIn>

        <FadeIn delay={320}>
          <section>
            <h2>{t.about.contact.heading}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.about.contact.text }} />
          </section>
        </FadeIn>
      </div>
    </ContentPageLayout>
  );
}
