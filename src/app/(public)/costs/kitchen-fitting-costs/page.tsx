import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kitchen Fitting Costs UK - Budget to Premium Kitchens | TISSCA',
  description: 'Understand UK kitchen fitting costs. Complete kitchen costs from budget to premium, labour, and what affects pricing.',
  keywords: 'kitchen costs, fitted kitchens, kitchen fitting, kitchen renovation, kitchen labour',
};

export default function KitchenFittingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Kitchen Fitting Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding complete kitchen renovation costs. Budget to premium kitchens explained.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">Kitchen Fitting Labour</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £120-£160/day</p>
              <p className="text-sm text-slate-700">Inexperienced kitchen fitters. Basic fitting, may lack precision.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £180-£240/day</p>
              <p className="text-sm text-slate-700">Experienced kitchen fitters. Professional installation, good finish.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £260-£350+/day</p>
              <p className="text-sm text-slate-700">Specialist kitchen installers. Bespoke fitting, complex designs, perfect finish.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Kitchen Costs by Size (Complete Renovation)</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Kitchen (2.5m x 3m)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Budget cabinets:</span><span>£2,000</span></div>
                <div className="flex justify-between"><span>Basic worktop:</span><span>£300</span></div>
                <div className="flex justify-between"><span>Budget appliances:</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Flooring/wall tiles:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Labour (5 days):</span><span>£800</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£4,900</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrical (add £500-1,000)</p>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Kitchen (3m x 4m)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality cabinets:</span><span>£4,500</span></div>
                <div className="flex justify-between"><span>Granite/quartz worktop:</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Quality appliances:</span><span>£3,000</span></div>
                <div className="flex justify-between"><span>Professional flooring:</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Labour (8 days):</span><span>£1,600</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£11,500</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrical (add £1,000-2,000)</p>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Kitchen (3.5m x 4.5m, Island)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium designer cabinets:</span><span>£8,000</span></div>
                <div className="flex justify-between"><span>Bespoke island unit:</span><span>£2,500</span></div>
                <div className="flex justify-between"><span>Premium worktop:</span><span>£2,500</span></div>
                <div className="flex justify-between"><span>Premium appliances:</span><span>£6,000</span></div>
                <div className="flex justify-between"><span>Specialist flooring:</span><span>£2,000</span></div>
                <div className="flex justify-between"><span>Labour (10-12 days):</span><span>£3,200</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£26,200</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrical/structural changes (add £2,000-5,000)</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Kitchen Components Breakdown</h2>
          
          <div className="space-y-3 text-sm text-slate-700 mb-6">
            <div><strong>Cabinets:</strong> Budget £800-1,500, Standard £2,500-4,000, Premium £5,000+</div>
            <div><strong>Worktops:</strong> Budget £300-600, Standard £800-1,500, Premium £2,000+</div>
            <div><strong>Appliances (cooker, hob, fridge, dishwasher):</strong> Budget £2,000-3,000, Standard £4,000-6,000, Premium £8,000+</div>
            <div><strong>Lighting & electrics:</strong> Budget £300-500, Standard £800-1,200, Premium £1,500+</div>
            <div><strong>Splashback:</strong> Budget £200-400, Standard £500-800, Premium £1,000+</div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Existing layout changes:</strong> Moving plumbing/electrics adds £1,000-3,000+</li>
            <li><strong>Structural changes:</strong> Removing walls for open-plan significantly increases cost</li>
            <li><strong>Complexity of design:</strong> Islands, angles, bespoke pieces increase labour cost</li>
            <li><strong>Appliance integration:</strong> Built-in appliances more expensive than standard</li>
            <li><strong>Wall/floor finishes:</strong> Quality tiling or splashback choices add cost</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"Budget cabinet sets are same as boutique":</strong> Huge durability/finish difference</li>
            <li><strong>"Appliances last 20+ years":</strong> Typical lifespan: 7-10 years</li>
            <li><strong>"Labour is minimal":</strong> Kitchen fitting is complex—proper job takes 8-10 days minimum</li>
            <li><strong>"We can do plumbing/electrics ourselves":</strong> Bad idea—voids insurance, safety issues</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Kitchen supplier not mentioning fitting costs separately</li>
            <li>Quote doesn't detail appliances/cabinet quality</li>
            <li>No mention of how plumbing/electrics will be handled</li>
            <li>Timeframe seems unrealistic (complete kitchen in 2-3 days is impossible)</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Kitchen Cost Calculator
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
