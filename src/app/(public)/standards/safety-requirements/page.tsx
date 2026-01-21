import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Construction Safety Requirements | BUILDR',
  description: 'Health and safety standards, PPE requirements, site safety regulations, and contractor responsibilities in construction.',
  keywords: 'construction safety, health and safety, PPE, site safety, safety standards',
};

export default function SafetyRequirementsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/standards" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Standards & Quality
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Construction Safety Requirements</h1>
          <p className="text-lg text-slate-200">
            Legal safety standards, PPE requirements, site safety regulations, and what contractors must do.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
            <p className="font-bold text-slate-900 text-lg">Safety is not optional. If a contractor doesn't take safety seriously, don't hire them.</p>
          </div>

          <h2 className="text-2xl font-bold mb-4">Health and Safety at Work Act (HSAWA)</h2>
          <p className="text-slate-700 mb-4">
            In the UK, construction work is governed by the Health and Safety at Work etc. Act 1974 and the Construction (Design and Management) Regulations 2015. These are legal requirements, not guidelines.
          </p>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="text-slate-700 mb-3">Contractors must:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Provide a safe working environment</li>
              <li>Identify and manage hazards</li>
              <li>Provide necessary safety equipment</li>
              <li>Ensure competent supervision</li>
              <li>Maintain safety records and incident reporting</li>
              <li>Have appropriate insurance</li>
              <li>Comply with Building Regulations and site safety standards</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Personal Protective Equipment (PPE)</h2>
          <p className="text-slate-700 mb-4">
            Every contractor on site should wear appropriate PPE. This includes:
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-8">
            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-3">Always Required</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Hard hat or bump cap</li>
                <li>Safety boots (not trainers)</li>
                <li>High-visibility clothing</li>
                <li>Gloves (appropriate to task)</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-3">Trade-Specific</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Dust masks/respirators (painting, sanding)</li>
                <li>Hearing protection (power tools)</li>
                <li>Eye protection (grinding, welding)</li>
                <li>Fall protection (working at height)</li>
                <li>Knee pads (tiling, laying floors)</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Working at Height</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Falls account for a significant proportion of construction injuries.</p>
            <p className="text-slate-700 mb-4">Any work above 2 metres must have:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Proper scaffolding (not just ladders)</li>
              <li>Fall arrest systems if scaffolding not possible</li>
              <li>Edge protection and guard rails</li>
              <li>Safety netting where appropriate</li>
              <li>Trained personnel for scaffold assembly</li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="text-slate-700 mb-3">
              <strong>What to look for:</strong> If contractors are standing on chairs, using ladders for extended periods, or working on unprotected edges, stop work immediately. This is against regulations and unsafe.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Site Safety Responsibilities</h2>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Contractor's Responsibilities</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Keep site tidy (trip hazards, debris removal)</li>
                <li>Protect adjacent areas (dust sheets, barriers)</li>
                <li>Secure tools and equipment (prevent theft, safety)</li>
                <li>Manage waste appropriately (hazardous materials noted)</li>
                <li>Protect utilities (know where gas/electric/water are)</li>
                <li>Provide hand washing facilities</li>
                <li>Report accidents and near-misses</li>
                <li>Maintain safety records on site</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Your Responsibilities (Homeowner)</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Ensure contractor has insurance</li>
                <li>Inform contractor of any hazards (asbestos, damp, etc.)</li>
                <li>Allow proper access for safe working</li>
                <li>Don't interfere with safety measures</li>
                <li>Keep family/pets away from active work areas</li>
                <li>Provide utilities access if requested</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Trade-Specific Safety Requirements</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Electrical Work</h3>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-3">
                <p className="text-slate-700 font-semibold">Only qualified electricians (Part P certification) should do electrical work. This is a legal requirement in the UK.</p>
              </div>
              <p className="text-slate-700">
                Safety: Isolation of circuits, proper testing, no makeshift solutions, certification provided on completion. Improper electrical work causes fires and electrocution.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Gas Work</h3>
              <p className="text-slate-700 mb-2">
                Only Gas Safe registered engineers can work on gas appliances or piping. Any gas work must be certified.
              </p>
              <p className="text-slate-700">
                Safety: Proper pressure testing, leak detection, ventilation verification, safety certification on completion.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Roofing & Heights</h3>
              <p className="text-slate-700 mb-2">
                Roof work requires properly trained personnel and full fall protection systems.
              </p>
              <p className="text-slate-700">
                Safety: Scaffolding or fall arrest, edge protection, trained crew, no shortcuts.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Painting & Sanding</h3>
              <p className="text-slate-700 mb-2">
                Dust and fume control essential. Older properties may contain asbestos or lead paint.
              </p>
              <p className="text-slate-700">
                Safety: HEPA filters, respirators where needed, containment, hazard testing for asbestos, proper waste disposal.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">Asbestos Hazards</h3>
              <p className="text-slate-700 mb-2">
                Asbestos was used in UK construction until 1999. If you suspect asbestos, it must be professionally assessed before any work.
              </p>
              <p className="text-slate-700">
                Safety: Licensed asbestos surveyor to identify, licensed asbestos removal specialist to remove. Never attempt DIY removal.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Insurance Requirements</h2>
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <p className="text-slate-700 mb-3">Before hiring, verify contractor has:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Public Liability Insurance:</strong> Minimum £6 million (covers damage to your property)</li>
              <li><strong>Employers Liability Insurance:</strong> If they employ staff (covers injury to employees)</li>
              <li><strong>Professional Indemnity:</strong> For design/specification work (architects, surveyors)</li>
              <li><strong>Tools & Equipment Insurance:</strong> Covers theft/damage of their equipment</li>
            </ul>
            <p className="text-slate-700 mt-4 font-semibold">
              Ask for a copy of insurance certificates. Don't rely on verbal assurance. Uninsured contractors leave you liable.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Manual Handling Safety</h2>
          <p className="text-slate-700 mb-4">
            Contractors must use proper lifting techniques and mechanical aids where available:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Heavy materials (stone, wood, plaster) must be lifted correctly or using mechanical aids</li>
            <li>Proper footwear required (not flip-flops or unsuitable shoes)</li>
            <li>Regular breaks to prevent fatigue-related injuries</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Site Hazards to Report</h2>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">If you see any of these, stop work and discuss with your contractor:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Workers without proper PPE</li>
              <li>Unsafe ladder use or working at heights without protection</li>
              <li>Live wires or improperly isolated electrics</li>
              <li>Trip hazards, debris, or poor housekeeping</li>
              <li>Lack of scaffolding where needed</li>
              <li>No containment for dust or asbestos work</li>
              <li>Heavy material handling without proper equipment</li>
              <li>Injury or accident without incident reporting</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Incident Reporting</h2>
          <p className="text-slate-700 mb-4">
            Any injury, however minor, must be reported and documented by the contractor. Serious incidents must be reported to the Health & Safety Executive (HSE).
          </p>
          <p className="text-slate-700 mb-6">
            If someone is injured on your property during work, you need to know about it for insurance and liability purposes.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Building Regulations Compliance</h2>
          <p className="text-slate-700 mb-4">
            Certain work requires Building Regulations compliance and inspection. This overlaps with safety:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Structural work:</strong> Requires engineer approval and building control certification</li>
            <li><strong>Electrical work:</strong> Part P certification mandatory</li>
            <li><strong>Gas work:</strong> Gas Safe certification mandatory</li>
            <li><strong>Insulation/windows:</strong> Must meet thermal performance standards</li>
            <li><strong>Bathrooms/kitchens:</strong> Ventilation and drainage must meet standards</li>
          </ul>

          <div className="bg-slate-100 rounded-lg p-6 my-8">
            <p className="text-slate-700 font-semibold mb-2">Working with unregistered/uncertified contractors may:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Void your warranty and future insurance claims</li>
              <li>Make your house un-mortgageable</li>
              <li>Result in costly remedial work to bring it up to standard</li>
              <li>Expose you to liability if someone is injured</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Questions to Ask Before Hiring</h2>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>"Can you provide proof of current insurance?"</li>
              <li>"Do you have any relevant certifications (Gas Safe, Part P, etc.)?"</li>
              <li>"What is your approach to site safety?"</li>
              <li>"How do you handle accidents or incidents?"</li>
              <li>"Can you provide references from recent projects?"</li>
              <li>"Are you registered with any trade bodies?"</li>
              <li>"What PPE and safety equipment do you provide?"</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Your Right to Refuse Unsafe Work</h2>
          <p className="text-slate-700 mb-6">
            You have the legal right to refuse work that doesn't meet safety standards. Better to lose a day than to compromise safety and risk your family's wellbeing.
          </p>

          <div className="bg-slate-100 rounded-lg p-6">
            <p className="text-slate-700">
              <strong>Safety should never be compromised for cost or schedule.</strong> A contractor who cuts corners on safety is likely cutting corners on quality too. Choose contractors who take safety seriously—they're the ones you can trust with your home.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Standards & Quality Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Workmanship Standards
            </Link>
            <Link href="/standards/building-regulations" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Building Regulations
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
