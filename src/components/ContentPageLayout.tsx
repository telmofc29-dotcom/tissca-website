/**
 * Content Page Template
 * ======================
 * Reusable template for content-heavy pages.
 * Supports: text, images, videos, tables, callout boxes, warnings.
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
      {/* Page Header */}
      <section className="bg-secondary text-white py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          <p className="text-lg text-gray-200 max-w-2xl">{description}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="prose prose-lg max-w-none">{children}</div>
        </div>
      </section>
    </>
  );
}
