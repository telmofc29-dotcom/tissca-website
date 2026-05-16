// src/app/(member)/app/settings/subscription/page.tsx v3.1
//
// PURPOSE:
// - Member app: Subscription & Billing page (premium-leaning light SaaS UI).
// - Proof-based: fetch billing container from GET /api/user/me (workspace-scoped).
// - Stripe actions are handled by Supabase Edge Functions (canonical):
//   - Checkout: creates Stripe checkout session (owner-only) and returns checkout_url
//   - Portal: creates Stripe billing portal session (owner-only) and returns url
//   - Redeem promo: applies a promo/discount for an existing subscription (owner-only) and returns ok/message
// - Account deletion is handled by Supabase Edge Function (canonical):
//   - Delete: deletes current user via service role (server-side only)
//
// LOCKED:
// - Workspace is the billing container.
// - Proof-based only. No client guessing.
// - Owner-only billing actions.
// - Fail closed if Edge Function URLs are missing.
//
// REQUIRED ENV (client-safe):
// - NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL
//   e.g. https://<project-ref>.supabase.co/functions/v1 (preferred)
//   or   https://<project-ref>.supabase.co             (we auto-normalise to /functions/v1)
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
//   required for Edge Function calls via fetch() (apikey header)
// - NEXT_PUBLIC_STRIPE_CHECKOUT_FUNCTION
//   e.g. stripe-create-checkout
// - NEXT_PUBLIC_STRIPE_PORTAL_FUNCTION
//   e.g. stripe-create-portal
// - NEXT_PUBLIC_STRIPE_REDEEM_PROMO_FUNCTION
//   e.g. stripe-redeem-promo
// - NEXT_PUBLIC_TISSCA_DELETE_ACCOUNT_FUNCTION
//   e.g. tissca-delete-account
//
// VERSION HISTORY:
// - v1.0 (2026-03-02): Initial premium billing UI + proof-based workspace billing display.
// - v1.1 (2026-03-02): Wire Upgrade + Portal buttons to Supabase Edge Functions (canonical Stripe pipeline).
// - v1.2 (2026-03-02): Auto-refresh after Stripe success (poll /api/user/me; show finalising banner; clean URL).
// - v1.3 (2026-03-02): Handle Stripe cancel return (?stripe=cancel): dismissible banner + clean URL.
// - v1.4 (2026-03-02): Add Cancel subscription button (owner-only) via Billing Portal + proof-based refresh after cancel.
// - v1.5 (2026-03-02): Add Delete account (all tiers) via Edge Function + confirm modals (Cancel + Delete); Free shows Delete-only in top actions.
// - v1.5.1 (2026-03-03): Fix syntax error in getEnvOrNull + remove stray trailing character.
// - v1.6 (2026-03-03): Fix Edge Function calls by (1) auto-normalising functions base to include /functions/v1 and (2) sending apikey header; improve failure messaging.
// - v1.6.1 (2026-03-03): Fix Safari runtime error "Can't find variable: process" by removing dynamic process.env access from client runtime; use build-time inlined env constants only.
// - v1.7 (2026-03-04): Add “Redeem promo code” UI + Edge Function call (owner-only) for applying discounts after initial signup.
//
// NOTE:
// - This file must compile.
//

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageProvider';
import { createFeedbackSubmission } from '@/utils/feedback';
import { trackEvent } from '@/utils/analytics';

type PlanTier = 'free' | 'pro' | 'team_starter' | 'team_pro' | 'unknown';

type MeResponse = {
  user?: { id?: string; email?: string | null; name?: string | null };
  profile?: { full_name?: string | null; fullName?: string | null; email?: string | null } | null;
  workspace?: {
    id?: string;
    name?: string | null;
    plan_tier?: string | null;
    subscription_status?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    current_period_end?: string | null;
  } | null;
  plan_tier?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
};

