import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UK Regional Construction Pricing - Regional Price Variations | BUILDR',
  description: 'Understand how construction costs vary across UK regions. London, South East, regional differences explained.',
  keywords: 'UK construction pricing, regional pricing, London construction costs, regional variations',
};

export default function UKRegionalPricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">UK Regional Construction Pricing</h1>
          <p className="text-lg text-slate-200">
            How construction costs vary significantly across the UK. Understanding regional pricing factors.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">Regional Price Variations</h2>
          <p className="text-slate-700 mb-6">
            Construction costs in the UK vary dramatically by region, primarily due to living costs, competition, and contractor availability. A £10,000 project in Yorkshire might cost £13,000-15,000 in London.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Price Multipliers by Region</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-red-400 p-4 bg-red-50">
              <h3 className="font-bold text-lg mb-2">London & Central SE (Multiplier: 1.35×)</h3>
              <p className="text-slate-700 mb-3">Most expensive region. High living costs, high rents, premium labour rates.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>Painter daily rate:</strong> £180-240 vs £100-150 in north</p>
                <p><strong>Plumber daily rate:</strong> £200-280 vs £130-180 in north</p>
                <p><strong>Electrician daily rate:</strong> £200-280 vs £140-200 in north</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Example: £10,000 project costs £13,500 in London</em></p>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold text-lg mb-2">South East (Sussex, Kent, Surrey) (Multiplier: 1.20×)</h3>
              <p className="text-slate-700 mb-3">Commuter belt. High housing costs, good labour availability, professional rates.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>General multiplier:</strong> 15-25% above national average</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Example: £10,000 project costs £12,000 in South East</em></p>
            </div>

            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold text-lg mb-2">National Baseline (South Midlands to Midlands) (Multiplier: 1.0×)</h3>
              <p className="text-slate-700 mb-3">Birmingham, Coventry, Nottingham area. Standard UK pricing reference point.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>Painter daily rate:</strong> £120-160</p>
                <p><strong>Plumber daily rate:</strong> £140-190</p>
                <p><strong>Electrician daily rate:</strong> £150-210</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>This is the baseline—all other regions compared to this.</em></p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">North (Manchester, Leeds, Newcastle) (Multiplier: 0.95×)</h3>
              <p className="text-slate-700 mb-3">Lower living costs, healthy competition, reasonable labour availability.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>General multiplier:</strong> 0-5% below national average</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Example: £10,000 project costs £9,500 in Manchester</em></p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-2">Scotland (Edinburgh, Glasgow) (Multiplier: 1.02×)</h3>
              <p className="text-slate-700 mb-3">Slightly lower than England on average, but variable by city/area.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>General multiplier:</strong> 0-5% variance (Edinburgh slightly higher than Glasgow)</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Building Standards slightly different—may affect some work</em></p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold text-lg mb-2">Wales (Multiplier: 0.95×)</h3>
              <p className="text-slate-700 mb-3">Generally 5-10% cheaper than English baseline.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>General multiplier:</strong> 0-10% below national average</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Rural areas typically cheaper than Cardiff</em></p>
            </div>

            <div className="border-l-4 border-pink-400 p-4 bg-pink-50">
              <h3 className="font-bold text-lg mb-2">Rural/Remote Areas (Multiplier: 1.05-1.15×)</h3>
              <p className="text-slate-700 mb-3">Scottish Highlands, remote Wales, rural areas. Limited contractor availability = higher costs.</p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>General multiplier:</strong> 5-15% above baseline (due to travel costs)</p>
                <p><strong>Additional factor:</strong> Delivery charges for materials, longer travel time, site accessibility</p>
              </div>
              <p className="text-sm text-slate-600 mt-3"><em>Fewer contractors means premium pricing and longer waiting times</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Why Costs Vary by Region</h2>
          
          <div className="space-y-4 text-slate-700 mb-6">
            <div className="border-l-4 border-blue-400 pl-4">
              <p><strong>1. Living costs:</strong> London workers need higher wages to afford housing. This flows into labour rates.</p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <p><strong>2. Labour availability:</strong> Competitive regions (lots of contractors) = lower prices. Remote areas = premium rates.</p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <p><strong>3. Competition:</strong> More contractors = competitive pricing. Monopoly = higher costs.</p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <p><strong>4. Material transport:</strong> Remote areas pay premium for delivery. Materials marked up for travel cost.</p>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <p><strong>5. Property values:</strong> High property value areas have higher contractor rates (protecting their profit margins).</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: £5,000 Kitchen Renovation</h2>

          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2 text-left">Region</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Multiplier</th>
                  <th className="border border-slate-300 px-4 py-2 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>London</strong></td>
                  <td className="border border-slate-300 px-4 py-2">1.35×</td>
                  <td className="border border-slate-300 px-4 py-2 text-right">£6,750</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2"><strong>South East</strong></td>
                  <td className="border border-slate-300 px-4 py-2">1.20×</td>
                  <td className="border border-slate-300 px-4 py-2 text-right">£6,000</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>Midlands (Baseline)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">1.0×</td>
                  <td className="border border-slate-300 px-4 py-2 text-right">£5,000</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-4 py-2"><strong>North (Manchester)</strong></td>
                  <td className="border border-slate-300 px-4 py-2">0.95×</td>
                  <td className="border border-slate-300 px-4 py-2 text-right">£4,750</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2"><strong>Wales</strong></td>
                  <td className="border border-slate-300 px-4 py-2">0.95×</td>
                  <td className="border border-slate-300 px-4 py-2 text-right">£4,750</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Find Contractors in Your Region</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Local recommendations:</strong> Friends, family, neighbours—word of mouth is region-specific</li>
            <li><strong>Local directories:</strong> Yellow Pages, local business registries</li>
            <li><strong>Checkatrade, Trustmark, MyBuilder:</strong> Region-filtered results, local ratings</li>
            <li><strong>Trade associations:</strong> Federation of Master Builders, Guild of Master Craftsmen</li>
            <li><strong>Regional marketing:</strong> Many contractors advertise locally on Facebook/Google</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags When Comparing Regional Prices</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Quotes from different regions are not directly comparable:</strong> Region affects pricing fundamentally</li>
            <li><strong>Very cheap local quotes may indicate inexperienced contractors:</strong> Check credentials carefully</li>
            <li><strong>Expensive doesn't always mean better:</strong> London rates high, but not always better quality</li>
            <li><strong>Compare local quotes, not national ones:</strong> Get 3 quotes in your area for fair comparison</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Regional Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-slate-700">
              ✓ <strong>UK Pricing (This page)</strong>
            </div>
            <Link href="/regional-pricing/us" className="text-blue-600 hover:text-blue-700 font-semibold">
              → US Pricing (Coming Soon)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
