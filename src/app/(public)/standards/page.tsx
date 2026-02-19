import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Construction Standards & Quality | TISSCA',
  description: 'Quality standards for construction work. Learn about workmanship, materials, safety, regulations, and finishing quality expectations.',
  keywords: 'construction standards, quality standards, building regulations, safety standards, workmanship',
};

export default function StandardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Construction Standards & Quality</h1>
          <p className="text-lg text-slate-200">
            Understand quality expectations, safety standards, regulations, and what professional work should deliver.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-blue-600">
            <h2 className="text-2xl font-bold mb-3">
              <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700">
                Workmanship Standards
              </Link>
            </h2>
            <p className="text-slate-600 mb-4">
              What professional workmanship looks like at Budget, Standard, and Premium tiers. How to inspect finished work and identify poor craftsmanship.
            </p>
            <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700 font-semibold">
              Explore → 
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-emerald-600">
            <h2 className="text-2xl font-bold mb-3">
              <Link href="/standards/material-quality" className="text-emerald-600 hover:text-emerald-700">
                Material Quality Standards
              </Link>
            </h2>
            <p className="text-slate-600 mb-4">
              Material grades, durability expectations, and lifecycle costs. How to choose quality materials that last and understand why cheap materials cost more over time.
            </p>
            <Link href="/standards/material-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              Explore →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-red-600">
            <h2 className="text-2xl font-bold mb-3">
              <Link href="/standards/safety-requirements" className="text-red-600 hover:text-red-700">
                Safety Requirements
              </Link>
            </h2>
            <p className="text-slate-600 mb-4">
              Health and safety standards, PPE requirements, site safety regulations, and contractor safety responsibilities. Why safety should never be compromised.
            </p>
            <Link href="/standards/safety-requirements" className="text-blue-600 hover:text-blue-700 font-semibold">
              Explore →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-amber-600">
            <h2 className="text-2xl font-bold mb-3">
              <Link href="/standards/building-regulations" className="text-amber-600 hover:text-amber-700">
                Building Regulations & Compliance
              </Link>
            </h2>
            <p className="text-slate-600 mb-4">
              Building Regulations requirements, compliance standards, and necessary certifications. What work requires approval and why non-compliance creates liability.
            </p>
            <Link href="/standards/building-regulations" className="text-blue-600 hover:text-blue-700 font-semibold">
              Explore →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-purple-600 md:col-span-2 lg:col-span-1">
            <h2 className="text-2xl font-bold mb-3">
              <Link href="/standards/finishing-quality" className="text-purple-600 hover:text-purple-700">
                Finishing Quality Standards
              </Link>
            </h2>
            <p className="text-slate-600 mb-4">
              Quality expectations for finishes by tier. What good, acceptable, and poor finishes look like. How to inspect finish quality.
            </p>
            <Link href="/standards/finishing-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              Explore →
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-8 rounded mb-12">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">Why Standards Matter</h2>
          <p className="text-slate-700 mb-4">
            Construction standards exist to protect you. They ensure:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><strong>Safety:</strong> Work is done safely without risk to people or property</li>
            <li><strong>Quality:</strong> Materials and workmanship meet professional standards</li>
            <li><strong>Durability:</strong> Your home will last decades with proper maintenance</li>
            <li><strong>Legal compliance:</strong> Work meets Building Regulations and other legal requirements</li>
            <li><strong>Property value:</strong> Compliant work protects and maintains your home's value</li>
            <li><strong>Insurance:</strong> Proper work is covered by insurance; non-compliant work may not be</li>
          </ul>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-8 rounded mb-12">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">Before You Hire</h2>
          <p className="text-slate-700 mb-4">
            Use these guides to understand what to expect at each quality tier. Then:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-700">
            <li><strong>Specify tier:</strong> Clearly state whether you want Budget, Standard, or Premium work</li>
            <li><strong>Verify credentials:</strong> Check insurance, certifications, trade memberships</li>
            <li><strong>Inspect during work:</strong> Weekly walkthroughs to verify standards are being met</li>
            <li><strong>Inspect on completion:</strong> Final walkthrough before final payment, with punch list if needed</li>
            <li><strong>Get certification:</strong> Obtain warranties, Building Regulations certificates, and guarantees in writing</li>
          </ol>
        </div>

        <div className="bg-slate-100 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Quick Reference: Standards by Trade</h2>
          <p className="text-slate-700 mb-6">
            Different trades have different standards. For detailed information about specific trades, visit the relevant cost page:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/painting-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Painting Standards</Link>
            <Link href="/costs/electrical-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Electrical Standards</Link>
            <Link href="/costs/tiling-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Tiling Standards</Link>
            <Link href="/costs/plumbing-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Plumbing Standards</Link>
            <Link href="/costs/roofing-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Roofing Standards</Link>
            <Link href="/costs/bathroom-renovation-costs" className="text-blue-600 hover:text-blue-700 font-semibold">→ Bathroom Standards</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