function normalizePlanTier(input: unknown): PlanTier {
  const raw = String(input ?? '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (raw === 'pro') return 'pro';
  if (raw === 'team_pro' || raw === 'teampro') return 'team_pro';
  if (raw === 'team_starter' || raw === 'teamstarter' || raw === 'team') return 'team_starter';
  if (raw === 'free') return 'free';
  return 'unknown';
}

function getPlanTranslationKey(tier: PlanTier): 'free' | 'pro' | 'teamStarter' | 'teamPro' | null {
  if (tier === 'free') return 'free';
  if (tier === 'pro') return 'pro';
  if (tier === 'team_starter') return 'teamStarter';
  if (tier === 'team_pro') return 'teamPro';
  return null;
}

function getStatusKey(input: unknown): 'active' | 'trial' | 'pastDue' | 'cancelled' | 'inactive' {
  const raw = String(input ?? '').trim().toLowerCase();
  if (raw === 'active') return 'active';
  if (raw === 'trialing') return 'trial';
  if (raw === 'past_due') return 'pastDue';
  if (raw === 'canceled' || raw === 'cancelled') return 'cancelled';
  return 'inactive';
}

function safeDateLabel(isoOrNull: string | null | undefined): string {
  if (!isoOrNull) return '—';
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusTone(statusRaw: unknown): 'good' | 'warn' | 'neutral' {
  const s = String(statusRaw ?? '').toLowerCase();
  if (s === 'active' || s === 'trialing') return 'good';
  if (s === 'past_due') return 'warn';
  return 'neutral';
}

type ConfirmKind = 'reasons' | 'cancel' | 'delete' | null;
type ConfirmIntent = 'cancel' | 'delete';

/**
 * Allowed plan tiers for checkout.
 * Price IDs are resolved server-side by the Edge Function from Supabase secrets.
 * The client only sends the tier name — never a priceId.
 */
const ALLOWED_CHECKOUT_TIERS = ['pro', 'team_starter', 'team_pro'] as const;

export default function SubscriptionSettingsPage() {
  const { t } = useLanguage();
  const s = t.member.subscription;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState<'pro' | 'team_starter' | 'team_pro' | 'portal' | 'cancel' | 'delete' | 'redeem' | null>(
    null,
  );
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  const [isFinalising, setIsFinalising] = useState(false);
  const [showCancelBanner, setShowCancelBanner] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState<ConfirmKind>(null);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent>('cancel');
  const [cancelReasons, setCancelReasons] = useState<string[]>([]);
  const [cancelOtherText, setCancelOtherText] = useState('');
  const [reasonsError, setReasonsError] = useState<string | null>(null);

  useEffect(() => {
    const loadProof = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setErrorMsg(s.errors.supabaseUnavailable);
          setMe(null);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          setErrorMsg(s.errors.notSignedIn);
          setMe(null);
          return;
        }

        const response = await fetch('/api/user/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          setErrorMsg(s.errors.loadFailed);
          setMe(null);
          return;
        }

        const json = (await response.json()) as MeResponse;
        setMe(json);
      } catch (err) {
        console.warn('[SubscriptionSettingsPage] Proof load failed:', err);
        setErrorMsg(s.errors.loadFailed);
        setMe(null);
      } finally {
        setLoading(false);
      }
    };

    loadProof();
  }, []);

  const derived = useMemo(() => {
    const profileName = me?.profile?.full_name ?? me?.profile?.fullName ?? me?.user?.name ?? null;
    const profileEmail = me?.profile?.email ?? me?.user?.email ?? null;

    const tierCandidate = me?.workspace?.plan_tier ?? me?.plan_tier ?? null;
    const planTier = normalizePlanTier(tierCandidate);

    const subscriptionStatus = me?.workspace?.subscription_status ?? me?.subscription_status ?? null;
    const currentPeriodEnd = me?.workspace?.current_period_end ?? me?.current_period_end ?? null;

    const wsName = me?.workspace?.name ?? null;
    const wsId = me?.workspace?.id ?? null;

    const hasWorkspace = Boolean(wsId);

    return {
      profileName,
      profileEmail,
      planTier,
      subscriptionStatus,
      currentPeriodEnd,
      wsName,
      wsId,
      hasWorkspace,
      stripeCustomerId: me?.workspace?.stripe_customer_id ?? null,
      stripeSubscriptionId: me?.workspace?.stripe_subscription_id ?? null,
    };
  }, [me]);

  async function getAccessToken(): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  }

  async function refreshMeOnce() {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/user/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;

      const json = (await res.json()) as MeResponse;
      setMe(json);
    } catch {
      // ignore
    }
  }

  async function goCheckout(targetTier: 'pro' | 'team_starter' | 'team_pro') {
    trackEvent('pricing_cta_click', '/app/settings/subscription', { eventLabel: `upgrade_${targetTier}`, metadata: { planTier: targetTier, ctaName: `Upgrade to ${targetTier}`, ctaSource: 'subscription_page', sourcePage: '/app/settings/subscription' } });
    setActionMsg(null);
    setPromoMsg(null);
    setErrorMsg(null);

    try {
      setActionBusy(targetTier);

      const supabase = getSupabaseClient();
      if (!supabase) {
        setActionMsg(s.errors.supabaseUnavailable);
        return;
      }

      if (!derived.wsId) {
        setActionMsg(s.errors.noWorkspace);
        return;
      }

      if (!(ALLOWED_CHECKOUT_TIERS as readonly string[]).includes(targetTier)) {
        setActionMsg(s.errors.unknownTier);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: { plan_tier: targetTier, workspace_id: derived.wsId },
      });

      if (error) {
        console.warn('[SubscriptionSettingsPage] Checkout error:', error);
        setActionMsg(error.message || s.errors.checkoutFailed);
        return;
      }

      const checkoutUrl = (data?.url || data?.checkout_url) as string | undefined;
      if (!checkoutUrl || typeof checkoutUrl !== 'string') {
        setActionMsg(data?.error || s.errors.invalidCheckoutUrl);
        return;
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.warn('[SubscriptionSettingsPage] Checkout failed:', e);
      setActionMsg(e?.message || s.errors.checkoutFailed);
    } finally {
      setActionBusy(null);
    }
  }

  async function openPortal() {
    trackEvent('cta_click', '/app/settings/subscription', { eventLabel: 'manage_billing', metadata: { ctaName: 'Manage Billing', ctaSource: 'subscription_page', sourcePage: '/app/settings/subscription' } });
    setActionMsg(null);
    setPromoMsg(null);
    setErrorMsg(null);

    try {
      setActionBusy('portal');

      const supabase = getSupabaseClient();
      if (!supabase) {
        setActionMsg(s.errors.supabaseUnavailable);
        return;
      }

      if (!derived.wsId) {
        setActionMsg(s.errors.noWorkspace);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {
        body: { workspace_id: derived.wsId },
      });

      if (error) {
        console.warn('[SubscriptionSettingsPage] Portal error:', error);
        setActionMsg(error.message || s.errors.portalFailed);
        return;
      }

      const url = data?.url as string | undefined;
      if (!url || typeof url !== 'string') {
        setActionMsg(data?.error || s.errors.invalidPortalUrl);
        return;
      }

      window.location.href = url;
    } catch (e: any) {
      console.warn('[SubscriptionSettingsPage] Portal failed:', e);
      setActionMsg(e?.message || s.errors.portalFailed);
    } finally {
      setActionBusy(null);
    }
  }

  async function cancelViaPortal() {
    setActionMsg(null);
    setPromoMsg(null);
    setErrorMsg(null);

    try {
      if (derived.planTier !== 'pro' && derived.planTier !== 'team_starter' && derived.planTier !== 'team_pro') {
        setActionMsg(s.errors.noPaidSubscription);
        return;
      }

      setActionBusy('cancel');

      const supabase = getSupabaseClient();
      if (!supabase) {
        setActionMsg(s.errors.supabaseUnavailable);
        return;
      }

      if (!derived.wsId) {
        setActionMsg(s.errors.noWorkspace);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {
        body: { workspace_id: derived.wsId },
      });

      if (error) {
        console.warn('[SubscriptionSettingsPage] Cancel portal error:', error);
        setActionMsg(error.message || s.errors.cancelFailed);
        return;
      }

      const url = data?.url as string | undefined;
      if (!url || typeof url !== 'string') {
        setActionMsg(data?.error || s.errors.invalidPortalUrl);
        return;
      }

      window.location.href = url;
    } catch (e: any) {
      console.warn('[SubscriptionSettingsPage] Cancel via portal failed:', e);
      setActionMsg(e?.message || s.errors.cancelFailed);
    } finally {
      setActionBusy(null);
    }
  }

  async function redeemPromo() {
    setActionMsg(null);
    setPromoMsg(null);
    setErrorMsg(null);

    try {
      setActionBusy('redeem');

      const code = promoCode.trim();
      if (!code) {
        setPromoMsg(s.errors.enterPromoCode);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setPromoMsg(s.errors.supabaseUnavailable);
        return;
      }

      if (!derived.wsId) {
        setPromoMsg(s.errors.noWorkspace);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-redeem-promo', {
        body: {
          workspace_id: derived.wsId,
          promo_code: code,
        },
      });

      if (error) {
        console.warn('[SubscriptionSettingsPage] Redeem promo error:', error);
        setPromoMsg(error.message || s.errors.promoFailed);
        return;
      }

      const ok = Boolean(data?.ok ?? true);
      const message =
        (data?.message as string | undefined) ||
        (ok ? 'Promo code applied. It may take a moment to reflect in billing.' : 'Promo code could not be applied.');

      setPromoMsg(message);

      // Refresh proof once (best-effort)
      await refreshMeOnce();
    } catch (e: any) {
      console.warn('[SubscriptionSettingsPage] Redeem promo failed:', e);
      setPromoMsg(e?.message || s.errors.promoFailed);
    } finally {
      setActionBusy(null);
    }
  }

  async function deleteAccount() {
    setActionMsg(null);
    setPromoMsg(null);
    setErrorMsg(null);

    try {
      setActionBusy('delete');

      const token = await getAccessToken();
      if (!token) {
        setActionMsg(s.errors.supabaseUnavailable);
        return;
      }

      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setActionMsg(data?.error || s.errors.deleteFailed);
        return;
      }

      window.location.href = '/';
    } catch (e: any) {
      console.warn('[SubscriptionSettingsPage] Delete account failed:', e);
      setActionMsg(e?.message || s.errors.deleteFailed);
    } finally {
      setActionBusy(null);
    }
  }

  // ✅ Auto-refresh after Stripe success
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const stripeFlag = params.get('stripe');

    if (stripeFlag !== 'success') return;
    if (!derived.wsId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    setIsFinalising(true);

    const tick = async () => {
      attempts += 1;

      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch('/api/user/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) return;

        const json = (await res.json()) as MeResponse;
        const newTier = normalizePlanTier(json?.workspace?.plan_tier ?? json?.plan_tier);

        if (cancelled) return;

        if (newTier === 'pro' || newTier === 'team_starter' || newTier === 'team_pro') {
          setMe(json);
          setIsFinalising(false);
          window.history.replaceState({}, '', '/app/settings/subscription');
          return;
        }
      } catch {
        // ignore
      }

      if (!cancelled && attempts >= maxAttempts) {
        setIsFinalising(false);
        return;
      }

      if (!cancelled) window.setTimeout(tick, 2000);
    };

    const start = window.setTimeout(tick, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, derived.wsId]);

  // ✅ Stripe cancel return UX + short proof-refresh
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const stripeFlag = params.get('stripe');

    if (stripeFlag !== 'cancel') return;

    setShowCancelBanner(true);
    window.history.replaceState({}, '', '/app/settings/subscription');

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const tick = async () => {
      attempts += 1;

      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch('/api/user/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const json = (await res.json()) as MeResponse;
          if (!cancelled) setMe(json);
        }
      } catch {
        // ignore
      }

      if (cancelled || attempts >= maxAttempts) return;
      window.setTimeout(tick, 2000);
    };

    const start = window.setTimeout(tick, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const statusKey = getStatusKey(derived.subscriptionStatus);
  const statusLabel = s.status[statusKey];
  const statusKind = statusTone(derived.subscriptionStatus);

  const planKey = getPlanTranslationKey(derived.planTier);
  const planLabel = planKey ? s.plans[planKey].name : 'Unknown';

  const statusClasses =
    statusKind === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : statusKind === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-white text-slate-800';

  const showCancelButton = derived.hasWorkspace && (derived.planTier === 'pro' || derived.planTier === 'team_starter' || derived.planTier === 'team_pro');

  const isFree = derived.planTier === 'free';
  const canShowTopPortal = !isFree;

  const showAnyOverlay = confirmOpen !== null;

  function closeConfirm() {
    if (actionBusy) return;
    setConfirmOpen(null);
    setReasonsError(null);
  }

  async function confirmCancel() {
    setConfirmOpen(null);
    setReasonsError(null);
    await cancelViaPortal();
  }

  async function confirmReasons() {
    // MANDATORY: at least 1 reason must be selected
    if (cancelReasons.length === 0) {
      setReasonsError(t.member.cancelReasons.requiredMessage);
      return;
    }
    // If "other" selected, require non-empty text
    if (cancelReasons.includes('other') && !cancelOtherText.trim()) {
      setReasonsError(t.member.cancelReasons.otherRequired);
      return;
    }

    setReasonsError(null);

    // Submit cancellation reasons as feedback
    const reasons = [...cancelReasons];
    if (cancelOtherText.trim()) {
      reasons.push(`Other: ${cancelOtherText.trim()}`);
    }

    try {
      const submission = createFeedbackSubmission(
        'cancellation',
        confirmIntent === 'delete' ? 'Account deletion' : 'Subscription cancellation',
        cancelOtherText.trim() || reasons.join(', '),
        '/app/settings/subscription',
        {
          section: 'subscription',
          cancellationReasons: reasons,
          cancellationContext: confirmIntent === 'delete' ? 'account_delete' : 'subscription_cancel',
          userEmail: derived.profileEmail ?? undefined,
        }
      );

      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
    } catch {
      // Best-effort — don't block next step
    }

    // Transition based on intent
    setConfirmOpen(confirmIntent === 'delete' ? 'delete' : 'cancel');
  }

  async function confirmDelete() {
    setConfirmOpen(null);
    await deleteAccount();
  }

  return (
    <div className="space-y-6">
      {/* Confirmation overlay (floating cards) */}
      {showAnyOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.55)]">
            {confirmOpen === 'reasons' && (
              <>
                <div className="text-sm font-semibold text-slate-900">{t.member.cancelReasons.title}</div>
                <div className="mt-2 text-sm text-slate-700">
                  {t.member.cancelReasons.subtitle}
                </div>
                <ul className="mt-3 space-y-2">
                  {(Object.keys(t.member.cancelReasons.reasons) as Array<keyof typeof t.member.cancelReasons.reasons>).map((key) => {
                    const label = t.member.cancelReasons.reasons[key];
                    const checked = cancelReasons.includes(key);
                    return (
                      <li key={key}>
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setCancelReasons(prev =>
                                checked ? prev.filter(r => r !== key) : [...prev, key]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {label}
                        </label>
                        {key === 'other' && checked && (
                          <textarea
                            value={cancelOtherText}
                            onChange={(e) => setCancelOtherText(e.target.value)}
                            placeholder={t.member.cancelReasons.otherPlaceholder}
                            rows={2}
                            className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none resize-none"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  {reasonsError && (
                    <p className="mr-auto text-sm text-rose-600">{reasonsError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCancelReasons([]);
                      setCancelOtherText('');
                      setReasonsError(null);
                      closeConfirm();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    {t.member.cancelReasons.goBack}
                  </button>
                  <button
                    type="button"
                    onClick={confirmReasons}
                    disabled={cancelReasons.length === 0}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.member.cancelReasons.continueCancel}
                  </button>
                </div>
              </>
            )}

            {confirmOpen === 'cancel' && (
              <>
                <div className="text-sm font-semibold text-slate-900">{s.confirmCancel.title}</div>
                <div className="mt-2 text-sm text-slate-700">
                  {s.confirmCancel.description}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {s.confirmCancel.benefits.map((b, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{b}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-slate-500">
                  {s.confirmCancel.note}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    disabled={actionBusy !== null}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {s.confirmCancel.keep}
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancel}
                    disabled={actionBusy !== null}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {s.confirmCancel.proceed}
                  </button>
                </div>
              </>
            )}

            {confirmOpen === 'delete' && (
              <>
                <div className="text-sm font-semibold text-slate-900">{s.confirmDelete.title}</div>
                <div className="mt-2 text-sm text-slate-700">
                  {s.confirmDelete.description}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {s.confirmDelete.losses.map((l, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{l}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-slate-500">
                  {s.confirmDelete.note}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    disabled={actionBusy !== null}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {s.confirmDelete.keep}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={actionBusy !== null}
                    className="rounded-full border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {s.confirmDelete.proceed}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{s.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{s.subtitle}</p>
        </div>

        <Link
          href="/app/settings#billing"
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.18)] hover:bg-gray-50"
        >
          {s.backToSettings}
        </Link>
      </div>

      {/* Summary card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{s.planSummary}</div>
            <div className="mt-1 text-sm text-slate-600">{s.planSummaryDesc}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
              Current plan: {planLabel}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}>
              {s.statusLabel}: {statusLabel}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{s.workspace}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{derived.wsName || '—'}</div>
            <div className="mt-1 break-all text-xs text-slate-500">{derived.wsId || '—'}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{s.nextBillingDate}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{safeDateLabel(derived.currentPeriodEnd)}</div>
            <div className="mt-1 text-xs text-slate-500">
              {s.basedOnPeriodEnd}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{s.billingLinks}</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>
                {s.customer}: <span className="font-mono">{derived.stripeCustomerId || '—'}</span>
              </div>
              <div>
                {s.subscriptionLink}: <span className="font-mono">{derived.stripeSubscriptionId || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {showCancelBanner && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div>
              <span className="font-semibold">{s.returnedFromBilling}</span> {s.returnedFromBillingDesc}
            </div>
            <button
              type="button"
              onClick={() => setShowCancelBanner(false)}
              className="rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-100/40"
            >
              {s.dismiss}
            </button>
          </div>
        )}

        {isFinalising && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {s.finalising}
          </div>
        )}

        {loading && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-600">
            {s.loadingBilling}
          </div>
        )}

        {!loading && errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && !derived.hasWorkspace && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {s.noWorkspace}
          </div>
        )}

        {actionMsg && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {actionMsg}
          </div>
        )}
      </section>

      {/* Plans */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{s.plansTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {s.plansSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canShowTopPortal && (
              <>
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={loading || !derived.hasWorkspace || actionBusy !== null}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.18)] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title={!derived.hasWorkspace ? 'No active workspace' : undefined}
                >
                  {actionBusy === 'portal' ? s.openingBillingPortal : s.openBillingPortal}
                </button>

                {showCancelButton && (
                  <button
                    type="button"
                    onClick={() => { setConfirmIntent('cancel'); setReasonsError(null); setCancelReasons([]); setCancelOtherText(''); setConfirmOpen('reasons'); }}
                    disabled={loading || !derived.hasWorkspace || actionBusy !== null}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.12)] hover:bg-rose-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Cancel your subscription in Stripe"
                  >
                    {actionBusy === 'cancel' ? s.openingCancellation : s.cancelSubscription}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => { setConfirmIntent('delete'); setReasonsError(null); setCancelReasons([]); setCancelOtherText(''); setConfirmOpen('reasons'); }}
              disabled={loading || actionBusy !== null}
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.12)] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Delete your account"
            >
              {actionBusy === 'delete' ? s.deleting : s.deleteAccount}
            </button>
          </div>
        </div>

        {/* Promo code */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{s.promoTitle}</div>
              <div className="mt-1 text-sm text-slate-600">
                {s.promoSubtitle}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={s.promoPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 sm:w-64"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading || actionBusy !== null}
              />
              <button
                type="button"
                onClick={redeemPromo}
                disabled={loading || !derived.hasWorkspace || actionBusy !== null || promoCode.trim().length === 0}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                title={!derived.hasWorkspace ? 'No active workspace' : undefined}
              >
                {actionBusy === 'redeem' ? s.applying : s.applyCode}
              </button>
            </div>
          </div>

          {promoMsg && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {promoMsg}
            </div>
          )}
        </div>

        {/* (rest of your plan cards remain unchanged) */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {/* Free */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{s.plans.free.name}</div>
              {derived.planTier === 'free' && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {s.current}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.plans.free.subtitle}</div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {s.plans.free.features.map((feat, i) => (<li key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{feat}</li>))}

            </ul>

            <div className="mt-4 text-xs text-slate-500">{s.plans.free.note}</div>
          </div>

          {/* Pro — price_1TEoaLCYd3L3PMtIfsXroP9T / prod_Ty1G1SuzFfL9OM */}
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{s.plans.pro.name}</div>
              {derived.planTier === 'pro' && (
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                  {s.current}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.plans.pro.subtitle}</div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {s.plans.pro.features.map((feat, i) => (<li key={i} className="rounded-xl border border-amber-200 bg-white px-3 py-2">{feat}</li>))}
            </ul>

            <button
              type="button"
              onClick={() => goCheckout('pro')}
              disabled={
                loading || !derived.hasWorkspace || derived.planTier === 'pro' || actionBusy !== null || isFinalising
              }
              className="mt-4 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)] hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={!derived.hasWorkspace ? 'No active workspace' : undefined}
            >
              {actionBusy === 'pro'
                ? s.startingCheckout
                : derived.planTier === 'pro'
                  ? s.plans.pro.ctaCurrent
                  : isFinalising
                    ? s.plans.pro.ctaFinalising
                    : s.plans.pro.cta}
            </button>

            <div className="mt-2 text-xs text-slate-600">{s.plans.pro.note}</div>
          </div>

          {/* Team Starter — price_1T05FJCYd3L3PMtIm4pK3iZQ / prod_Ty1Hfw9H6h3h1L */}
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{s.plans.teamStarter.name}</div>
              {derived.planTier === 'team_starter' && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                  {s.current}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.plans.teamStarter.subtitle}</div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {s.plans.teamStarter.features.map((feat, i) => (<li key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-2">{feat}</li>))}
            </ul>

            <button
              type="button"
              onClick={() => goCheckout('team_starter')}
              disabled={
                loading || !derived.hasWorkspace || derived.planTier === 'team_starter' || actionBusy !== null || isFinalising
              }
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              title={!derived.hasWorkspace ? 'No active workspace' : undefined}
            >
              {actionBusy === 'team_starter'
                ? s.startingCheckout
                : derived.planTier === 'team_starter'
                  ? s.plans.teamStarter.ctaCurrent
                  : isFinalising
                    ? s.plans.teamStarter.ctaFinalising
                    : s.plans.teamStarter.cta}
            </button>

            <div className="mt-2 text-xs text-slate-600">{s.plans.teamStarter.note}</div>
          </div>

          {/* Team Pro — price_1TEqaDCYd3L3PMtIWJHmjRml / prod_UDH81FWHvrkX6x */}
          <div className="rounded-2xl border border-[#cbb26b]/40 bg-[#cbb26b]/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{s.plans.teamPro.name}</div>
              {derived.planTier === 'team_pro' && (
                <span className="rounded-full border border-[#cbb26b]/40 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                  {s.current}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.plans.teamPro.subtitle}</div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {s.plans.teamPro.features.map((feat, i) => (<li key={i} className="rounded-xl border border-[#cbb26b]/30 bg-white px-3 py-2">{feat}</li>))}
            </ul>

            <button
              type="button"
              onClick={() => goCheckout('team_pro')}
              disabled={
                loading || !derived.hasWorkspace || derived.planTier === 'team_pro' || actionBusy !== null || isFinalising
              }
              className="mt-4 w-full rounded-2xl border border-[#cbb26b]/40 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)] hover:bg-[#cbb26b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              title={!derived.hasWorkspace ? 'No active workspace' : undefined}
            >
              {actionBusy === 'team_pro'
                ? s.startingCheckout
                : derived.planTier === 'team_pro'
                  ? s.plans.teamPro.ctaCurrent
                  : isFinalising
                    ? s.plans.teamPro.ctaFinalising
                    : s.plans.teamPro.cta}
            </button>

            <div className="mt-2 text-xs text-slate-600">{s.plans.teamPro.note}</div>
          </div>
        </div>
      </section>
    </div>
  );
}