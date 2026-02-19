import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calculators',
  description: 'Professional construction calculators for materials, labour, and quantities.',
};

export default function CalculatorsPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-secondary text-white py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <h1 className="text-4xl font-bold mb-4">Pro Calculators</h1>
          <p className="text-lg text-gray-200 max-w-2xl">
            Accurate calculations for materials, labour, and project planning.
          </p>
        </div>
      </section>

      {/* Calculators Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { name: 'Tiling Calculator', slug: 'tiling' },
              { name: 'Painting Calculator', slug: 'painting' },
              { name: 'Plastering Calculator', slug: 'plastering' },
              { name: 'Flooring Calculator', slug: 'flooring' },
              { name: 'Concrete Calculator', slug: 'concrete' },
              { name: 'Insulation Calculator', slug: 'insulation' },
              { name: 'Brick & Block Calculator', slug: 'brick-block' },
              { name: 'Labour Estimator', slug: 'labour' },
              { name: 'Material Waste Estimator', slug: 'waste' },
            ].map((calc) => (
              <div
                key={calc.slug}
                className="p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-accent transition-all"
              >
                <h3 className="text-xl font-bold mb-2">{calc.name}</h3>
                <p className="text-secondary text-sm mb-4">
                  Professional estimates and material calculations.
                </p>
                <a
                  href={`/calculators/${calc.slug}`}
                  className="inline-block px-4 py-2 text-accent font-semibold hover:text-blue-700 transition-colors"
                >
                  Open Calculator →
                </a>
              </div>
            ))}
          </div>

          <div className="bg-light p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-secondary">
              Individual calculator pages with detailed explanations, examples, and step-by-step guidance
              for each calculation type.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
