import Link from 'next/link';
import { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: brandConfig.displayName,
  description: brandConfig.description,
};

export default function HomePage() {
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
                Tiling, painting, plastering, flooring, concrete, insulation, and more.
                Accurate material and labour estimates for every job.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>

            {/* Card 5: How To Do It Properly */}
            <Link
              href="/guides"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                How To Do It Properly
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Step-by-step instructions, videos, tools lists, common mistakes, safety notes,
                and tips from professionals for every renovation task.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>

            {/* Card 6: Construction Education */}
            <Link
              href="/education"
              className="group p-8 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
            >
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                Construction Education
              </h3>
              <p className="text-secondary mb-4 leading-relaxed">
                Learn renovation sequences, understand materials, master best practices,
                and follow professional standards that guarantee quality work.
              </p>
              <span className="text-accent font-semibold">Explore →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-light py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-8">Why {brandConfig.displayName}?</h2>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="text-accent font-bold text-xl flex-shrink-0">✓</span>
                <p>
                  <strong>Education-first:</strong> We teach the truth about construction,
                  not shortcuts or sales pitches.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-accent font-bold text-xl flex-shrink-0">✓</span>
                <p>
                  <strong>Honest standards:</strong> Built on professional construction standards,
                  building codes, and workmanship best practices.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-accent font-bold text-xl flex-shrink-0">✓</span>
                <p>
                  <strong>Accessible to all:</strong> Whether you're a homeowner, tradesperson,
                  or student, we make construction knowledge clear and practical.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-accent font-bold text-xl flex-shrink-0">✓</span>
                <p>
                  <strong>Designed to scale:</strong> A long-term digital asset built to become
                  the global reference for construction authority.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
