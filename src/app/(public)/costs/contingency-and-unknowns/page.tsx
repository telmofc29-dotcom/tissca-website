import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contingency & Unknowns in Construction - Budget Reserve | BUILDR',
  description: 'Why contingency is essential in construction. Hidden costs, unexpected issues, and how to budget for the unknown.',
  keywords: 'contingency, budget reserve, hidden costs, cost overruns, construction budget',
};

export default function ContingencyAndUnknownsPage() {
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
          <h1 className="text-3xl font-bold mb-3">Contingency & Unknowns</h1>
          <p className="text-lg text-slate-200">
            Understanding why projects have contingency budgets and what they're for. Building work reveals surprises—be prepared financially.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Is Contingency?</h2>
          <p className="text-slate-700 mb-6">
            Contingency is a percentage of the project budget set aside for unexpected costs. Professional projects typically include 10-15% contingency. It's not "padding" or profit—it's realistic budgeting for the unknowns inherent in construction work.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">The Reality of Construction</h3>
            <p className="text-slate-700">
              You can't know what's hidden inside walls, under floorboards, or beneath the ground until you open it up. A simple bathroom renovation often reveals:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mt-3">
              <li>Rotten joists under old flooring</li>
              <li>Dodgy electrics requiring replacement</li>
              <li>Damp that needs treatment</li>
              <li>Structural issues (cracked walls, settling)</li>
              <li>Outdated plumbing that needs full replacement</li>
              <li>Asbestos or other hazardous materials</li>
            </ul>
            <p className="text-slate-700 mt-3">
              These aren't failures—they're the reality of building work. Professional contractors expect and budget for them.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Why Contingency Matters</h2>
          <div className="space-y-4 text-slate-700 mb-6">
            <p>
              <strong>1. Protects your budget:</strong> When hidden issues emerge (and they will), you have funds to address them without stalling the project.
            </p>
            <p>
              <strong>2. Prevents cheap fixes:</strong> Without contingency, you might be forced to use substandard solutions. Contingency allows proper repairs.
            </p>
            <p>
              <strong>3. Keeps projects on track:</strong> No contingency often means projects stall while you fundraise for unexpected issues.
            </p>
            <p>
              <strong>4. Maintains quality:</strong> Proper contingency means work continues at proper standard, not "make do" solutions.
            </p>
            <p>
              <strong>5. Contractor protection:</strong> Good contractors expect contingency. No contingency means contractor assumes all risk—they charge accordingly.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Typical Contingency Percentages</h2>

          <div className="space-y-4 mb-8">
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <h3 className="font-bold mb-2">10-12% Contingency</h3>
              <p className="text-slate-700 mb-2">Straightforward, low-risk projects</p>
              <p className="text-sm text-slate-600">Example: New kitchen in modern home (minimal hidden issues likely)</p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h3 className="font-bold mb-2">12-15% Contingency</h3>
              <p className="text-slate-700 mb-2">Standard approach for most projects</p>
              <p className="text-sm text-slate-600">Example: Bathroom renovation, cosmetic work, modern properties</p>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <h3 className="font-bold mb-2">15-20% Contingency</h3>
              <p className="text-slate-700 mb-2">Higher-risk projects needing protection</p>
              <p className="text-sm text-slate-600">Example: Listed buildings, period properties, structural work, older homes</p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="font-bold mb-2">20%+ Contingency</h3>
              <p className="text-slate-700 mb-2">Very high-risk or exploratory work</p>
              <p className="text-sm text-slate-600">Example: Subsidence repairs, major structural issues, properties requiring extensive investigation</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Hidden Costs</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold text-lg mb-2">Damp & Water Issues</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Rising damp:</strong> £2,000-8,000 (physical damp proof course installation)</p>
                <p><strong>Penetrating damp:</strong> £1,000-5,000 (repointing, waterproofing)</p>
                <p><strong>Condensation:</strong> £500-2,000 (ventilation upgrade)</p>
                <p className="text-sm mt-2"><em>Very common in older properties. Often discovered during renovation.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">Structural Issues</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Rotten joists/timber:</strong> £2,000-10,000+ (replacement, structural repairs)</p>
                <p><strong>Cracks/subsidence:</strong> £5,000-50,000+ (investigation, repairs, underpinning)</p>
                <p><strong>Settlement issues:</strong> £3,000-20,000 (repairs, monitoring)</p>
                <p className="text-sm mt-2"><em>Often only discovered when opening walls. Professional investigation required.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-2">Hidden Systems</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Asbestos removal:</strong> £3,000-15,000+ (depends on extent)</p>
                <p><strong>Lead paint remediation:</strong> £1,000-5,000</p>
                <p><strong>Outdated wiring requiring replacement:</strong> £2,000-8,000</p>
                <p><strong>Hidden pipework requiring rerouting:</strong> £1,000-5,000</p>
                <p className="text-sm mt-2"><em>Pre-1980s homes often contain hazardous materials or outdated systems.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold text-lg mb-2">Ground & Foundation Issues</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Contaminated ground:</strong> £5,000-50,000+ (investigation, remediation)</p>
                <p><strong>Soft ground/poor bearing:</strong> £3,000-20,000+ (ground stabilisation)</p>
                <p><strong>Tree root damage:</strong> £2,000-10,000 (underpinning, repairs)</p>
                <p className="text-sm mt-2"><em>Discovered during excavation for extensions or new foundations.</em></p>
              </div>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold text-lg mb-2">Access & Logistics Issues</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Difficult site access:</strong> £1,000-5,000 (specialist equipment/methods needed)</p>
                <p><strong>Cannot park vehicle on site:</strong> £500-2,000 (additional transport costs)</p>
                <p><strong>Working in occupied property:</strong> £2,000-8,000 (slower work, protection, logistics)</p>
                <p className="text-sm mt-2"><em>Urban locations and period properties often have access challenges.</em></p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Project Example</h2>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Bathroom Renovation - Contingency In Action</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Original Quote: £8,000</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between">
                  <span>Materials:</span>
                  <span>£3,200</span>
                </div>
                <div className="flex justify-between">
                  <span>Labour:</span>
                  <span>£4,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipment/permits:</span>
                  <span>£800</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3">With 15% Contingency</h4>
              <div className="space-y-2 text-slate-700 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>£8,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Contingency (15%):</span>
                  <span>£1,200</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total Budget:</span>
                  <span>£9,200</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded border-l-4 border-blue-400 mb-6">
              <h4 className="font-semibold mb-3">What Actually Happened</h4>
              <ul className="list-disc list-inside space-y-2 text-slate-700 text-sm">
                <li><strong>Day 2:</strong> Rotten joists found under old tile. Replacement needed: +£800</li>
                <li><strong>Day 3:</strong> Old wiring unsafe, electrician recommends replacement: +£1,500</li>
                <li><strong>Day 4:</strong> Discovered condensation issue, need specialist ventilation: +£600</li>
                <li><strong>Total overrun without contingency:</strong> £2,900</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <p className="text-slate-700 mb-2">
                <strong>With £1,200 contingency:</strong> The first two issues are covered. The third requires £600 from contingency, using £600 of the £1,200 buffer (leaves £600 remaining).
              </p>
              <p className="text-slate-700">
                <strong>Without contingency:</strong> Project stops after £800 issue. You'd need to find extra £2,900 or accept substandard work.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Use Contingency Properly</h2>
          <div className="space-y-4 text-slate-700 mb-6">
            <p>
              <strong>1. Don't spend it upfront:</strong> Contingency is reserve—only spend if unexpected issues arise.
            </p>
            <p>
              <strong>2. Get quotes for surprises:</strong> If something unexpected emerges, get a quote. Only approve if essential.
            </p>
            <p>
              <strong>3. Keep records:</strong> Document what contingency was used for. Important for future reference and resale.
            </p>
            <p>
              <strong>4. Unused contingency is yours:</strong> If the project comes in under budget, remaining contingency is your saving.
            </p>
            <p>
              <strong>5. Don't let contractors raid it:</strong> Good contractors only use contingency for genuine surprises with your approval.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
            <li><strong>"Contingency is contractor profit":</strong> No. It's a financial buffer for both parties. Properly managed, unused contingency goes to homeowner</li>
            <li><strong>"Good planning eliminates contingency":</strong> No plan is perfect. Even well-planned projects have surprises</li>
            <li><strong>"We can just use credit if issues arise":</strong> Risky. Contingency is planned budget—much better than emergency borrowing</li>
            <li><strong>"If they're not using contingency, they're competent":</strong> Not necessarily. Most real projects have at least some contingency use</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Quote with no contingency mentioned:</strong> Unrealistic or unprofessional</li>
            <li><strong>"Contingency not needed on this project":</strong> Every project has unknowns</li>
            <li><strong>Contractor using contingency without asking:</strong> Should be approved by you first</li>
            <li><strong>Vague about what contingency covers:</strong> It should cover "unforeseen costs"—be specific</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/permits-and-compliance" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Permits & Compliance
            </Link>
            <Link href="/costs/project-overhead-and-management" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Overhead & Management
            </Link>
            <Link href="/avoid-scams" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Avoiding Construction Scams
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
