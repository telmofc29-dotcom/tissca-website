// src/app/(member)/app/settings/page.tsx v3.0
//
// PURPOSE:
// - Member app settings hub — closed card layout matching Android product structure.
//
// CHANGES (v3.0):
// - Restructured: each section is a closed card linking to its own page.
// - Added Personal Details card (top) and Security card.
// - Removed open Profile / Business / Notifications sections from the main page.
// - Email Preferences moved to the bottom (last).
// - All strings are localised via i18n.
//
// VERSION HISTORY:
// - v1.x–v2.0: See prior inline history.
// - v3.0 (2026-04-05): Product-structure correction to match Android layout.

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageProvider';
import { trackEvent } from '@/utils/analytics';
import { normalizePlanTier, formatPlanLabel, isTeam, isPro } from '@/lib/plans';

type MeData = {
  planLabel: string;
  planTier: string;
  role: string;
  subscriptionStatus: string | null;
};

export default function AppSettingsPage() {
  const { t } = useLanguage();
  const s = t.member.settings;
  const [me, setMe] = useState<MeData>({ planLabel: 'Free', planTier: 'free', role: 'member', subscriptionStatus: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProof = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) return;

        const response = await fetch('/api/user/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) return;

        const json = await response.json();

        const tierCandidate =
          json?.plan_tier ??
          json?.workspace?.plan_tier ??
          json?.current_workspace?.plan_tier ??
          json?.profile?.plan_tier;

        setMe({
          planLabel: formatPlanLabel(normalizePlanTier(tierCandidate)),
          planTier: normalizePlanTier(tierCandidate),
          role: (json?.role ?? json?.profile?.role ?? 'member').toLowerCase(),
          subscriptionStatus:
            json?.workspace?.subscription_status ??
            json?.subscription_status ??
            null,
        });
        trackEvent('feature_view', '/app/settings', { eventLabel: 'settings_viewed', metadata: { feature: 'settings', action: 'view', planTier: formatPlanLabel(normalizePlanTier(tierCandidate)), sourcePage: '/app/settings' } });
      } catch (error) {
        console.warn('[AppSettingsPage] Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProof();
  }, []);

  const cardClass =
    'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]';

  return (
    <div className="space-y-6">
      {/* 1. Personal Details */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{s.personalDetails.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.personalDetails.subtitle}</p>
          </div>
          <Link
            href="/app/settings/personal-details"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.personalDetails.manage} →
          </Link>
        </div>
      </section>

      {/* 2. Security */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{s.security.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.security.subtitle}</p>
          </div>
          <Link
            href="/app/settings/security"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.security.manage} →
          </Link>
        </div>
      </section>

      {/* 3. Billing & Subscription */}
      <section
        id="billing"
        className="rounded-2xl border border-amber-200/60 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{s.billingTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.billingSubtitle}</p>
          </div>

          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
            {s.currentPlan}: {loading ? '\u2026' : me.planLabel}
          </span>
        </div>

        {me.subscriptionStatus && (
          <p className="mt-2 text-xs text-slate-600">
            Status: <span className="font-medium capitalize">{me.subscriptionStatus.replace(/_/g, ' ')}</span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/app/settings/subscription"
            onClick={() => trackEvent('billing_action', '/app/settings', { eventLabel: 'billing_nav', metadata: { feature: 'billing', action: 'navigate', ctaName: 'Subscription & Billing', sourcePage: '/app/settings', planTier: me.planLabel } })}
            className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-50"
          >
            {s.subscriptionBilling}
          </Link>

          <Link
            href="/app/settings/subscription"
            onClick={() => trackEvent('billing_action', '/app/settings', { eventLabel: 'manage_subscription_nav', metadata: { feature: 'billing', action: 'navigate', ctaName: 'Manage Subscription', sourcePage: '/app/settings', planTier: me.planLabel } })}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.manageSubscription}
          </Link>
        </div>
      </section>

      {/* 4. Team Management — Team plans only, owner/admin visible */}
      {isTeam(me.planTier) && (me.role === 'owner' || me.role === 'admin') && (
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team Management</h2>
              <p className="mt-1 text-sm text-slate-600">Manage workspace members and assign roles.</p>
            </div>
            <Link
              href="/app/settings/team"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              {s.personalDetails.manage} →
            </Link>
          </div>
        </section>
      )}

      {/* 5. Document PDF Info — Pro+ only, Team plans: owner only */}
      {isPro(me.planTier) && (me.role === 'owner' || !isTeam(me.planTier)) && (
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Document PDF Info</h2>
            <p className="mt-1 text-sm text-slate-600">Company identity, contact details, payment info and branding for quotes &amp; invoices.</p>
          </div>
          <Link
            href="/app/settings/document-pdf-info"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.personalDetails.manage} →
          </Link>
        </div>
      </section>
      )}

      {/* 5. Default Currency */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Default Currency</h2>
            <p className="mt-1 text-sm text-slate-600">Set the default currency for quotes, invoices, and pricing.</p>
          </div>
          <Link
            href="/app/settings/currency"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.personalDetails.manage} →
          </Link>
        </div>
      </section>

      {/* 6. Email Preferences — LAST */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{s.emailPreferences?.title ?? 'Email Preferences'}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.emailPreferences?.subtitle ?? 'Control which emails you receive from TISSCA.'}</p>
          </div>
          <Link
            href="/app/settings/email-preferences"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            {s.emailPreferences?.manage ?? 'Manage'} →
          </Link>
        </div>
      </section>

      {/* 7. Sync Diagnostics (Internal — Owner/Admin only) */}
      {(me.role === 'owner' || me.role === 'admin') && !loading && (
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Sync Diagnostics</h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Internal
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Read-only sync health viewer. Remote counts, attachment integrity, last activity. Owner / admin only.
              </p>
            </div>
            <Link
              href="/app/settings/sync-diagnostics"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              Open →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
