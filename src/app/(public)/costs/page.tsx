import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Construction Costs - How Much Should You Spend? | TISSCA',
  description: 'Complete guide to UK construction costs. Understand materials, labour, equipment, permits, and contingency. Real pricing ranges and professional insights.',
  keywords: 'construction costs, building costs, labour costs, materials cost, UK pricing',
};

export default function CostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">
            How Much Should Construction Cost?
          </h1>
          <p className="text-xl text-slate-200">
            Understand construction pricing in the UK. Real data, transparent pricing, and professional insight.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-3xl font-bold mb-6">Construction Costs Explained</h2>
          
          <p className="text-lg text-slate-700 mb-8">
            Construction costs are often misunderstood. Tradespeople may quote £5,000 for work that others charge £10,000 for, leaving clients confused about fair pricing and quality expectations.
          </p>

          <p className="text-lg text-slate-700 mb-8">
            This section breaks down every cost component:
          </p>

          <ul className="space-y-6 mb-12">
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">1.</span>
              <div>
                <strong>Materials & Supplies</strong>
                <p className="text-slate-700">What you're buying, quality tiers, and waste factors</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">2.</span>
              <div>
                <strong>Labour Costs</strong>
                <p className="text-slate-700">Why skilled workers cost more and what justifies daily rates</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">3.</span>
              <div>
                <strong>Equipment & Tool Hire</strong>
                <p className="text-slate-700">Scaffolding, ladders, power tools, and access equipment</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">4.</span>
              <div>
                <strong>Site Setup & Cleanup</strong>
                <p className="text-slate-700">Protecting your home and proper site management</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">5.</span>
              <div>
                <strong>Permits & Compliance</strong>
                <p className="text-slate-700">Building regulation certification and legal requirements</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">6.</span>
              <div>
                <strong>Contingency & Unknowns</strong>
                <p className="text-slate-700">Why 10-15% contingency isn't greed—it's realistic</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-blue-600 font-bold min-w-8">7.</span>
              <div>
                <strong>Project Overhead & Management</strong>
                <p className="text-slate-700">Administration, site management, and business costs</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Cost Categories Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Link href="/costs/materials-and-supplies" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Materials & Supplies</h3>
              <p className="text-slate-600 mb-4">Quality tiers, waste factors, and how to get value</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>

          <Link href="/costs/labour-costs" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Labour Costs</h3>
              <p className="text-slate-600 mb-4">Understanding daily rates and skill levels</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>

          <Link href="/costs/equipment-and-tool-hire" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Equipment & Tool Hire</h3>
              <p className="text-slate-600 mb-4">Scaffolding, access, and specialist equipment</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>

          <Link href="/costs/site-setup-and-cleanup" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Site Setup & Cleanup</h3>
              <p className="text-slate-600 mb-4">Protection, waste removal, and restoration</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>

          <Link href="/costs/permits-and-compliance" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Permits & Compliance</h3>
              <p className="text-slate-600 mb-4">Building regulations, certification, and approvals</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>

          <Link href="/costs/contingency-and-unknowns" className="group">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Contingency & Unknowns</h3>
              <p className="text-slate-600 mb-4">Why buffer costs are essential and realistic</p>
              <span className="text-blue-600 font-semibold">Read More →</span>
            </div>
          </Link>
        </div>

        {/* By Trade Costs */}
        <div className="bg-slate-50 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6">Costs by Trade</h2>
          <p className="text-slate-700 mb-6">
            Different trades have different cost drivers. Some are labour-intensive, others are material-heavy. Understand what affects pricing in your specific trade:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/painting-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Painting Costs
            </Link>
            <Link href="/costs/tiling-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Tiling Costs
            </Link>
            <Link href="/costs/plastering-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Plastering Costs
            </Link>
            <Link href="/costs/flooring-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Flooring Costs
            </Link>
            <Link href="/costs/electrical-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Electrical Costs
            </Link>
            <Link href="/costs/plumbing-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Plumbing Costs
            </Link>
            <Link href="/costs/roofing-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Roofing Costs
            </Link>
            <Link href="/costs/kitchen-fitting-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Kitchen Fitting Costs
            </Link>
            <Link href="/costs/bathroom-renovation-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Bathroom Renovation Costs
            </Link>
            <Link href="/costs/wardrobe-fitting-costs" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2">
              → Wardrobe Fitting Costs
            </Link>
          </div>
        </div>

        {/* Key Principles */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-900">Key Principles of Fair Construction Pricing</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">1. You Get What You Pay For</h3>
              <p className="text-slate-700">
                The cheapest quote is often the cheapest price, not the cheapest cost. Budget work typically means shortcuts in preparation, quality, and finish. Professional work costs more because it lasts longer and looks better.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">2. Labour is 60-70% of Most Costs</h3>
              <p className="text-slate-700">
                Materials are relatively fixed. What varies dramatically is labour—skill, experience, efficiency, and quality control. A skilled tradesperson works faster, makes fewer mistakes, and delivers better results.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">3. Regional Differences Are Real</h3>
              <p className="text-slate-700">
                London prices are 30-50% higher than Midlands prices. Not because London tradespeople are greedier, but because living costs, rent, and competition are different. Regional pricing is justified and realistic.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">4. Contingency Isn't Greed</h3>
              <p className="text-slate-700">
                10-15% contingency is industry standard. It's not a margin—it's budget for unknowns: hidden damp, asbestos, structural issues, or design changes. These happen on most projects.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">5. Transparent Pricing Builds Trust</h3>
              <p className="text-slate-700">
                Professional quotes break down materials, labour, and overhead. Vague quotes are red flags. You should understand exactly what you're paying for.
              </p>
            </div>
          </div>
        </div>

        {/* Tools & Resources */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Use Our Tools</h2>
          <p className="mb-6">
            TISSCA provides calculators to help you estimate costs transparently:
          </p>
          <Link href="/calculators" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-colors">
            View All Calculators
          </Link>
        </div>
      </section>
    </div>
  );
}
