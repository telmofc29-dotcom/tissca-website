import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Electrical Costs UK - Labour Rates & Material Expenses | BUILDR',
  description: 'Understand UK electrical costs. Rewiring costs, new circuit costs, and certification requirements explained.',
  keywords: 'electrical costs, rewiring, electrician rates, electrical labour, circuit installation',
};

export default function ElectricalCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Electrical Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK electrical costs. Rewiring, circuits, consumer units, and certification expenses.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Electrician Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £80-£130/day</p>
              <p className="text-sm text-slate-700">Apprentices or inexperienced electricians. Basic work only.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard/Qualified: £150-£220/day</p>
              <p className="text-sm text-slate-700">Qualified electricians. All work to standard, proper testing and certification.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Specialist/Master: £240-£320+/day</p>
              <p className="text-sm text-slate-700">Highly experienced. Complex installations, design, problem-solving.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Electrical Work Costs</h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Complete Rewiring</h3>
              <p className="text-sm text-slate-700"><strong>Small property (2 bed):</strong> £2,500-4,000</p>
              <p className="text-sm text-slate-700"><strong>Average property (3 bed):</strong> £4,000-6,500</p>
              <p className="text-sm text-slate-700"><strong>Large property (4+ bed):</strong> £6,500-10,000+</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes new consumer unit, all cabling, outlets, testing and certification</em></p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Consumer Unit Upgrade</h3>
              <p className="text-sm text-slate-700"><strong>Basic replacement:</strong> £400-800</p>
              <p className="text-sm text-slate-700"><strong>With RCD upgrade:</strong> £600-1,200</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes removal, installation, testing, certification</em></p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">New Circuits/Outlets</h3>
              <p className="text-sm text-slate-700"><strong>Single new outlet:</strong> £50-100</p>
              <p className="text-sm text-slate-700"><strong>New circuit (lighting):</strong> £150-300</p>
              <p className="text-sm text-slate-700"><strong>New circuit (power/cooker):</strong> £300-600</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes cabling, installation, testing, certification</em></p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Lighting & Switches</h3>
              <p className="text-sm text-slate-700"><strong>New ceiling light:</strong> £80-150</p>
              <p className="text-sm text-slate-700"><strong>Pendant/chandelier:</strong> £120-250</p>
              <p className="text-sm text-slate-700"><strong>Per new switch:</strong> £40-80</p>
              <p className="text-sm text-slate-600 mt-2"><em>Includes labour and testing</em></p>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold mb-2">Special Installations</h3>
              <p className="text-sm text-slate-700"><strong>Bathroom extraction fan:</strong> £100-200</p>
              <p className="text-sm text-slate-700"><strong>Heated towel rail:</strong> £100-180</p>
              <p className="text-sm text-slate-700"><strong>Electric shower installation:</strong> £150-250</p>
              <p className="text-sm text-slate-700"><strong>Underfloor heating thermostat:</strong> £80-150</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Costs</h2>
          <div className="space-y-2 text-slate-700 mb-6">
            <p><strong>Electrical cable (per metre):</strong> £0.20-0.80 depending on size</p>
            <p><strong>Outlet/switch plate:</strong> £2-10</p>
            <p><strong>Light fitting:</strong> £20-100+ depending on type</p>
            <p><strong>Consumer unit:</strong> £150-400</p>
            <p><strong>Circuit breakers (per unit):</strong> £10-30</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: Bathroom Electrics</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Bathroom</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>New circuit (power):</span><span>£300</span></div>
                <div className="flex justify-between"><span>Extraction fan & switch:</span><span>£150</span></div>
                <div className="flex justify-between"><span>Basic light & switch:</span><span>£100</span></div>
                <div className="flex justify-between"><span>Labour (1 day):</span><span>£160</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£710</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Bathroom</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>New circuits (2 × power):</span><span>£600</span></div>
                <div className="flex justify-between"><span>Heated towel rail:</span><span>£160</span></div>
                <div className="flex justify-between"><span>Extraction fan:</span><span>£150</span></div>
                <div className="flex justify-between"><span>Quality lights (3 ×):</span><span>£300</span></div>
                <div className="flex justify-between"><span>Labour (1.5 days):</span><span>£270</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£1,480</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Bathroom (Heated Floor)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>New dedicated circuits:</span><span>£800</span></div>
                <div className="flex justify-between"><span>Underfloor heating setup:</span><span>£400</span></div>
                <div className="flex justify-between"><span>Premium lighting (4 ×):</span><span>£500</span></div>
                <div className="flex justify-between"><span>Heated towel rail:</span><span>£160</span></div>
                <div className="flex justify-between"><span>Extraction system:</span><span>£200</span></div>
                <div className="flex justify-between"><span>Labour (2.5 days):</span><span>£550</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£2,610</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Cable routing difficulty:</strong> Easy = cheapest. Complex routing adds cost</li>
            <li><strong>Existing wiring condition:</strong> Unsafe wiring forces rewire (expensive)</li>
            <li><strong>Consumer unit location:</strong> Far from work area increases cable cost</li>
            <li><strong>Testing & certification:</strong> Mandatory for any work. Included in prices above</li>
            <li><strong>Building Regulations:</strong> Some work requires approval (additional cost)</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Critical Note: Always Use Qualified Electricians</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <p className="text-slate-700 font-semibold mb-2">Electrical work MUST be done by a qualified, registered electrician (Part P compliant)</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              <li>Required by Building Regulations</li>
              <li>Required for insurance validity</li>
              <li>Dangerous if done incorrectly (risk of fire/electrocution)</li>
              <li>Unqualified work will cause resale issues</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"I can do electrics myself":</strong> Illegal and dangerous. Insurance won't cover</li>
            <li><strong>"Electrical certification is optional":</strong> Legally required. Affects future sale</li>
            <li><strong>"All electricians charge the same":</strong> Qualified vs unqualified: major difference in cost and safety</li>
            <li><strong>"Extractors are just fans":</strong> Must be installed to regulations (ductwork, grading, etc.)</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Electrician not qualified (NICEIC, NAPIT certified):</strong> Major red flag</li>
            <li><strong>No certification promised:</strong> Illegal and risky</li>
            <li><strong>Suspiciously cheap rates:</strong> May indicate unqualified work</li>
            <li><strong>Won't provide building control certificate:</strong> Needs to be provided</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/permits-and-compliance" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Permits & Compliance
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
