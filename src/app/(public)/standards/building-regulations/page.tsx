import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Building Regulations & Compliance Standards | BUILDR',
  description: 'Building Regulations requirements, compliance standards, certifications needed for construction work, and when inspections are required.',
  keywords: 'building regulations, compliance, building control, construction standards, certifications',
};

export default function BuildingRegulationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/standards" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Standards & Quality
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Building Regulations & Compliance</h1>
          <p className="text-lg text-slate-200">
            Understanding Building Regulations, compliance requirements, and what certifications your contractor needs.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mb-4">What Are Building Regulations?</h2>
          <p className="text-slate-700 mb-6">
            Building Regulations are legal requirements in the UK that ensure construction work is safe, healthy, and energy-efficient. They're minimum standards, not guidelines. Work that doesn't comply can result in:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Forced remedial work at your cost (potentially £1,000s)</li>
            <li>House being unmortgageable or un-insurable</li>
            <li>Council enforcement action against you</li>
            <li>Loss of property value</li>
            <li>Future buyer indemnity costs</li>
          </ul>

          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6">
            <p className="font-semibold text-slate-900">
              Always verify your contractor is using Building Regulations-compliant methods. Non-compliant work creates liability for you.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Work That Requires Building Regulations Approval</h2>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">MUST have Building Regulations approval:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Structural work:</strong> Load-bearing walls, foundations, loft conversions</li>
              <li><strong>Electrical work (Part P):</strong> New circuits, consumer unit upgrades, fixed appliances</li>
              <li><strong>Gas work:</strong> Any work on gas appliances or piping</li>
              <li><strong>Bathrooms:</strong> New bathrooms or significant renovation (ventilation compliance)</li>
              <li><strong>Kitchens:</strong> Structural changes, gas appliance installation</li>
              <li><strong>Windows/doors:</strong> Replacement windows and doors (U-value compliance)</li>
              <li><strong>Insulation:</strong> Loft insulation, wall insulation, cavity insulation</li>
              <li><strong>Central heating:</strong> Boiler replacement, radiator installation</li>
              <li><strong>Flat roofs:</strong> New or replacement flat roofs (weatherproofing standards)</li>
              <li><strong>Listed buildings:</strong> Virtually all work requires consent and regulations</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Generally exempt (but check local authority):</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Internal decoration (painting, wallpaper)</li>
              <li>Like-for-like boiler replacement (if same location)</li>
              <li>Reroof with equivalent material (roof not accessed)</li>
              <li>Floor covering replacement</li>
              <li>Minor electrical work (replacing sockets, switches)</li>
            </ul>
            <p className="text-sm text-slate-600 mt-3">
              <em>Note: Local authorities vary. Always check before starting non-compliant work.</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Building Regulations Standards</h2>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part A: Structure</h3>
              <p className="text-slate-700">
                Ensures structural integrity. Any structural change requires engineer design and building control certification. Load-bearing walls cannot be removed without proper support (beams, pillars, etc.).
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part B: Fire Safety</h3>
              <p className="text-slate-700">
                Requires fire detection, emergency lighting in hallways, fire-resistant materials in key areas, and means of escape. Extensions must maintain fire safety standards.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part C: Site Preparation & Contamination</h3>
              <p className="text-slate-700">
                Site must be adequately prepared. Contaminated land must be remediated. Flooding risk assessed.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part E: Sound</h3>
              <p className="text-slate-700">
                Acoustics of separating walls/floors in new buildings must meet standards. Noise insulation between dwellings required.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part F: Ventilation</h3>
              <p className="text-slate-700">
                All spaces must have adequate ventilation. Kitchens require extraction fans. Bathrooms require humidity extraction. Windows must provide background ventilation.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part G: Sanitation & Water</h3>
              <p className="text-slate-700">
                Bathrooms must be properly drained and waterproofed. Hot water systems must have temperature controls. Cold water must be potable.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part J: Combustion Appliances & Fuel Storage</h3>
              <p className="text-slate-700">
                Gas appliances must have proper ventilation. Chimneys must be properly maintained. Boilers must meet efficiency standards.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part L: Conservation of Fuel & Power (Energy Efficiency)</h3>
              <p className="text-slate-700">
                Windows, doors, insulation, heating systems must meet U-value standards. New buildings and major renovations must achieve energy performance ratings. Standards have tightened significantly (2021+).
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part M: Access to & Use of Buildings</h3>
              <p className="text-slate-700">
                New buildings must provide access for people with disabilities. Doorways, hallways, stairs must meet width/gradient standards.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Part P: Electrical Safety</h3>
              <p className="text-slate-700">
                All electrical work must be carried out by qualified electricians. Consumer unit work, new circuits, fixed appliances require certification. DIY wiring is generally not permitted.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Key Certifications & Registrations</h2>
          
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="font-bold text-slate-900">Part P (Electrical) Certification</p>
                <p className="text-slate-700">Only electricians on Part P-approved installer lists can certify work. Look for NICEIC, NAPIT, or similar. Requires inspection by third party or building control.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-900">Gas Safe Certification</p>
                <p className="text-slate-700">Only Gas Safe registered engineers can work on gas. Check Gas Safe register online. Work must be certified on completion.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-900">Building Control Certification</p>
                <p className="text-slate-700">For structural or major work, building control inspector must verify compliance. Requires inspections at key stages (foundations, drains, final). Certificate of compliance issued on completion.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-900">Competent Person Schemes</p>
                <p className="text-slate-700">For windows, boilers, insulation—many qualified installers self-certify through schemes (FENSA, OFTEC, etc.). Certification provided on completion.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">The Building Control Process</h2>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">For work requiring building control:</p>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li><strong>Notification:</strong> You (or contractor) must notify building control before starting work</li>
              <li><strong>Plans submission:</strong> Detailed plans/specification submitted showing compliance</li>
              <li><strong>Initial inspection:</strong> Building control inspects foundations, drainage, or initial stages</li>
              <li><strong>Ongoing inspections:</strong> Further inspections during construction (rough-in, before covering, etc.)</li>
              <li><strong>Final inspection:</strong> Building control verifies completed work meets regulations</li>
              <li><strong>Certificate:</strong> Building Regulations Completion Certificate issued</li>
            </ol>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Costs of Building Regulations Compliance</h2>
          <p className="text-slate-700 mb-4">
            Building control fees are typically charged as a percentage of project cost:
          </p>
          <div className="bg-slate-50 rounded-lg p-6 mb-6">
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Minor work (under £5,000):</strong> £100-300</li>
              <li><strong>Moderate work (£5,000-20,000):</strong> £300-800</li>
              <li><strong>Major work (£20,000-100,000):</strong> £800-2,000</li>
              <li><strong>Large work (£100,000+):</strong> 1-2% of project cost</li>
            </ul>
            <p className="text-sm text-slate-600 mt-3">
              Vary by local authority. Private inspectors also available (sometimes cheaper, always approved by local authority).
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags for Non-Compliance</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Contractor suggests non-compliant work if they:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>"Skip building control to save money"</li>
              <li>"Use a cheaper unqualified electrician for Part P work"</li>
              <li>"Not worry about ventilation in the bathroom"</li>
              <li>"Remove a load-bearing wall without engineer approval"</li>
              <li>"Install windows that don't meet U-value standards"</li>
              <li>"Use budget-tier materials that don't meet standards"</li>
            </ul>
            <p className="text-slate-700 mt-4 font-semibold">
              Do not accept this. Non-compliance creates long-term liability for you.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Listed Buildings & Conservation Areas</h2>
          <p className="text-slate-700 mb-6">
            If your home is listed or in a conservation area, additional approvals required:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Listed Building Consent:</strong> Required for most visible changes (windows, doors, roof, decorative features)</li>
            <li><strong>Conservation Area Consent:</strong> Required for demolition, building prominence</li>
            <li><strong>Article 4 Direction:</strong> Some areas require consent even for seemingly minor work</li>
          </ul>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="text-slate-700">
              <strong>Check with conservation officer before hiring:</strong> Specialist contractors experienced with listed buildings often cost more but prevent costly non-compliance.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What to Ask Your Contractor</h2>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>"Which Building Regulations Parts apply to this work?"</li>
              <li>"Will you notify building control and obtain certification?"</li>
              <li>"What inspections will building control require?"</li>
              <li>"Will you provide a completion certificate?"</li>
              <li>"If you're Part P/Gas Safe registered, can I see your credentials?"</li>
              <li>"How much are building control fees and are they included in your quote?"</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Completion Certificate</h2>
          <p className="text-slate-700 mb-6">
            For any building control work, insist on getting a Building Regulations Completion Certificate on project finish. This proves work complies with regulations and is essential for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Future house sale (buyers require it)</li>
            <li>Mortgage lenders (some won't lend without it)</li>
            <li>Insurance cover</li>
            <li>Your legal protection</li>
          </ul>

          <div className="bg-slate-100 rounded-lg p-6">
            <p className="text-slate-700">
              <strong>Building Regulations exist to protect you.</strong> Compliance ensures your home is safe, healthy, and properly constructed. While they add to project cost, non-compliance creates far greater costs down the line. Always budget for proper compliance and certifications.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Standards & Quality Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/standards/safety-requirements" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Safety Requirements
            </Link>
            <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Workmanship Standards
            </Link>
            <Link href="/standards/material-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Material Quality
            </Link>
            <Link href="/standards/finishing-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Finishing Quality
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
