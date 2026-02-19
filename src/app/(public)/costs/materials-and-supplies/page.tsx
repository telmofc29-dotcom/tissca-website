import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Materials & Supplies Costs - Quality Tiers Explained | TISSCA',
  description: 'Understand construction materials costs. Quality tiers, waste factors, and how to get value for money in UK construction.',
  keywords: 'materials cost, construction materials, quality grades, waste factor',
};

export default function MaterialsAndSuppliesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Materials & Supplies Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding material quality, waste factors, and how to get real value in construction.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Material Costs?</h2>
          <p className="text-slate-700 mb-6">
            Materials are the physical products used in construction: paint, tiles, plasterboard, flooring, electrical wire, pipes, fixtures, and fittings. Material costs are typically 30-40% of total project cost (the rest being labour and overheads).
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Quality Tiers</h2>
          <p className="text-slate-700 mb-6">
            Materials come in three main quality tiers:
          </p>

          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h3 className="font-bold text-lg mb-2">Budget Grade</h3>
              <p className="text-slate-700">
                <strong>Examples:</strong> Basic emulsion paint, cheap ceramic tiles, standard plasterboard, economy fixtures
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Characteristics:</strong> Lower durability, limited colour/finish options, may show wear quickly, less aesthetically refined
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Lifespan:</strong> 5-10 years for soft goods (paint, wallpaper), 10-20 years for hard goods
              </p>
              <p className="text-slate-700 mt-2">
                <strong>When to use:</strong> Rental properties, temporary installations, tight budgets
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h3 className="font-bold text-lg mb-2">Standard/Professional Grade</h3>
              <p className="text-slate-700">
                <strong>Examples:</strong> Quality acrylic paint (Dulux, Crown), porcelain tiles, standard plasterboard, branded fixtures
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Characteristics:</strong> Good durability, wide colour range, professional finish, decent reputation
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Lifespan:</strong> 10-15 years for soft goods, 15-30 years for hard goods
              </p>
              <p className="text-slate-700 mt-2">
                <strong>When to use:</strong> Most residential projects, owner-occupied homes, commercial spaces
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <h3 className="font-bold text-lg mb-2">Premium Grade</h3>
              <p className="text-slate-700">
                <strong>Examples:</strong> Premium paint (Farrow & Ball), natural stone, luxury tiles, high-end fixtures, bespoke finishes
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Characteristics:</strong> Superior durability, extensive options, premium aesthetics, superior customer service
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Lifespan:</strong> 15-20 years for soft goods, 20-50+ years for hard goods
              </p>
              <p className="text-slate-700 mt-2">
                <strong>When to use:</strong> High-value homes, statement rooms, projects where durability matters long-term
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Waste Factor</h2>
          <p className="text-slate-700 mb-4">
            Professional quotes include a waste factor—extra material to account for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Cutting waste:</strong> Tiles and flooring need to be cut to fit. Typical waste: 10-15%</li>
            <li><strong>Breakages:</strong> Some material breaks during transport or installation. Typical waste: 2-5%</li>
            <li><strong>Pattern matching:</strong> Wallpaper and some tiles have patterns that require extra material. Typical waste: 10-20%</li>
            <li><strong>Colour matching:</strong> Paints and stains may need mixing or correction. Typical waste: 5-10%</li>
            <li><strong>Future repairs:</strong> Keeping extra material for patch repairs. Typical waste: 5-10%</li>
          </ul>
          <p className="text-slate-700 mb-6">
            <strong>Total typical waste: 10-20%</strong>. This isn't greed—it's realistic. Professional quotes will include this explicitly.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real UK Material Costs</h2>
          <p className="text-slate-700 mb-4">
            Example material costs for common projects:
          </p>

          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2 text-left">Material</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Budget</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Standard</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>Paint (per litre)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£6-10</td>
                  <td className="border border-slate-300 px-4 py-2">£15-25</td>
                  <td className="border border-slate-300 px-4 py-2">£30-80</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2"><strong>Ceramic tiles (per m²)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£15-30</td>
                  <td className="border border-slate-300 px-4 py-2">£30-60</td>
                  <td className="border border-slate-300 px-4 py-2">£80-200+</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>Porcelain tiles (per m²)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£20-40</td>
                  <td className="border border-slate-300 px-4 py-2">£40-80</td>
                  <td className="border border-slate-300 px-4 py-2">£100-300+</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2"><strong>Laminate flooring (per m²)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£4-8</td>
                  <td className="border border-slate-300 px-4 py-2">£8-15</td>
                  <td className="border border-slate-300 px-4 py-2">£15-30</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>Wooden flooring (per m²)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£20-40</td>
                  <td className="border border-slate-300 px-4 py-2">£40-80</td>
                  <td className="border border-slate-300 px-4 py-2">£80-200+</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2"><strong>Plasterboard (per sheet)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">£6-10</td>
                  <td className="border border-slate-300 px-4 py-2">£10-15</td>
                  <td className="border border-slate-300 px-4 py-2">£15-25</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Get Value</h2>
          <div className="space-y-4 text-slate-700">
            <p>
              <strong>1. Understand why price varies:</strong> Better materials last longer and look better. The upfront cost is higher, but the cost-per-year is often lower.
            </p>
            <p>
              <strong>2. Professional recommendations:</strong> Your tradesperson should recommend materials based on the project's requirements and longevity goals—not just cost.
            </p>
            <p>
              <strong>3. Get material specifications in writing:</strong> Quotes should specify brand, grade, and quantity. "Paint" is too vague—you need "Dulux Trade, eggshell, 5 litres, colour ref XXX."
            </p>
            <p>
              <strong>4. Avoid false economy:</strong> Saving £200 on paint might result in a project that looks cheap in 3 years. Budget-tier materials show their cost quickly.
            </p>
            <p>
              <strong>5. Discuss lifecycle:</strong> How long will you be in the property? Will the material see heavy use? This determines appropriate quality tier.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Quotes with no material specification:</strong> You don't know what you're getting</li>
            <li><strong>Suspiciously cheap materials:</strong> Budget doesn't necessarily mean poor quality, but very cheap usually does</li>
            <li><strong>No waste factor included:</strong> Unrealistic quotes often omit waste</li>
            <li><strong>Generic "paint and tiles":</strong> Professional quotes specify brands and grades</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/labour-costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Costs
            </Link>
            <Link href="/costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Back to All Cost Categories
            </Link>
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Cost Calculators
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
