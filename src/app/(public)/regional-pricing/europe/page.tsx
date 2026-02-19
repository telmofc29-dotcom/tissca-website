import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'European Construction Pricing - Coming Soon | TISSCA',
  description: 'European construction pricing guide coming soon. Covering main European markets and regional variations.',
  keywords: 'European construction costs, European pricing, construction pricing Europe',
};

export default function EuropeRegionalPricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">European Construction Pricing</h1>
          <p className="text-lg text-slate-200">
            Coming soon—pricing guide to major European construction markets and regional variations.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">European Construction Pricing Guide - In Development</h2>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <p className="text-slate-700 mb-4">
              We're developing pricing guides for major European construction markets. Initial focus includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Germany (competitive market, high standards)</li>
              <li>France (Paris vs regional pricing)</li>
              <li>Netherlands (dense urban construction)</li>
              <li>Spain (Mediterranean markets)</li>
              <li>Italy (complex permitting, regional variation)</li>
              <li>Belgium & Nordic countries</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Expected Coverage</h2>
          <div className="space-y-4 text-slate-700 mb-6">
            <p>
              <strong>Currency-based pricing:</strong> Euro-denominated costs with conversion notes.
            </p>
            <p>
              <strong>Building regulations by country:</strong> Each market has different standards and requirements.
            </p>
            <p>
              <strong>Labour costs & contractor licensing:</strong> How contractors are regulated differently across Europe.
            </p>
            <p>
              <strong>Material cost variations:</strong> How availability and import duties affect material costs.
            </p>
            <p>
              <strong>Typical project costs:</strong> Kitchen, bathroom, and renovation costs by country.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Why European Pricing Varies</h2>
          <p className="text-slate-700 mb-4">
            Unlike the UK or US with relatively uniform regulations, Europe has significant variation:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Building codes:</strong> Each country has different standards (Germany strict, Italy complex)</li>
            <li><strong>Permitting:</strong> Some countries very bureaucratic, others simpler</li>
            <li><strong>Labour costs:</strong> High in Nordic countries, lower in Southern Europe</li>
            <li><strong>Material availability:</strong> Import costs affect pricing significantly</li>
            <li><strong>VAT differences:</strong> Sales tax varies 16-25% across EU</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Timeline</h2>
          <p className="text-slate-700 mb-6">
            This guide is in early development. We expect to publish comprehensive European pricing coverage by <strong>Q3 2025</strong>, starting with major markets (Germany, France, Netherlands, Spain).
          </p>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-6 my-8">
            <h3 className="font-bold text-lg mb-2">Sign Up for Updates</h3>
            <p className="text-slate-700 mb-4">
              Interested in European construction pricing? We'll notify you when guides for specific countries launch.
            </p>
            <p className="text-sm text-slate-600">
              <em>Coming soon: Email subscription form to receive updates by country</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">In the Meantime</h2>
          <p className="text-slate-700 mb-4">
            Explore our <Link href="/regional-pricing/uk" className="text-blue-600 hover:text-blue-700 font-semibold">UK pricing guide</Link> for comprehensive construction cost information. The principles of fair construction pricing and budget planning apply across all European markets.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/regional-pricing/uk" className="text-blue-600 hover:text-blue-700 font-semibold">
              → UK Pricing
            </Link>
            <Link href="/costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Back to All Costs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
