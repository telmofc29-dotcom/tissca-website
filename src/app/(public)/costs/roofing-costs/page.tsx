import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roofing Costs UK - Roofer Labour Rates & Material Expenses | TISSCA',
  description: 'Understand UK roofing costs. Roofer labour rates (£120-220/day), material costs, and what affects pricing.',
  keywords: 'roofing costs, UK roofer rates, roof repairs, roof replacement, roofing materials',
};

export default function RoofingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Roofing Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK roofing labour rates, material costs, and factors affecting pricing.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Roofer Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £100-£150/day</p>
              <p className="text-sm text-slate-700">Apprentices/inexperienced. Basic repairs, may lack technique.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £160-£220/day</p>
              <p className="text-sm text-slate-700">Experienced roofers. All work to standard, good safety practices.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Specialist/Master: £230-£300+/day</p>
              <p className="text-sm text-slate-700">Lead work, slate, listed building specialists. Premium expertise.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Roofing Material Costs (per m²)</h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Asphalt Shingles</h3>
              <p className="text-sm text-slate-700"><strong>Material:</strong> £15-30/m²</p>
              <p className="text-sm text-slate-700"><strong>Labour:</strong> £40-70/m²</p>
              <p className="text-sm text-slate-600 mt-2"><em>Budget option. 15-20 year lifespan.</em></p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Interlocking Tiles</h3>
              <p className="text-sm text-slate-700"><strong>Material:</strong> £25-50/m²</p>
              <p className="text-sm text-slate-700"><strong>Labour:</strong> £50-80/m²</p>
              <p className="text-sm text-slate-600 mt-2"><em>Most common in UK. 30-40 year lifespan.</em></p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">Slate Tiles</h3>
              <p className="text-sm text-slate-700"><strong>Material:</strong> £50-150+/m²</p>
              <p className="text-sm text-slate-700"><strong>Labour:</strong> £80-150/m²</p>
              <p className="text-sm text-slate-600 mt-2"><em>Premium option. 50-100+ year lifespan.</em></p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Flat Roof (EPDM Rubber)</h3>
              <p className="text-sm text-slate-700"><strong>Material:</strong> £15-30/m²</p>
              <p className="text-sm text-slate-700"><strong>Labour:</strong> £40-60/m²</p>
              <p className="text-sm text-slate-600 mt-2"><em>For flat sections. 20-30 year lifespan.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: 80m² Roof Replacement</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Shingles</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Shingles (80m² + waste):</span><span>£1,600</span></div>
                <div className="flex justify-between"><span>Labour (4 days):</span><span>£600</span></div>
                <div className="flex justify-between"><span>Debris removal:</span><span>£200</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£2,400</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Interlocking Tiles</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Tiles (88m² + waste):</span><span>£2,640</span></div>
                <div className="flex justify-between"><span>Underlayment:</span><span>£300</span></div>
                <div className="flex justify-between"><span>Labour (5 days):</span><span>£900</span></div>
                <div className="flex justify-between"><span>Old roof removal:</span><span>£400</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£4,240</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Slate Tiles</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Slate tiles (88m² + waste):</span><span>£6,600</span></div>
                <div className="flex justify-between"><span>Premium underlayment:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Labour (6-7 days, specialist):</span><span>£1,600</span></div>
                <div className="flex justify-between"><span>Old roof removal:</span><span>£400</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£9,200</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Roof pitch:</strong> Steep roofs more dangerous, require more scaffolding</li>
            <li><strong>Roof complexity:</strong> Hips, valleys, chimneys = more labour cost</li>
            <li><strong>Access:</strong> Tight spaces require more care and time</li>
            <li><strong>Underlying damage:</strong> Rotten timbers need replacement (major cost)</li>
            <li><strong>Damp/ventilation issues:</strong> May need ventilation improvements</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"Slate lasts 50 years":</strong> Actually 50-100+. Very durable investment</li>
            <li><strong>"Roof should last indefinitely":</strong> Typical lifespan: 20-40 years</li>
            <li><strong>"Repairs are cheaper than replacement":</strong> Sometimes true, sometimes patching is false economy</li>
            <li><strong>"All roofs cost the same":</strong> Huge variation: budget vs premium can be 3-4x difference</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Roofer not insured/not on scaffolding safety register</li>
            <li>No mention of what's included (old roof removal, underlayment, etc.)</li>
            <li>Suspiciously cheap rates (indicates lack of experience or safety shortcuts)</li>
            <li>Doesn't assess underlying damage/timber condition</li>
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
