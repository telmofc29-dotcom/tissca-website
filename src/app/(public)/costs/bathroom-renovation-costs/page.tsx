import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bathroom Renovation Costs UK - Budget to Premium Bathrooms | TISSCA',
  description: 'Understand UK bathroom renovation costs. Complete bathroom costs from budget to premium, labour, and what affects pricing.',
  keywords: 'bathroom costs, bathroom renovation, fitted bathrooms, bathroom labour, bathroom refit',
};

export default function BathroomRenovationCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Bathroom Renovation Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding complete bathroom renovation costs. Budget to luxury bathrooms explained.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">Bathroom Renovation Labour</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £120-£160/day</p>
              <p className="text-sm text-slate-700">General builders. Basic fitting, functional rather than refined.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £180-£240/day</p>
              <p className="text-sm text-slate-700">Experienced bathroom fitters. Professional finish, proper waterproofing.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £260-£320+/day</p>
              <p className="text-sm text-slate-700">Specialist bathroom designers/installers. Luxury finishes, complex designs.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Bathroom Costs by Size (Complete Renovation)</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Small Bathroom (2m x 1.5m)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Basic suite (toilet, basin, bath):</span><span>£600</span></div>
                <div className="flex justify-between"><span>Budget tiles & flooring:</span><span>£400</span></div>
                <div className="flex justify-between"><span>Paint & simple finish:</span><span>£100</span></div>
                <div className="flex justify-between"><span>Labour (4-5 days):</span><span>£600</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£1,700</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrics (add £500-800)</p>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Family Bathroom (3m x 2.5m)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality suite & fixtures:</span><span>£1,500</span></div>
                <div className="flex justify-between"><span>Shower cubicle:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Quality tiles & flooring:</span><span>£1,000</span></div>
                <div className="flex justify-between"><span>Lighting & ventilation:</span><span>£300</span></div>
                <div className="flex justify-between"><span>Labour (6-7 days):</span><span>£1,200</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£4,600</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrics (add £1,000-1,500)</p>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Luxury Bathroom (4m x 3m, Ensuite)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium suite & fixtures:</span><span>£3,000</span></div>
                <div className="flex justify-between"><span>Luxury shower system:</span><span>£1,500</span></div>
                <div className="flex justify-between"><span>Freestanding bath:</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Premium tiles & natural stone:</span><span>£2,000</span></div>
                <div className="flex justify-between"><span>Heated towel rails & extras:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Labour (8-10 days):</span><span>£2,400</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£10,700</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Excludes plumbing/electrics/structural (add £2,000-3,500)</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Bathroom Fixtures & Fittings Breakdown</h2>
          
          <div className="space-y-3 text-sm text-slate-700 mb-6">
            <div><strong>Suite (toilet, basin, bath):</strong> Budget £300-500, Standard £800-1,500, Premium £2,000+</div>
            <div><strong>Shower cubicle/enclosure:</strong> Budget £200-400, Standard £600-1,000, Premium £1,500+</div>
            <div><strong>Tiles (walls & flooring):</strong> Budget £400-600, Standard £1,000-1,500, Premium £2,000+</div>
            <div><strong>Vanity unit:</strong> Budget £150-300, Standard £400-800, Premium £1,000+</div>
            <div><strong>Mirrors & lighting:</strong> Budget £100-200, Standard £300-600, Premium £800+</div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Waterproofing:</strong> Essential in bathrooms. Tanking cost: £300-800+</li>
            <li><strong>Ventilation:</strong> Proper extraction fan required (adds £150-300)</li>
            <li><strong>Substrate prep:</strong> Damp, tiling damaged, needs substrate replacement (adds £500-1,500)</li>
            <li><strong>Layout changes:</strong> Moving toilet/basin to new location (adds £800-2,000)</li>
            <li><strong>Heated floor:</strong> Underfloor heating adds £500-1,500 to project</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"All tiles are the same cost":</strong> Budget vs premium: 4-5x price difference</li>
            <li><strong>"Bathroom takes 3 days to fit":</strong> Professional bathroom takes 6-8 days minimum</li>
            <li><strong>"Grout is included in tile cost":</strong> No—waterproofing and grout separate costs</li>
            <li><strong>"We can skimp on waterproofing":</strong> Terrible idea—damp in bathrooms is catastrophic</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't mention waterproofing/tanking</li>
            <li>No detail on fixture brands/specifications</li>
            <li>Doesn't assess existing substrate condition</li>
            <li>Unrealistic timeframe (says 3 days for complete family bathroom)</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Bathroom Cost Calculator
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
