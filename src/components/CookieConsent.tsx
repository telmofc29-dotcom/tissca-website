/**
 * CookieConsent v3.0 — Fixed-to-viewport cookie consent bar
 * =============================================================
 * PURPOSE:
 *   Clean, light-themed cookie consent bar pinned to the bottom of the
 *   viewport. Shows immediately on first visit — no delay. Works on every
 *   background (dark or light). Full-width on mobile for easy tap targets,
 *   centred card on desktop. Inspired by Trading 212 / Stripe / Linear.
 *
 * BUSINESS RULE:
 *   - Must appear on every page until user accepts or rejects.
 *   - "Accept all" stores full consent.
 *   - "Essential only" stores limited consent.
 *   - Consent value is available for future analytics/tracking gating.
 *   - Links to /privacy for full policy.
 *
 * VERSION HISTORY:
 *   - v1.0: Dark glass aesthetic
 *   - v2.0 (2026-03-25): Light premium card, works on all backgrounds
 *   - v3.0 (2026-03-26): Instant show, mobile-first full-width, safe-area
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';

const CONSENT_KEY = 'tissca_cookie_consent';

export type ConsentLevel = 'all' | 'essential';

/** Read current consent. Returns null if user hasn't decided yet. */
export function getConsent(): ConsentLevel | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === 'all' || v === 'essential') return v;
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const { t } = useLanguage();

  /* Show immediately after first paint — no delay */
  useEffect(() => {
    if (!getConsent()) setVisible(true);
  }, []);

  function accept(level: ConsentLevel) {
    setDismissing(true);
    // Let the slide-out animation finish before unmounting
    setTimeout(() => {
      localStorage.setItem(CONSENT_KEY, level);
      setVisible(false);
    }, 300);
  }

  if (!visible) return null;

  return (
    <>
      {/* Scrim — subtle dark overlay so banner is noticeable on any page */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          dismissing ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Cookie consent"
        className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-300 ease-out ${
          dismissing
            ? 'translate-y-full opacity-0'
            : 'translate-y-0 opacity-100 animate-[cookieSlideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_forwards]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <style>{`
          @keyframes cookieSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Card — full-width bar style on mobile, centred card on desktop */}
        <div className="mx-auto max-w-2xl md:mb-4 md:mx-4 lg:mx-auto">
          <div className="bg-white md:rounded-2xl border-t md:border border-slate-200/80 px-5 py-5 md:p-6 shadow-[0_-4px_40px_rgba(0,0,0,0.10)] md:shadow-[0_8px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Text */}
              <p className="text-sm text-slate-600 leading-relaxed m-0 flex-1">
                {t.cookie.message}{' '}
                <Link
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  {t.cookie.privacyLink}
                </Link>
              </p>

              {/* Buttons — side-by-side, equal width */}
              <div className="flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => accept('essential')}
                  className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t.cookie.essentialOnly}
                </button>

                <button
                  type="button"
                  onClick={() => accept('all')}
                  className="flex-1 sm:flex-none rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t.cookie.acceptAll}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
