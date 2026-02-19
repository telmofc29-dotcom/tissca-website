import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plumbing Costs UK - Labour Rates & Material Expenses | TISSCA',
  description: 'Understand UK plumbing costs. Labour rates, pipework costs, and what affects bathroom/kitchen plumbing pricing.',
  keywords: 'plumbing costs, UK plumber rates, pipework costs, bathroom plumbing, kitchen plumbing',
};

export default function PlumbingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Plumbing Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK plumbing labour rates, material costs, and factors affecting pricing.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Plumber Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £80-£140/day</p>
              <p className="text-sm text-slate-700">Apprentices or inexperienced. Basic work, may lack finesse.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard/Qualified: £160-£230/day</p>
              <p className="text-sm text-slate-700">Qualified plumbers. All work to standard, proper testing and safety.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Specialist/Master: £240-£320+/day</p>
              <p className="text-sm text-slate-700">Highly experienced specialists. Complex systems, design work.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Plumbing Work Costs</h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Radiator Installation</h3>
              <p className="text-sm text-slate-700"><strong>Single radiator:</strong> £150-300</p>
              <p className="text-sm text-slate-700"><strong>Full system (6-8 radiators):</strong> £1,500-3,000</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes brackets, valves, connections, bleeding</em></p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Boiler Replacement</h3>
              <p className="text-sm text-slate-700"><strong>Budget boiler + install:</strong> £1,200-2,000</p>
              <p className="text-sm text-slate-700"><strong>Standard boiler + install:</strong> £2,000-3,500</p>
              <p className="text-sm text-slate-700"><strong>Premium boiler + install:</strong> £3,500-6,000+</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes decommissioning old boiler, pipework, certification</em></p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">Basin/Sink Installation</h3>
              <p className="text-sm text-slate-700"><strong>Basic sink:</strong> £80-150</p>
              <p className="text-sm text-slate-700"><strong>Quality basin:</strong> £120-250</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes connection, sealing, testing</em></p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Toilet Installation</h3>
              <p className="text-sm text-slate-700"><strong>Toilet replacement:</strong> £150-300</p>
              <p className="text-sm text-slate-700"><strong>New toilet location:</strong> £500-1,200</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes plumbing to new location</em></p>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold mb-2">Shower Installation</h3>
              <p className="text-sm text-slate-700"><strong>Basic shower over bath:</strong> £150-300</p>
              <p className="text-sm text-slate-700"><strong>Shower cubicle:</strong> £400-800</p>
              <p className="text-sm text-slate-700"><strong>Luxury shower system:</strong> £800-2,000+</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Costs</h2>
          <div className="space-y-2 text-slate-700 mb-6">
            <p><strong>Pipework (per metre, varies by size):</strong> £2-8</p>
            <p><strong>Fittings (elbows, tees, connectors):</strong> £2-10 each</p>
            <p><strong>Valves:</strong> £20-100+ depending on type</p>
            <p><strong>Radiator:</strong> £150-600+ depending on size/quality</p>
            <p><strong>Basin/sink:</strong> £100-500+</p>
            <p><strong>Toilet:</strong> £150-600+</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: Bathroom Plumbing</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Installation</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>New basins & toilet:</span><span>£400</span></div>
                <div className="flex justify-between"><span>Pipework & connections:</span><span>£200</span></div>
                <div className="flex justify-between"><span>Labour (1.5 days):</span><span>£240</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£840</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Installation</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality basins & toilet:</span><span>£800</span></div>
                <div className="flex justify-between"><span>Shower cubicle:</span><span>£500</span></div>
                <div className="flex justify-between"><span>Pipework & fittings:</span><span>£400</span></div>
                <div className="flex justify-between"><span>Labour (2.5 days):</span><span>£450</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£2,150</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Installation</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium fixtures:</span><span>£1,500</span></div>
                <div className="flex justify-between"><span>Luxury shower system:</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Underfloor heating plumbing:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Quality pipework:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Labour (3.5 days):</span><span>£700</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£4,600</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Existing pipework:</strong> Old/corroded pipes need full replacement (expensive)</li>
            <li><strong>Water pressure:</strong> Low pressure systems need boosters (additional cost)</li>
            <li><strong>New pipe locations:</strong> Running pipes new distances = more labour/materials</li>
            <li><strong>Boiler size:</strong> Larger boilers for bigger homes cost significantly more</li>
            <li><strong>System type:</strong> Combination boilers vs hot water tanks (different costs)</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"All boilers cost the same":</strong> Budget vs premium: £800+ price difference</li>
            <li><strong>"Plumbing is simple":</strong> Bad plumbing causes leaks, damp, water damage</li>
            <li><strong>"Old pipes are fine":</strong> 30+ year old pipes often corroded, need replacement</li>
            <li><strong>"DIY plumbing is OK":</strong> Bad plumbing voids insurance and causes costly damage</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Plumber not Gas Safe registered (for boiler work)</li>
            <li>No system testing promised</li>
            <li>Doesn't mention checking existing pipework</li>
            <li>Suspiciously cheap rates (under £80/day is risky)</li>
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
