// src/components/ToolsMockup.tsx
// Premium CSS phone mockup — authentic TISSCA Tools screen.
// Matches the real app: dark navy, gold accents, category grid.
// No external images — pure Tailwind + inline SVG.

'use client';

const categories = [
  { name: 'General', desc: 'Everyday trade helpers', hasBadge: true },
  { name: 'Kitchens', desc: 'Fitting & materials' },
  { name: 'Bathrooms', desc: 'Sanitaryware & tiling' },
  { name: 'Bedrooms', desc: 'Wardrobes & fittings' },
  { name: 'Flooring', desc: 'Area, packs, waste' },
  { name: 'Paint & Decor', desc: 'Coverage calc' },
  { name: 'Carpentry', desc: 'Timber, fixings, time' },
  { name: 'Electrical', desc: 'Wiring, sockets, lights' },
];

/* Simple category SVG icons — small enough to be recognisable */
const catIcons: Record<string, JSX.Element> = {
  General: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Kitchens: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  Bathrooms: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
      <path d="M6 12V5a2 2 0 0 1 2-2h2v3" />
    </svg>
  ),
  Bedrooms: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 14h20" />
      <path d="M12 4v10" />
    </svg>
  ),
  Flooring: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18" />
      <path d="M12 3v18" />
    </svg>
  ),
  'Paint & Decor': (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="16" height="10" rx="2" />
      <path d="M18 6h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1" />
      <path d="M10 12v8a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-8" />
    </svg>
  ),
  Carpentry: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Electrical: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
    </svg>
  ),
};

export function ToolsMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Warm glow */}
      <div className="absolute inset-0 -inset-x-12 -inset-y-6 bg-[#cbb26b]/[0.05] rounded-[50px] blur-[70px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-8 w-[160px] h-[160px] bg-[#2d4152]/[0.12] rounded-full blur-[50px] pointer-events-none" />

      {/* Phone frame */}
      <div className="relative w-[240px] sm:w-[260px] mx-auto">
        <div className="rounded-[36px] border-[3px] border-white/[0.12] bg-gradient-to-b from-[#1a2b38] to-[#0b141b] p-[6px] shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="rounded-[30px] overflow-hidden bg-[#0b141b]">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1.5">
              <span className="text-[10px] font-medium text-white/50">12:42</span>
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white/40">
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                </svg>
                <svg width="14" height="12" viewBox="0 0 24 14" fill="currentColor" className="text-white/40">
                  <rect x="0" y="3" width="3" height="11" rx="1" />
                  <rect x="5" y="0" width="3" height="14" rx="1" />
                  <rect x="10" y="4" width="3" height="10" rx="1" />
                  <rect x="15" y="7" width="3" height="7" rx="1" />
                </svg>
              </div>
            </div>

            {/* Header — matches real Tools screen */}
            <div className="px-4 pt-1 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-white italic tracking-tight">Tools</p>
                  <p className="text-[7px] text-white/40 mt-0.5 leading-snug">Calculators, fitting estimates and material pricing.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <div className="relative">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[5px] font-bold text-white">3</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/50" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category grid — 2 columns, matching real app */}
            <div className="px-3 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <div key={cat.name} className="relative rounded-xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                    {cat.hasBadge && (
                      <span className="absolute top-2 right-2 text-[6px] font-bold bg-[#cbb26b]/20 text-[#cbb26b] px-1.5 py-0.5 rounded-full">Pro</span>
                    )}
                    <div className="w-6 h-6 rounded-lg bg-[#cbb26b]/10 flex items-center justify-center mb-1.5">
                      {catIcons[cat.name]}
                    </div>
                    <p className="text-[10px] font-semibold text-white leading-none">{cat.name}</p>
                    <p className="text-[7px] text-white/35 mt-0.5 leading-snug">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom nav — gold active Tools tab */}
            <div className="flex items-center justify-around px-2 py-2 border-t border-white/[0.06] bg-white/[0.02]">
              {/* Home */}
              <div className="flex flex-col items-center gap-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/25" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <span className="text-[7px] font-medium text-white/25">Home</span>
              </div>
              {/* Tools — active */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9 rounded-2xl bg-[#cbb26b]/15 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <span className="text-[7px] font-medium text-[#cbb26b]">Tools</span>
              </div>
              {/* Work */}
              <div className="flex flex-col items-center gap-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/25" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span className="text-[7px] font-medium text-white/25">Work</span>
              </div>
              {/* Planner */}
              <div className="flex flex-col items-center gap-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/25" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="text-[7px] font-medium text-white/25">Planner</span>
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2">
              <div className="w-[90px] h-[4px] rounded-full bg-white/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
