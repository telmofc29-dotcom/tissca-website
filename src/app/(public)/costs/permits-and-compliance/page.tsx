import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Permits & Compliance Costs - Building Regulations & Certifications | TISSCA',
  description: 'Understand construction permits and compliance costs. Building Regulations approval, certifications, and legal requirements explained.',
  keywords: 'building regulations, permits, certifications, compliance costs, structural engineer',
};

export default function PermitsAndCompliancePage() {
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
          <h1 className="text-3xl font-bold mb-3">Permits & Compliance Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding Building Regulations, certifications, and other legal requirements. Compliance isn't optional—it's essential.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Compliance Costs?</h2>
          <p className="text-slate-700 mb-6">
            These are costs for legal approvals, certifications, and compliance with Building Regulations and safety standards. Not every project needs all of these, but many residential projects require at least some. Typically 3-8% of project cost.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Building Regulations Approval</h2>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              Building Regulations are UK laws ensuring construction meets safety, energy efficiency, and accessibility standards. Most major work requires Building Regulations approval from your Local Authority.
            </p>
            
            <h4 className="font-semibold mb-3">When Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Structural changes (walls, ceilings, floors)</li>
              <li>Loft conversions</li>
              <li>Extensions</li>
              <li>New bathrooms or kitchens</li>
              <li>Electrical rewiring</li>
              <li>Heating system changes</li>
              <li>Installation of insulation</li>
            </ul>

            <h4 className="font-semibold mb-3">When NOT Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Cosmetic work (painting, wallpaper)</li>
              <li>Internal decoration</li>
              <li>Like-for-like replacement of fixtures</li>
              <li>Some minor repairs</li>
            </ul>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>Application fee (non-refundable):</strong> £150-500</p>
              <p><strong>Inspection fees:</strong> £150-500 (may require multiple inspections)</p>
              <p><strong>Total typical cost:</strong> £400-1,000</p>
              <p className="text-sm mt-3"><em>London boroughs typically higher than provincial areas. Small works cheaper than large projects.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Structural Engineer Certification</h2>

          <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              For structural changes (removing walls, supporting beams, etc.), you need a structural engineer to design the solution and certify it's safe. This is often required by Building Control.
            </p>

            <h4 className="font-semibold mb-3">When Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Removing load-bearing walls</li>
              <li>Installing lintel/beams</li>
              <li>Loft conversions with structural changes</li>
              <li>Foundation alterations</li>
              <li>Large openings in walls</li>
            </ul>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>Simple beam design:</strong> £400-800</p>
              <p><strong>Complex structural work:</strong> £1,500-5,000+</p>
              <p><strong>Site inspections:</strong> £200-500 per visit</p>
              <p className="text-sm mt-3"><em>Costs depend on complexity. Large projects (loft conversions) often £3,000-5,000 for engineer fees.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Electrical Certification</h2>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              Electrical work (rewiring, new circuits, replacing consumer units) must be certified by a qualified electrician. Required by building regs and essential for safety/insurance.
            </p>

            <h4 className="font-semibold mb-3">When Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Complete rewiring</li>
              <li>New circuits or consumer unit replacement</li>
              <li>Any major electrical work</li>
            </ul>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>EICR (Electrical Installation Condition Report):</strong> £150-300</p>
              <p><strong>New circuits certification (per circuit):</strong> Usually included in labour cost</p>
              <p><strong>Consumer unit replacement certification:</strong> Included in installation cost</p>
              <p className="text-sm mt-3"><em>Certification is typically done by the electrician at no additional cost. EICR (safety check) is separate.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Gas Safety Certification</h2>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              New gas appliances or boiler installations must be certified by a Gas Safe registered engineer. Legally required for safety.
            </p>

            <h4 className="font-semibold mb-3">When Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>New boiler installation</li>
              <li>New gas appliances (cooker, fire, etc.)</li>
              <li>Gas pipe relocation/modification</li>
            </ul>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>Boiler installation certification:</strong> Usually included</p>
              <p><strong>Gas safety inspection:</strong> £100-300</p>
              <p className="text-sm mt-3"><em>Certification normally included in installation cost. Annual safety check (landlords only) costs £50-150.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Planning Permission</h2>

          <div className="bg-purple-50 border-l-4 border-purple-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              Not every renovation needs planning permission—only projects that significantly alter the building's appearance or use. Separate from Building Regulations.
            </p>

            <h4 className="font-semibold mb-3">When Required:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Most extensions (some exceptions)</li>
              <li>Change of use (residential to commercial)</li>
              <li>Significant external changes</li>
              <li>Works in Conservation Areas (stricter rules)</li>
            </ul>

            <h4 className="font-semibold mb-3">When NOT Required (Often):</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>Internal renovations</li>
              <li>Like-for-like replacement of windows/doors (sometimes)</li>
              <li>Minor external works</li>
            </ul>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>Application fee (varies by size):</strong> £200-1,000+</p>
              <p><strong>Approved inspector (if needed):</strong> £500-2,000</p>
              <p className="text-sm mt-3"><em>Check with your Local Planning Authority first—it's free to ask. Sometimes planning permission is unnecessary.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Energy Performance Certificates (EPC)</h2>

          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
            <h3 className="font-bold text-lg mb-3">What Is It?</h3>
            <p className="text-slate-700 mb-4">
              An EPC rates a property's energy efficiency. Only required if you're selling or renting the property, but recommended post-renovation for resale value.
            </p>

            <h4 className="font-semibold mb-3">Costs:</h4>
            <div className="space-y-2 text-slate-700">
              <p><strong>EPC rating:</strong> £60-150</p>
              <p className="text-sm mt-3"><em>Not usually required for renovations, but getting one post-work proves energy improvements for future resale.</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Cost Example</h2>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Bathroom Renovation With New Electrics</h3>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between border-b pb-2">
                <span>Building Regulations approval:</span>
                <span>£500</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Electrical certification (included in labour):</span>
                <span>£0</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Gas safety (if new boiler/heating):</span>
                <span>£150</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Building Control inspections (multiple visits):</span>
                <span>£300</span>
              </div>
              <div className="flex justify-between font-bold pt-2">
                <span>Total Compliance Cost:</span>
                <span className="text-orange-600">£950</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Structural Extension</h3>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between border-b pb-2">
                <span>Planning permission application:</span>
                <span>£300</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Structural engineer (design + certification):</span>
                <span>£3,000</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Building Regulations:</span>
                <span>£700</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Building Control inspections:</span>
                <span>£400</span>
              </div>
              <div className="flex justify-between font-bold pt-2">
                <span>Total Compliance Cost:</span>
                <span className="text-orange-600">£4,400</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              <em>Structural work significantly increases compliance costs due to engineer requirements.</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Key Points</h2>
          <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
            <li><strong>Compliance is not optional:</strong> It's a legal requirement. Unpermitted work affects resale value significantly</li>
            <li><strong>Check what you need first:</strong> Talk to your Local Authority/Control. Some projects need both planning and Building Regs; some only need one</li>
            <li><strong>Get written approval:</strong> Always get official documentation of compliance—you'll need it for sale/insurance</li>
            <li><strong>Don't skip professional certification:</strong> DIY electrical work voids insurance. Get certified tradespeople</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Quote with no mention of compliance:</strong> Major oversight or deliberately ignored</li>
            <li><strong>"We'll skip the permits":</strong> Never acceptable. Illegal and causes problems at resale</li>
            <li><strong>Tradespeople suggesting dodgy approaches:</strong> Professional tradespeople follow regulations</li>
            <li><strong>No certification provided:</strong> Essential documentation you need</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/site-setup-and-cleanup" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Site Setup & Cleanup
            </Link>
            <Link href="/costs/contingency-and-unknowns" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Contingency & Unknowns
            </Link>
            <Link href="/education" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Building Regulations Guide
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
