import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Construction Costs — TISSCA',
  description:
    'Complete guide to UK construction costs. Materials, labour, equipment, permits, and contingency — with transparent pricing data.',
  keywords:
    'construction costs, building costs, labour costs, materials cost, UK pricing',
};

const costCategories = [
  { name: 'Materials & Supplies', slug: 'materials-and-supplies', desc: 'Quality tiers, waste factors, and how to get value.' },
  { name: 'Labour Costs', slug: 'labour-costs', desc: 'Understanding daily rates and skill levels.' },
  { name: 'Equipment & Tool Hire', slug: 'equipment-and-tool-hire', desc: 'Scaffolding, access, and specialist equipment.' },
  { name: 'Site Setup & Cleanup', slug: 'site-setup-and-cleanup', desc: 'Protection, waste removal, and restoration.' },
  { name: 'Permits & Compliance', slug: 'permits-and-compliance', desc: 'Building regulations, certification, and approvals.' },
  { name: 'Contingency & Unknowns', slug: 'contingency-and-unknowns', desc: 'Why buffer costs are essential and realistic.' },
];

const tradeCosts = [
  { name: 'Painting', slug: 'painting-costs' },
  { name: 'Tiling', slug: 'tiling-costs' },
  { name: 'Plastering', slug: 'plastering-costs' },
  { name: 'Flooring', slug: 'flooring-costs' },
  { name: 'Electrical', slug: 'electrical-costs' },
  { name: 'Plumbing', slug: 'plumbing-costs' },
  { name: 'Roofing', slug: 'roofing-costs' },
  { name: 'Kitchen Fitting', slug: 'kitchen-fitting-costs' },
  { name: 'Bathroom Renovation', slug: 'bathroom-renovation-costs' },
  { name: 'Wardrobe Fitting', slug: 'wardrobe-fitting-costs' },
];

const principles = [
  { title: 'You Get What You Pay For', body: 'Budget work means shortcuts. Professional work costs more because it lasts longer and looks better.' },
  { title: 'Labour is 60-70% of Most Costs', body: 'What varies most is skill, experience, and efficiency. A skilled tradesperson works faster with fewer mistakes.' },
  { title: 'Regional Differences Are Real', body: 'London prices are 30-50% higher than Midlands prices — driven by living costs, not greed.' },
  { title: 'Contingency Isn\'t Greed', body: '10-15% contingency covers hidden damp, asbestos, structural surprises, and design changes.' },
  { title: 'Transparent Pricing Builds Trust', body: 'Professional quotes break down materials, labour, and overhead. Vague quotes are red flags.' },
];

export default function CostsPage() {
  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Header */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          <p className="text-[#cbb26b] font-semibold text-sm uppercase tracking-wide mb-2">Cost Reference</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">How Much Should Construction Cost?</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Transparent UK construction pricing data. Understand every line of a quote — the knowledge built into TISSCA's estimating engine.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">

          {/* Cost Breakdown Intro */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-4">What Goes Into a Quote</h2>
            <p className="text-slate-600 leading-relaxed mb-6 max-w-3xl">
              Construction costs are often misunderstood. Tradespeople may quote £5,000 for work that others charge £10,000 for. This section breaks down every cost component so you can read any quote with confidence.
            </p>
          </div>

          {/* Cost Category Grid */}
          <div className="grid md:grid-cols-2 gap-5 mb-16">
            {costCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/costs/${cat.slug}`}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#cbb26b]/40 transition-all p-6 no-underline"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#b89b4a] transition-colors">{cat.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-3">{cat.desc}</p>
                <span className="text-[#cbb26b] font-semibold text-sm">Read More →</span>
              </Link>
            ))}
          </div>

          {/* Costs by Trade */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 mb-14">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Costs by Trade</h2>
            <p className="text-slate-500 text-sm mb-6">
              Different trades have different cost drivers. Select a trade to see detailed breakdowns.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {tradeCosts.map((t) => (
                <Link
                  key={t.slug}
                  href={`/costs/${t.slug}`}
                  className="flex items-center gap-2 text-sm text-slate-700 hover:text-[#b89b4a] font-medium transition-colors no-underline"
                >
                  <svg className="w-4 h-4 text-[#cbb26b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  {t.name} Costs
                </Link>
              ))}
            </div>
          </div>

          {/* Key Principles */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 mb-14">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Key Principles of Fair Pricing</h2>
            <div className="space-y-5">
              {principles.map((p, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-7 h-7 rounded-lg bg-[#cbb26b]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#cbb26b] font-bold text-xs">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-0.5">{p.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-[#0b141b] rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Turn knowledge into quotes</h2>
              <p className="text-white/50 max-w-lg">
                TISSCA's built-in calculators and quoting engine use real cost data to generate professional quotes in seconds.
              </p>
            </div>
            <Link
              href="/calculators"
              className="shrink-0 inline-flex items-center px-6 py-3 bg-[#cbb26b] hover:bg-[#b89b4a] text-[#0b141b] font-semibold rounded-xl transition-colors no-underline"
            >
              View Calculators
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
