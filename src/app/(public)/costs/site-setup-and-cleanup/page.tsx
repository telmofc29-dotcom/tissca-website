import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Site Setup & Cleanup Costs - Construction Site Preparation | TISSCA',
  description: 'Understand site setup and cleanup costs. Protection, hoarding, waste removal, and restoration expenses explained.',
  keywords: 'site setup, cleanup costs, waste removal, site protection, hoarding',
};

export default function SiteSetupAndCleanupPage() {
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
          <h1 className="text-3xl font-bold mb-3">Site Setup & Cleanup Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding the costs of preparing, protecting, and restoring a site. Often underestimated but critical for professional projects.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Site Setup & Cleanup Costs?</h2>
          <p className="text-slate-700 mb-6">
            These are the costs of preparing a site before work starts and restoring it after work finishes. This includes protection (dust sheets, plastic, barriers), waste removal, temporary facilities, and site restoration. Often overlooked, but typically adds 5-15% to project cost.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Setup Costs</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold text-lg mb-2">Protection & Covering</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Dust sheets (per m²):</strong> £1-3</p>
                <p><strong>Plastic sheeting (per m²):</strong> £0.50-1</p>
                <p><strong>Hardboard flooring protection (per m²):</strong> £2-4</p>
                <p><strong>Protective taping & sealing:</strong> £100-300 per room</p>
                <p><strong>Temporary screening/barriers:</strong> £5-15 per m²</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Example: 50m² room requires ~£100-150 in dust sheets/protection plus 4 hours labour at £50/hour = £350 total setup</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">Dust Control</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Industrial vacuum hire (per day):</strong> £30-60</p>
                <p><strong>Dust containment barriers (per m²):</strong> £3-8</p>
                <p><strong>HEPA air filtration (per day):</strong> £50-100</p>
                <p><strong>Negative pressure units (per day):</strong> £80-150</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Critical for any work involving demolition, sanding, or cutting. Prevents dust spreading through entire home.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-2">Access & Temporary Facilities</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Temporary hoarding (per m²):</strong> £5-15</p>
                <p><strong>Parking permits:</strong> £50-200 per week (London/city centres)</p>
                <p><strong>Loading bay permits:</strong> £100-300 per day</p>
                <p><strong>Temporary power supply installation:</strong> £200-500</p>
                <p><strong>Welfare facilities (site cabin, toilet):</strong> £100-300 per week</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Not always needed for small residential work, but large/long projects require proper facilities.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold text-lg mb-2">Damage Prevention</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Wall protection (per m):</strong> £5-10</p>
                <p><strong>Door/frame protection:</strong> £50-150 per opening</p>
                <p><strong>Floor protection (hardboard):</strong> £3-6 per m²</p>
                <p><strong>Equipment damage insurance:</strong> 10-15% of tool/equipment value</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Professional sites are heavily protected. Cheap protection leads to expensive damage repairs.</em>
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Cleanup & Waste Costs</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-red-400 p-4 bg-red-50">
              <h3 className="font-bold text-lg mb-2">Waste Removal</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Skip bin (8-10m³, per week):</strong> £150-300</p>
                <p><strong>Larger skip (20m³, per week):</strong> £250-500</p>
                <p><strong>Rubbish bag disposal (per 20 bags):</strong> £50-100</p>
                <p><strong>Hazardous waste disposal:</strong> £200-1,000+ (asbestos, paint, chemicals)</p>
                <p><strong>Rubble disposal (per tonne):</strong> £50-100</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Major renovation projects can generate 15-30 bags of waste daily. Skip bin is essential.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold text-lg mb-2">Final Cleanup Labour</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Standard cleanup (per hour):</strong> £25-50</p>
                <p><strong>Deep clean post-construction (per m²):</strong> £2-5</p>
                <p><strong>Specialist cleaning (per hour):</strong> £40-80</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>A 50m² room typically needs 4-8 hours cleanup = £100-400 in labour alone.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-pink-400 p-4 bg-pink-50">
              <h3 className="font-bold text-lg mb-2">Recycling & Disposal Costs</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Plasterboard recycling (per tonne):</strong> £40-80</p>
                <p><strong>Wood recycling (per tonne):</strong> £30-60</p>
                <p><strong>Metal recycling (per tonne):</strong> Often FREE (metal has scrap value)</p>
                <p><strong>Mixed waste disposal (per tonne):</strong> £80-150</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Cost Example</h2>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Complete Bathroom Renovation (5-day project)</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Setup Costs (Day 1):</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>Dust sheets & plastic (per m²: 10m²):</span>
                  <span>£20</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Protective barriers & sealing:</span>
                  <span>£150</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Setup labour (4 hours):</span>
                  <span>£200</span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Setup Total:</span>
                  <span>£370</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Daily Cleanup (Days 1-5):</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>Daily site cleanup (1 hour, £50):</span>
                  <span>£50 × 5 = £250</span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Daily Cleanup Total:</span>
                  <span>£250</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Waste Removal (Throughout):</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>Skip bin hire (1 week):</span>
                  <span>£200</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Waste disposal charges:</span>
                  <span>£50</span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Waste Total:</span>
                  <span>£250</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">Final Cleanup (Day 6):</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>Deep clean labour (6 hours):</span>
                  <span>£300</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Cleaning supplies & equipment:</span>
                  <span>£50</span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Final Cleanup Total:</span>
                  <span>£350</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-slate-300 pt-4 flex justify-between font-bold text-lg">
              <span>Total Setup & Cleanup Cost:</span>
              <span className="text-orange-600">£1,220</span>
            </div>

            <p className="text-sm text-slate-600 mt-4">
              <em>If total project budget is £8,000, setup & cleanup represents 15% of cost. Professional approach but often overlooked in cheap quotes.</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
            <li><strong>"Cleanup should be free":</strong> No. Cleanup is skilled labour. 8-hour deep clean costs £400+ professionally</li>
            <li><strong>"We'll just use bin bags":</strong> Illegal waste disposal. Professional projects require proper waste removal</li>
            <li><strong>"Skip bins are overpriced":</strong> They're licensed waste management. You pay for proper environmental handling</li>
            <li><strong>"Protection isn't necessary":</strong> Damage to undamaged surfaces costs thousands to repair. £300 in protection is cheap insurance</li>
            <li><strong>"We can cleanup as we go":</strong> Reduces final cleanup time/cost somewhat, but doesn't eliminate it</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>No setup/cleanup costs in quote:</strong> Either forgotten or deliberately omitted</li>
            <li><strong>Generic "cleanup fee" with no detail:</strong> You don't know what's included</li>
            <li><strong>Unclear waste removal responsibility:</strong> Who removes the waste? How?</li>
            <li><strong>No mention of protection/dust control:</strong> Red flag for unprofessional approach</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/equipment-and-tool-hire" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Equipment & Tool Hire
            </Link>
            <Link href="/costs/permits-and-compliance" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Permits & Compliance
            </Link>
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Cost Calculators
            </Link>
            <Link href="/costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Back to All Cost Categories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
