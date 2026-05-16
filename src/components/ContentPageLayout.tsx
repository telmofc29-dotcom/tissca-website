/**
 * Content Page Template v2.0 (Premium Light Theme)
 * =================================================
 * Reusable template for content-heavy pages (About, Contact, Terms, Privacy).
 * Off-white background with soft header — matches SaaS premium aesthetic.
 *
 * VERSION HISTORY:
 * - v1.0.0: Dark header + unstyled content
 * - v2.0.0 (2026-03-25): Off-white bg, soft slate header, light prose, SaaS polish
 */

import { Metadata } from 'next';

export interface ContentPageProps {
  title: string;
  description: string;
  slug: string;
  metadata?: Metadata;
}

export function ContentPageLayout({
  title,
  description,
  children,
}: ContentPageProps & { children: React.ReactNode }) {
  return (
    <>
      {/* Page Header — soft light gradient */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{title}</h1>
          <p className="text-lg text-slate-500 max-w-2xl">{description}</p>
        </div>
      </section>

      {/* Main Content — off-white background, readable prose */}
      <section className="bg-[#f6f7f9] py-12 md:py-16 text-slate-600">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <div className="max-w-none
            [&_h2]:text-slate-900 [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:mb-3 [&_h2]:mt-0
            [&_h3]:text-slate-900 [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mb-2
            [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
            [&_li]:text-slate-600 [&_li]:leading-relaxed
            [&_ul]:mb-3 [&_ol]:mb-3
            [&_a]:text-blue-600 hover:[&_a]:text-blue-700 [&_a]:no-underline
            [&_strong]:text-slate-800"
          >
            {children}
          </div>
        </div>
      </section>
    </>
  );
}
