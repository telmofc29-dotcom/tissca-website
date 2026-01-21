import Link from 'next/link';
import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: brandConfig.displayName,
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
              and calculations. Learn how to do it right, spot what's wrong, and avoid costly mistakes.
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
                Honest construction cost breakdowns covering labour, materials,
                regional pricing logic, and professional vs budget comparisons.
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
                Recognize builder red flags, understand contract tricks, spot fake guarantees,
                and protect yourself from common homeowner traps.
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
            href="/sign-up"
            className="inline-block px-8 py-3 bg-accent hover:bg-blue-600 text-white font-semibold rounded transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
