import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documents & Invoicing — TISSCA',
  description:
    'Generate professional quotes and invoices in seconds with TISSCA. Templates, price book, PDF export, and more.',
};

const mainActions = [
  {
    title: 'Generate Quote',
    href: '/docs/quote',
    desc: 'Create professional quotes with automatic numbering and calculations.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Generate Invoice',
    href: '/docs/invoice',
    desc: 'Send professional invoices with payment terms and due dates.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const resources = [
  {
    title: 'Templates',
    href: '/docs/templates',
    desc: 'Choose or customise document templates to match your brand.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: 'Price Book',
    href: '/docs/price-book',
    desc: 'Manage your service library and pricing for quick document creation.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

const features = [
  { title: 'Auto Numbering', desc: 'Sequential numbering: Q-000001, INV-000001' },
  { title: 'Real-Time Calcs', desc: 'Instant subtotal, VAT, and total calculations' },
  { title: 'Line Items', desc: 'Flexible line-by-line pricing and descriptions' },
  { title: 'PDF Export', desc: 'Download and share professional documents' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Header */}
      <section className="bg-gradient-to-b from-[#f0f2f5] to-[#f6f7f9] pt-16 pb-12 md:pt-20 md:pb-14 border-b border-slate-200/60">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          <p className="text-[#cbb26b] font-semibold text-sm uppercase tracking-wide mb-2">Built into TISSCA</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Documents & Invoicing</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Generate professional quotes and invoices in seconds — branded, numbered, and ready to send.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">

          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {mainActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#cbb26b]/40 transition-all p-8 no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-[#cbb26b]/10 flex items-center justify-center mb-5 text-[#cbb26b] group-hover:bg-[#cbb26b]/20 transition-colors">
                  {a.icon}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#b89b4a] transition-colors">{a.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{a.desc}</p>
                <span className="text-[#cbb26b] font-semibold text-sm">Get Started →</span>
              </Link>
            ))}
          </div>

          {/* Resources Row */}
          <div className="grid md:grid-cols-2 gap-5 mb-14">
            {resources.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex gap-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#cbb26b]/40 transition-all p-5 no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-[#cbb26b]/10 flex items-center justify-center shrink-0 text-[#cbb26b] group-hover:bg-[#cbb26b]/20 transition-colors">
                  {r.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-0.5 group-hover:text-[#b89b4a] transition-colors">{r.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{r.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Key Features */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 mb-14">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Key Features</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <div key={i}>
                  <div className="w-8 h-8 rounded-lg bg-[#cbb26b]/10 flex items-center justify-center mb-3">
                    <span className="text-[#cbb26b] font-bold text-xs">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-[#0b141b] rounded-2xl p-8 md:p-10 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Ready to send your first quote?</h2>
            <p className="text-white/50 mb-6 max-w-lg mx-auto">
              Sign up free and start generating professional documents in minutes. Upgrade anytime for branding, unlimited docs, and PDF export.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-[#cbb26b] hover:bg-[#b89b4a] text-[#0b141b] font-semibold rounded-xl transition-colors no-underline"
              >
                Sign Up Free
              </Link>
              <Link
                href="/#plans"
                className="inline-flex items-center px-6 py-3 border border-white/20 hover:border-white/40 text-white font-semibold rounded-xl transition-colors no-underline"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
