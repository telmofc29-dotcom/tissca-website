// src/components/AppMockup.tsx v2.0
// Premium CSS phone mockup — authentic TISSCA Dashboard screen.
// Matches the real app: dark navy, gold accents, quick actions, earnings.
// No external images — pure Tailwind + inline SVG.

'use client';

export function AppMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow behind device — warm gold + navy blend */}
      <div className="absolute inset-0 -inset-x-16 -inset-y-8 bg-[#cbb26b]/[0.06] rounded-[60px] blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 -left-12 w-[200px] h-[200px] bg-[#2d4152]/[0.14] rounded-full blur-[60px] pointer-events-none" />

      {/* ── Floating notification (top-left) ── */}
      <div className="absolute -top-4 -left-8 sm:-left-16 z-20 animate-[floatCard_6s_ease-in-out_infinite]">
        <div className="rounded-xl border border-white/[0.10] bg-[#141e2a]/90 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#cbb26b]/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white leading-none">Quote Accepted</p>
              <p className="text-[8px] text-white/40 mt-0.5 leading-none">Kitchen Reno · £4,250</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating revenue badge (bottom-right) ── */}
      <div className="absolute -bottom-2 -right-6 sm:-right-14 z-20 animate-[floatBadge_7s_ease-in-out_infinite_0.5s]">
        <div className="rounded-xl border border-white/[0.10] bg-[#141e2a]/90 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#cbb26b]/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white leading-none">Monthly Revenue</p>
              <p className="text-[13px] font-bold text-[#cbb26b] mt-0.5 leading-none">£12,480 <span className="text-[8px] text-[#cbb26b]/60">↑ 18%</span></p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* Phone frame */}
      <div className="relative w-[260px] sm:w-[280px] mx-auto">
        <div className="rounded-[36px] border-[3px] border-white/[0.12] bg-gradient-to-b from-[#1a2b38] to-[#0b141b] p-[6px] shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="rounded-[30px] overflow-hidden bg-[#0b141b]">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1.5">
              <span className="text-[10px] font-medium text-white/50">9:41</span>
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

            {/* Dashboard header — matches real app */}
            <div className="px-4 pt-1 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-white tracking-tight">Dashboard</p>
                  <p className="text-[7px] text-white/40 mt-0.5 leading-snug max-w-[145px]">Your performance, schedule and payments at a glance.</p>
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

            {/* Quick actions card — gold CTA */}
            <div className="px-3 pb-2">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[10px] font-semibold text-white mb-2">Quick actions</p>
                <div className="rounded-lg bg-[#cbb26b] px-3 py-2 text-center mb-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0b141b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <p className="text-[10px] font-semibold text-[#0b141b]">Create a quote</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {['Add task', 'Add asset', 'Calendar'].map((label) => (
                    <div key={label} className="flex-1 rounded-lg border border-white/[0.08] px-1.5 py-1.5 text-center">
                      <p className="text-[7px] text-white/50 font-medium">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Earnings Overview — gold metrics */}
            <div className="px-3 pb-2">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-[#cbb26b]/20 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#cbb26b]">£</span>
                  </div>
                  <p className="text-[10px] font-semibold text-white">Earnings Overview</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Year gross', value: '£0' },
                    { label: 'Month gross', value: '£0' },
                    { label: 'Month net', value: '£0' },
                    { label: 'Materials / expenses', value: '£0' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2 py-1.5">
                      <p className="text-[6px] text-white/35 leading-none">{m.label}</p>
                      <p className="text-[11px] font-bold text-[#cbb26b] mt-0.5 leading-none">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Outstanding + Conversion */}
            <div className="px-3 pb-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                  <p className="text-[7px] text-white/35">Outstanding</p>
                  <p className="text-[13px] font-bold text-white mt-0.5 leading-none">£0</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                  <p className="text-[7px] text-white/35">Conversion</p>
                  <p className="text-[13px] font-bold text-white mt-0.5 leading-none">0%</p>
                </div>
              </div>
            </div>

            {/* Bottom nav — gold active Home tab */}
            <div className="flex items-center justify-around px-2 py-2 border-t border-white/[0.06] bg-white/[0.02]">
              {/* Home — active */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9 rounded-2xl bg-[#cbb26b]/15 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cbb26b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <span className="text-[7px] font-medium text-[#cbb26b]">Home</span>
              </div>
              {/* Tools */}
              <div className="flex flex-col items-center gap-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/25" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className="text-[7px] font-medium text-white/25">Tools</span>
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
