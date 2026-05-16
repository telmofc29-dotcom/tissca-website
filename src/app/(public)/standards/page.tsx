import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quality Standards — TISSCA',
  description:
    'Construction quality standards for workmanship, materials, safety, regulations, and finishing. Built-in knowledge that powers TISSCA quality tools.',
  keywords:
    'construction standards, quality standards, building regulations, safety standards, workmanship',
};

const standards = [
  {
    title: 'Workmanship Standards',
    href: '/standards/workmanship',
    desc: 'Professional workmanship at Budget, Standard, and Premium tiers. How to inspect finished work.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.25-3.033a.75.75 0 010-1.3l5.25-3.032a.75.75 0 01.75 0l5.25 3.033a.75.75 0 010 1.3l-5.25 3.032a.75.75 0 01-.75 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5l7.5 4.33 7.5-4.33" />
      </svg>
    ),
  },
  {
    title: 'Material Quality',
    href: '/standards/material-quality',
    desc: 'Material grades, durability expectations, and lifecycle costs for every trade.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    title: 'Safety Requirements',
    href: '/standards/safety-requirements',
    desc: 'Health & safety regulations, PPE, site safety, and contractor responsibilities.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Building Regulations',
    href: '/standards/building-regulations',
    desc: 'Compliance, certification, and what work requires approval.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Finishing Quality',
    href: '/standards/finishing-quality',
    desc: 'Quality expectations for finishes — good, acceptable, and poor.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
];

export default function StandardsPage() {
  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Header */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          <p className="text-[#cbb26b] font-semibold text-sm uppercase tracking-wide mb-2">Quality Reference</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Construction Standards</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Understand professional quality expectations for workmanship, materials, safety, and compliance — the knowledge built into every TISSCA tool.
          </p>
        </div>
      </section>

      {/* Standards Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-5 mb-14">
            {standards.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#cbb26b]/40 transition-all p-6 no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-[#cbb26b]/10 flex items-center justify-center mb-4 text-[#cbb26b] group-hover:bg-[#cbb26b]/20 transition-colors">
                  {s.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#b89b4a] transition-colors">{s.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                <span className="text-[#cbb26b] font-semibold text-sm">Explore →</span>
              </Link>
            ))}
          </div>

          {/* Why Standards Matter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Why Standards Matter</h2>
            <p className="text-slate-600 mb-5 leading-relaxed">
              Construction standards protect property, safety, and value. They ensure:
            </p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                'Work is done safely without risk to people or property',
                'Materials and workmanship meet professional standards',
                'Buildings last decades with proper maintenance',
                'Work meets Building Regulations and legal requirements',
                'Compliant work protects and maintains property value',
                'Proper work is covered by insurance',
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <svg className="w-5 h-5 text-[#cbb26b] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-600 text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related: Cost Guides */}
          <div className="bg-[#0b141b] rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Standards by Trade</h2>
              <p className="text-white/50 max-w-lg">
                View detailed cost & quality guides broken down by trade — painting, electrical, tiling, plumbing, and more.
              </p>
            </div>
            <Link
              href="/costs"
              className="shrink-0 inline-flex items-center px-6 py-3 bg-[#cbb26b] hover:bg-[#b89b4a] text-[#0b141b] font-semibold rounded-xl transition-colors no-underline"
            >
              View Cost Guides
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
