import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tiling Costs UK - Labour Rates & Material Expenses | BUILDR',
  description: 'Understand UK tiling costs. Labour rates (£100-220/day), tile material costs, and complexity factors explained.',
  keywords: 'tiling costs, UK tiling rates, tile labour, bathroom tiles, kitchen tiles',
};

export default function TilingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Tiling Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK tiling labour rates, tile material costs, and what affects pricing.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Tiling Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £80-£130/day</p>
              <p className="text-sm text-slate-700">Inexperienced tillers. Straight cuts only, limited pattern options.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £140-£200/day</p>
              <p className="text-sm text-slate-700">Experienced tillers. Clean grouting, proper adhesive technique, handles patterns.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £210-£280+/day</p>
              <p className="text-sm text-slate-700">Specialist tillers. Complex patterns, natural stone, mosaics, finishes perfectly.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Tile Material Costs (per m²)</h2>
          <div className="space-y-2 text-slate-700 mb-6">
            <p><strong>Budget ceramic:</strong> £15-30</p>
            <p><strong>Standard ceramic:</strong> £30-60</p>
            <p><strong>Porcelain:</strong> £40-100</p>
            <p><strong>Natural stone (slate, marble):</strong> £80-300+</p>
            <p><strong>Adhesive & grout (per m²):</strong> £3-8</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Complexity Factors</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Straight layout:</strong> Standard rate</li>
            <li><strong>Pattern/mosaic:</strong> +20-50% labour (requires more cuts and planning)</li>
            <li><strong>Large format tiles:</strong> Specialist rate (200+ labour)</li>
            <li><strong>Difficult substrate:</strong> +15-30% (curved walls, uneven surfaces)</li>
            <li><strong>Waste factor:</strong> 10-15% extra materials for cuts and breakages</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: Small Bathroom Wall (5m²)</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Budget tiles (5.5m² with waste):</span><span>£100</span></div>
                <div className="flex justify-between"><span>Adhesive & grout:</span><span>£30</span></div>
                <div className="flex justify-between"><span>Labour (1 day):</span><span>£100</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£230</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality ceramic (5.5m²):</span><span>£240</span></div>
                <div className="flex justify-between"><span>Premium adhesive & grout:</span><span>£40</span></div>
                <div className="flex justify-between"><span>Labour (1.5 days):</span><span>£225</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£505</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Option (Patterned)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium porcelain (6m²):</span><span>£480</span></div>
                <div className="flex justify-between"><span>Premium adhesive & grout:</span><span>£50</span></div>
                <div className="flex justify-between"><span>Labour (2 days, pattern work):</span><span>£400</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£930</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Substrate prep:</strong> Uneven walls need levelling (adds cost/time)</li>
            <li><strong>Existing tile removal:</strong> If replacing old tiles, removal adds 1-2 days labour</li>
            <li><strong>Sealing:</strong> Natural stone requires sealing (additional £50-200)</li>
            <li><strong>Waterproofing:</strong> Bathrooms need proper waterproofing (adds £200-500)</li>
            <li><strong>Corner/edge finishing:</strong> Trim pieces and edge finishes add cost</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"All tiles are the same cost":</strong> Massive variation—£15-300 per m² difference</li>
            <li><strong>"Grout is included":</strong> Usually separate cost. Waterproofing definitely separate</li>
            <li><strong>"Patterns don't cost more":</strong> Patterns require 2-3x labour and waste more tile</li>
            <li><strong>"Natural stone is just tile":</strong> Requires specialist skill and sealing—premium pricing justified</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't specify tile type/grade</li>
            <li>No mention of waterproofing (essential in bathrooms)</li>
            <li>Labour rate seems too low for tiling (under £100/day is risky)</li>
            <li>No mention of substrate condition/prep</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/labour-costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Costs Guide
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
