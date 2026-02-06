import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Equipment & Tool Hire Costs - Construction Equipment Pricing | TISSCA',
  description: 'Understand equipment and tool hire costs in construction. Scaffolding, access equipment, and specialized tool costs explained.',
  keywords: 'equipment hire, tool rental, scaffolding costs, construction equipment',
};

export default function EquipmentAndToolHirePage() {
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
          <h1 className="text-3xl font-bold mb-3">Equipment & Tool Hire Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding the costs of accessing equipment, scaffolding, and specialised tools for construction projects.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Equipment & Tool Hire Costs?</h2>
          <p className="text-slate-700 mb-6">
            Many projects require equipment that isn't practical to purchase. Scaffolding for a week costs more to buy than to hire. Specialised tools (concrete saws, floor scrapers, industrial vacuums) are hired rather than bought. These costs typically represent 5-15% of project cost, depending on project complexity.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Equipment & Hire Costs</h2>
          
          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold text-lg mb-2">Access Equipment</h3>
              <div className="space-y-2 text-slate-700 text-sm">
                <p><strong>Scaffolding (per week):</strong> £50-150+ depending on height and coverage</p>
                <p><strong>Aluminium ladders (per week):</strong> £15-30</p>
                <p><strong>Extending ladders (per week):</strong> £20-40</p>
                <p><strong>Scaffolding tower (per week):</strong> £40-80</p>
                <p><strong>Mobile elevated work platform (per day):</strong> £80-200</p>
                <p><em>Scaffolding is the biggest cost item for work at height. First week often includes delivery/setup charges (£100-200).</em></p>
              </div>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">Power Tools & Machines</h3>
              <div className="space-y-2 text-slate-700 text-sm">
                <p><strong>Concrete saw/cutter (per day):</strong> £40-80</p>
                <p><strong>Angle grinder (per day):</strong> £15-25</p>
                <p><strong>SDS drill (per day):</strong> £12-20</p>
                <p><strong>Pressure washer (per day):</strong> £25-50</p>
                <p><strong>Industrial vacuum (per day):</strong> £30-60</p>
                <p><strong>Compressor + pneumatic tools (per day):</strong> £50-100</p>
                <p><em>Most tradespeople own basic power tools. You only hire specialised equipment.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-2">Floor & Surface Equipment</h3>
              <div className="space-y-2 text-slate-700 text-sm">
                <p><strong>Floor scraper (per day):</strong> £20-40</p>
                <p><strong>Floor polisher (per day):</strong> £40-80</p>
                <p><strong>Floor sander (per day):</strong> £50-100</p>
                <p><strong>Carpet/tile cutter (per day):</strong> £15-30</p>
                <p><strong>Damp-proof membrane sprayer (per day):</strong> £30-60</p>
                <p><em>Most floor work projects require at least one specialized floor tool.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold text-lg mb-2">Generators & Power</h3>
              <div className="space-y-2 text-slate-700 text-sm">
                <p><strong>Portable generator (per day):</strong> £30-80</p>
                <p><strong>Temporary power supply & RCD board (per week):</strong> £100-200</p>
                <p><strong>Heavy-duty extension cable (per week):</strong> £10-20</p>
                <p><em>Larger projects need proper temporary power to avoid trip hazards.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-pink-400 p-4 bg-pink-50">
              <h3 className="font-bold text-lg mb-2">Waste & Cleanup Equipment</h3>
              <div className="space-y-2 text-slate-700 text-sm">
                <p><strong>Skip bin (per week, 8-10m³):</strong> £150-300</p>
                <p><strong>Large waste bags/rubbish (per 20):</strong> £50-100</p>
                <p><strong>Dust sheet protection (per m²):</strong> £1-3</p>
                <p><strong>Protective barriers/hoardings (per m²):</strong> £5-15</p>
                <p><em>Cleanup costs are often underestimated—they're significant on most projects.</em></p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How Equipment Hire Is Charged</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Daily rate:</strong> Usually applicable with 1-2 day minimum</li>
            <li><strong>Weekly rate:</strong> 4-5 days of daily rate (discount applies)</li>
            <li><strong>Deposit:</strong> Refundable security deposit (typically 20-50% of item value)</li>
            <li><strong>Damage charges:</strong> If equipment returned damaged, you pay repair costs</li>
            <li><strong>Delivery/collection:</strong> Often charged separately (£30-100+)</li>
            <li><strong>Insurance:</strong> Available at extra cost; usually worthwhile for expensive equipment</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Cost Breakdown: Typical Project</h2>
          
          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Bathroom Renovation (5-day project)</h3>
            <div className="space-y-2 text-slate-700 mb-4">
              <div className="flex justify-between border-b pb-2">
                <span>Scaffolding tower (5 days):</span>
                <span>£40 × 5 = £200</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Concrete cutter (1 day):</span>
                <span>£60 × 1 = £60</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Industrial vacuum (3 days):</span>
                <span>£40 × 3 = £120</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Pressure washer (1 day):</span>
                <span>£40 × 1 = £40</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Total equipment cost:</span>
                <span className="font-bold">~£420</span>
              </div>
            </div>
            <p className="text-sm text-slate-600">Plus delivery charges (typically £50-100)</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Why Equipment Costs Vary</h2>
          <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
            <li><strong>Duration:</strong> Weekly hire much cheaper per day than daily</li>
            <li><strong>Supplier location:</strong> Rural areas may have fewer options and higher prices</li>
            <li><strong>Season:</strong> Peak season (summer) rates higher than winter</li>
            <li><strong>Equipment condition:</strong> Better-maintained equipment may cost slightly more</li>
            <li><strong>Specialisation:</strong> Rare equipment more expensive than common items</li>
            <li><strong>Volume discounts:</strong> Renting multiple items from same supplier may reduce cost</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Minimise Equipment Costs</h2>
          <div className="space-y-4 text-slate-700">
            <p>
              <strong>1. Hire for minimum necessary time:</strong> If floor sanding takes 1 day, don't hire for a week.
            </p>
            <p>
              <strong>2. Combine equipment from one supplier:</strong> Multi-item hire often cheaper than multiple suppliers.
            </p>
            <p>
              <strong>3. Buy insurance:</strong> If equipment is expensive, insurance (typically 10% of hire cost) is worthwhile.
            </p>
            <p>
              <strong>4. Plan ahead:</strong> Booking in advance sometimes yields better rates than last-minute hire.
            </p>
            <p>
              <strong>5. Return promptly:</strong> Late returns cost dearly—getting equipment back on time matters.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Equipment costs missing from quote:</strong> Significant oversight or deliberately omitted</li>
            <li><strong>No insurance offered:</strong> Risky—equipment damage liability falls on you</li>
            <li><strong>Vague "equipment fee":</strong> You should know what equipment is needed and why</li>
            <li><strong>Hire costs not broken down:</strong> Professional quotes itemise all equipment</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/labour-costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Costs
            </Link>
            <Link href="/costs/site-setup-and-cleanup" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Site Setup & Cleanup
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
