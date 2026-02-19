/**
 * page.tsx v1.0.1 (TISSCA Home Page Metadata + Legal/Support Links)
 * ================================================================
 * ✅ NOTES (LOCKED):
 * - Minimal, safe improvements only.
 * - Keep existing layout/content intact.
 * - Add ONLY what’s needed for:
 *   1) clearer SEO metadata (title uses tagline)
 *   2) professional footer links to /privacy, /terms, /support
 *   3) ensure baseUrl/canonical alignment via config (handled in layout/metadata)
 *
 * WHY v1.0.1:
 * - Home metadata should match brand default ("TISSCA - The Construction Authority")
 * - Add legal/support links now because we’re about to host real pages:
 *   /privacy, /terms, /support, and /auth/verified (verification UX fix)
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial file (as provided)
 * - v1.0.1 (2026-02-04): Metadata polish + add minimal footer links
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: `${brandConfig.displayName} - ${brandConfig.tagline}`,
  description: brandConfig.description,
};

export default function RootPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary to-secondary text-white py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {brandConfig.displayName}
            </h1>
            <p className="text-xl text-gray-200 mb-4">{brandConfig.tagline}</p>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              The global reference for construction, renovations, workmanship standards,
              and calculations. Learn how to do it right, spot what&apos;s wrong, and avoid
              costly mistakes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/workmanship"
                className="inline-block px-6 py-3 bg-accent hover:bg-blue-600 text-white font-semibold rounded transition-colors"
              >
                Is This Done Properly?
              </Link>
              <Link
                href="/calculators"
                className="inline-block px-6 py-3 bg-white text-primary hover:bg-gray-100 font-semibold rounded transition-colors"
              >
                Try Calculators
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Sections Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Explore {brandConfig.displayName}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Is This Done Properly? */}
            <Link
              href="/workmanship"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                Is This Done Properly?
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Learn to identify construction defects, compare good vs bad workmanship,
                understand failure causes, and know what it costs to fix mistakes.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>

            {/* Card 2: How Much Should This Cost? */}
            <Link
              href="/construction-costs"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                How Much Should This Cost?
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Honest construction cost breakdowns covering labour, materials, regional
                pricing logic, and professional vs budget comparisons.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>

            {/* Card 3: Avoid Scams & Mistakes */}
            <Link
              href="/avoid-scams"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                Avoid Scams & Costly Mistakes
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Recognize builder red flags, understand contract tricks, spot fake
                guarantees, and protect yourself from common homeowner traps.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>

            {/* Card 4: Pro Calculators */}
            <Link
              href="/calculators"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                Pro Calculators
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Quick, accurate calculations for materials, labour, and costs across
                dozens of construction types and scenarios.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Better?</h2>
          <p className="text-lg text-gray-200 mb-6">
            Join thousands of homeowners and professionals using {brandConfig.displayName}.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-accent hover:bg-blue-600 text-white font-semibold rounded transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer (Minimal legal/support presence) */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-sm text-secondary">
            © {brandConfig.year} {brandConfig.companyName}. All rights reserved.
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/privacy" className="text-secondary hover:text-primary">
              Privacy
            </Link>
            <Link href="/terms" className="text-secondary hover:text-primary">
              Terms
            </Link>
            <Link href="/support" className="text-secondary hover:text-primary">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
