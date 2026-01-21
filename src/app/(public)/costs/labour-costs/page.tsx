import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Labour Costs in Construction - UK Daily Rates | BUILDR',
  description: 'Understand UK construction labour rates. Budget to premium pricing tiers, what determines daily rates, and how to assess value.',
  keywords: 'labour costs, tradesperson rates, daily rates, UK construction',
};

export default function LabourCostsPage() {
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
          <h1 className="text-3xl font-bold mb-3">Labour Costs in Construction</h1>
          <p className="text-lg text-slate-200">
            Understanding tradesperson rates, quality tiers, and what determines fair labour pricing in the UK.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Labour Costs?</h2>
          <p className="text-slate-700 mb-6">
            Labour costs are what you pay the tradespeople to perform work. This typically represents 50-60% of total project cost, and includes wages, insurance, pension contributions, business overhead, and profit margin.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">UK Labour Rates by Tier</h2>
          <p className="text-slate-700 mb-6">
            Labour is priced in three tiers based on experience and quality:
          </p>

          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h3 className="font-bold text-lg mb-2">Budget Tier: £80-£120/day</h3>
              <p className="text-slate-700 mb-2">
                <strong>Who:</strong> Apprentices, very junior tradespeople, one-person operations with minimal overhead
              </p>
              <p className="text-slate-700 mb-2">
                <strong>What to expect:</strong> Basic competence, slower pace, limited problem-solving, less professional finishing
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Quality:</strong> Work meets basic standards but lacks finesse. May need rework or correction.
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Insurance:</strong> Often minimal or absent. Higher risk if damage occurs.
              </p>
              <p className="text-slate-700">
                <strong>When appropriate:</strong> Simple, straightforward work; tight budgets; non-critical areas; projects where quality isn't paramount
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h3 className="font-bold text-lg mb-2">Standard/Professional Tier: £150-£250/day</h3>
              <p className="text-slate-700 mb-2">
                <strong>Who:</strong> Experienced tradespeople with 5+ years experience, established businesses, team of 2-3 staff
              </p>
              <p className="text-slate-700 mb-2">
                <strong>What to expect:</strong> Professional quality, efficient working, problem-solving ability, proper finishing, reliability
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Quality:</strong> Meets professional standards. Work done right first time. Attention to detail.
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Insurance:</strong> Proper public liability, tools insurance, professional membership
              </p>
              <p className="text-slate-700">
                <strong>When appropriate:</strong> Most residential and commercial projects; anywhere quality matters; projects where you want to sleep soundly at night
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <h3 className="font-bold text-lg mb-2">Premium Tier: £250-£400+/day</h3>
              <p className="text-slate-700 mb-2">
                <strong>Who:</strong> Highly experienced specialists (15+ years), prestigious firms, teams of 4+ staff, industry specialists
              </p>
              <p className="text-slate-700 mb-2">
                <strong>What to expect:</strong> Exceptional quality, expertise in complex problems, meticulous finishing, proactive communication
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Quality:</strong> Superlative workmanship. Complex problems solved elegantly. Aesthetically superior.
              </p>
              <p className="text-slate-700 mb-2">
                <strong>Insurance:</strong> Comprehensive insurance, warranties, ongoing support, design consultation included
              </p>
              <p className="text-slate-700">
                <strong>When appropriate:</strong> High-value homes; complex projects; listed buildings; projects requiring specialist expertise; where appearance is paramount
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Does Your Daily Rate Cover?</h2>
          <p className="text-slate-700 mb-6">
            A £200/day rate doesn't mean a tradesperson takes home £200. Here's the breakdown:
          </p>

          <div className="bg-slate-100 rounded p-6 mb-8">
            <div className="space-y-3 text-slate-700">
              <div className="flex justify-between">
                <span>Total daily rate:</span>
                <span className="font-bold">£200.00</span>
              </div>
              <div className="border-t border-slate-300 pt-3">
                <div className="flex justify-between mb-2">
                  <span>Employment taxes (PAYE + NI):</span>
                  <span>-£35 (17.5%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Insurance (liability, public, tools):</span>
                  <span>-£25 (12.5%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Vehicle & fuel costs:</span>
                  <span>-£20 (10%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Tools, equipment, consumables:</span>
                  <span>-£15 (7.5%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Office, phone, admin:</span>
                  <span>-£10 (5%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Pension & training:</span>
                  <span>-£10 (5%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Non-billable time (quotes, admin):</span>
                  <span>-£20 (10%)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Business profit (15%):</span>
                  <span>-£30 (15%)</span>
                </div>
              </div>
              <div className="border-t border-slate-300 pt-3 flex justify-between font-bold">
                <span>Take-home wage for 1 day work:</span>
                <span className="text-green-600">~£45-55</span>
              </div>
            </div>
          </div>

          <p className="text-slate-700 mb-6">
            <strong>Reality check:</strong> A tradesperson earning £200/day might take home £50/day in actual wages. The rest funds business operations. This is why cheap quotes are often unrealistic—the tradesperson can't afford to deliver quality at unsustainably low rates.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Labour Rates?</h2>
          <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
            <li><strong>Experience:</strong> 20-year veteran vs 2-year apprentice: £200+ difference/day</li>
            <li><strong>Specialisation:</strong> Specialist skills (bathrooms, kitchens, conservation) command premium rates</li>
            <li><strong>Efficiency:</strong> Experienced tradespeople work faster and solve problems quicker</li>
            <li><strong>Location:</strong> London and South East typically 30-40% higher than national average</li>
            <li><strong>Availability:</strong> Popular tradespeople can charge more during peak season</li>
            <li><strong>Business size:</strong> Solo operators cheaper than established firms (but may lack insurance)</li>
            <li><strong>Complexity:</strong> Complex work justifies higher rates—there's more skill required</li>
            <li><strong>Accessibility:</strong> Awkward or dangerous work commands premium (heights, confined spaces)</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Examples</h2>
          
          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-3">Painting a 50m² Living Room (Budget: 3 days)</h3>
            <div className="space-y-2 text-slate-700">
              <p><strong>Budget tier:</strong> £80 × 3 = £240</p>
              <p><strong>Standard tier:</strong> £150 × 3 = £450</p>
              <p><strong>Premium tier:</strong> £250 × 3 = £750</p>
              <p className="mt-3"><em>The premium painter finishes in same time but with superior prep work and finish quality. Still worth it? Depends on your standards and how long you want it to last.</em></p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-3">Small Bathroom Renovation (Budget: 5 days)</h3>
            <div className="space-y-2 text-slate-700">
              <p><strong>Budget tier:</strong> £100 × 5 = £500</p>
              <p><strong>Standard tier:</strong> £200 × 5 = £1,000</p>
              <p><strong>Premium tier:</strong> £300 × 5 = £1,500</p>
              <p className="mt-3"><em>Budget option risks shortcuts. Standard tier is most common. Premium includes design advice and guarantees work for 5+ years.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Assess Labour Value</h2>
          <div className="space-y-4 text-slate-700">
            <p>
              <strong>1. Don't just compare daily rate:</strong> A faster worker at higher rate might cost less than a slower worker at lower rate.
            </p>
            <p>
              <strong>2. Ask about insurance:</strong> Proper public liability is non-negotiable. Saving £1,000 isn't worth £5,000 damage liability.
            </p>
            <p>
              <strong>3. Check references:</strong> Ask previous customers about the quality and whether work needed rework.
            </p>
            <p>
              <strong>4. Understand the scope:</strong> What's included in daily rate? Does it cover site cleanup, protection, disposal?
            </p>
            <p>
              <strong>5. Expect professionalism:</strong> Professional tradesperson should provide detailed quote, insurance details, and realistic timeline.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Rates significantly below market:</strong> Either unsustainably cheap or uninsured</li>
            <li><strong>No insurance offered:</strong> Major risk to you if something goes wrong</li>
            <li><strong>Won't provide references:</strong> Hard to verify quality</li>
            <li><strong>Vague about timeline:</strong> Experienced workers know how long projects take</li>
            <li><strong>Pushes for cash payment:</strong> Often to avoid tax/insurance accountability</li>
            <li><strong>Fixed price for undefined scope:</strong> You'll have cost overruns</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/materials-and-supplies" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Materials & Supplies Costs
            </Link>
            <Link href="/costs/equipment-and-tool-hire" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Equipment & Tool Hire
            </Link>
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Cost Calculator
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
