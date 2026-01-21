import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'US Construction Pricing - Coming Soon | BUILDR',
  description: 'US construction pricing guide coming soon. Different pricing system, regional variations, and contractor rates.',
  keywords: 'US construction costs, American construction pricing, coming soon',
};

export default function USRegionalPricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">US Construction Pricing</h1>
          <p className="text-lg text-slate-200">
            Coming soon—comprehensive guide to US construction costs, regional variations, and contractor rates.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">US Construction Pricing Guide - In Development</h2>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <p className="text-slate-700 mb-4">
              We're currently developing a comprehensive guide to US construction pricing. This will cover:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Dollar-based pricing across all states</li>
              <li>Regional cost variations (California, Texas, Florida, Northeast, Midwest)</li>
              <li>Contractor labour rates by trade and region</li>
              <li>Material cost differences from UK</li>
              <li>Permitting and compliance costs in the US</li>
              <li>How to find contractors and assess value</li>
              <li>Common pricing misconceptions in US construction</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Expected Content</h2>
          <div className="space-y-4 text-slate-700 mb-6">
            <p>
              <strong>State-by-state pricing:</strong> Comprehensive guides for major states including California, Texas, Florida, New York, and more.
            </p>
            <p>
              <strong>Cost comparisons:</strong> How US pricing compares to UK construction costs (different units, labour structures, regulations).
            </p>
            <p>
              <strong>Contractor licensing:</strong> Understanding US contractor licensing, bonding, and insurance requirements.
            </p>
            <p>
              <strong>Permit costs & timelines:</strong> How building permits work in the US and typical approval timelines.
            </p>
            <p>
              <strong>Trade-specific rates:</strong> Painter, plumber, electrician rates in different regions.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Timeline</h2>
          <p className="text-slate-700 mb-6">
            This guide is in active development. We expect to publish comprehensive US pricing coverage by <strong>Q2 2025</strong>.
          </p>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-6 my-8">
            <h3 className="font-bold text-lg mb-2">Sign Up for Updates</h3>
            <p className="text-slate-700 mb-4">
              Want to be notified when the US pricing guide launches? We'll email you with the complete guide.
            </p>
            <p className="text-sm text-slate-600">
              <em>Coming soon: Email subscription form to receive updates</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">In the Meantime</h2>
          <p className="text-slate-700 mb-4">
            Check out our <Link href="/regional-pricing/uk" className="text-blue-600 hover:text-blue-700 font-semibold">UK pricing guide</Link> for comprehensive construction cost information. While prices are different, the principles of fair construction pricing are universal.
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
