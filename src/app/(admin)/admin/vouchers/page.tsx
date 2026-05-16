// src/app/(admin)/admin/vouchers/page.tsx v1.2
//
// PURPOSE:
// - Dedicated admin tooling page for:
//   - Fast customer lookup (email/name) → open snapshot (workspace-scoped billing container)
//   - Workspace billing snapshot
//   - Voucher creation:
//     - Campaign vouchers (bulk, not email-locked)
//     - Targeted vouchers (intended to be email-locked in checkout flow)
//   - Voucher audit list
//   - Billing portal promo codes policy (must remain OFF for targeted email-locked vouchers)
//   - Staff billing actions (support ops):
//     - Cancel subscription (now / end of period)
//     - Pause subscription
//     - Resume subscription
//     - Apply credit (customer balance credit)
//     - Refund (by PaymentIntent or Charge)
//   - Optional: send voucher email (fail-closed until provider chosen)
//
// SECURITY (LOCKED / PROOF-BASED):
// - Workspace-scoped snapshot (billing container). No guessing.
// - Voucher generation via staff-only Edge Function.
// - Targeted vouchers are NOT enforceable by Stripe alone; must be enforced in our Checkout session creation API.
// - Billing portal promo codes must remain OFF to prevent bypass.
// - Billing actions use staff-only admin APIs; fail closed.
//
// NOTE:
// - This file is UI + API calls only. It compiles independently.
// - It sends extra fields (kind, issued_to_email) to the Edge Function; if the function ignores them, nothing breaks.
// - Voucher email route must remain fail-closed until an email provider is configured.
//
// CHANGES (v1.2):
// - Add optional “Send last voucher email” workflow (uses /api/admin/support/vouchers/send).
// - Uses latest code from cust.promo_issues first, then wsBilling.promo_issues as fallback.
// - Keep existing voucher hub + workspace snapshot + audit list intact.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

type ApiUserRow = {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
  currentWorkspaceId?: string | null;
  planTier?: string | null;
  profile?: Record<string, any> | null;
  emailConfirmedAt?: string | null;
};

type SearchRow = {
  id: string;
  email: string;
  full_name?: string | null;
  current_workspace_id?: string | null;
};

type SupportCustomerResponse = {
  user: {
    id: string;
    email: string;
    full_name: string;
    current_workspace_id: string | null;
  };
  workspace: {
    id: string;
    name: string | null;
    plan_tier: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    updated_at?: string | null;
  } | null;
  promo_issues: Array<{
    id: string;
    workspace_id: string;
    code: string;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: string | null;
    duration_in_months: number | null;
    max_redemptions: number | null;
    redeem_by: string | null;
    created_at: string;
    created_by: string;
    kind?: 'campaign' | 'targeted' | null;
    issued_to_email?: string | null;
  }>;
};

type AdminBillingWorkspaceResponse = {
  workspace?: {
    id: string;
    name: string | null;
    plan_tier: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
  } | null;
  /** NO_STRIPE_CUSTOMER | NO_STRIPE_SUBSCRIPTION | CONFIGURED */
  billing_state?: string | null;
  promo_issues?: Array<{
    id: string;
    workspace_id: string;
    code: string;
    coupon_id: string | null;
    promotion_code_id: string | null;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: string | null;
    duration_in_months: number | null;
    max_redemptions: number | null;
    redeem_by: string | null;
    created_by: string;
    created_at: string;

    // optional future fields
    kind?: 'campaign' | 'targeted' | null;
    issued_to_email?: string | null;
  }>;
};

function safeLower(v?: string | null) {
  return (v || '').toLowerCase();
}

function normalizePlanTier(raw?: string | null): 'free' | 'pro' | 'team' | 'unknown' {
  const v = safeLower(raw);
  if (!v) return 'unknown';
  if (v === 'free' || v === 'starter') return 'free';
  if (v === 'pro' || v === 'premium') return 'pro';
  if (v === 'team' || v === 'business' || v === 'enterprise') return 'team';
  return 'unknown';
}

function formatPlanLabel(raw?: string | null) {
  const n = normalizePlanTier(raw);
  if (n === 'free') return 'Free';
  if (n === 'pro') return 'Pro';
  if (n === 'team') return 'Team';
  return 'Unknown';
}

function planBadgeClasses(raw?: string | null) {
  const n = normalizePlanTier(raw);
  if (n === 'team') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (n === 'pro') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (n === 'free') return 'bg-gray-50 text-gray-700 border-gray-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function fmtDate(d?: string | null, mode: 'date' | 'datetime' = 'date') {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return mode === 'datetime' ? dt.toLocaleString('en-GB') : dt.toLocaleDateString('en-GB');
}

function statusLabel(raw?: string | null) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return 'Inactive';
  if (v === 'active') return 'Active';
  if (v === 'trialing') return 'Trial';
  if (v === 'past_due') return 'Past due';
  if (v === 'canceled' || v === 'cancelled') return 'Cancelled';
  if (v === 'incomplete') return 'Incomplete';
  if (v === 'incomplete_expired') return 'Incomplete (expired)';
  if (v === 'unpaid') return 'Unpaid';
  return v.split('_').join(' ');
}

function statusTone(raw?: string | null): 'good' | 'warn' | 'neutral' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'active' || v === 'trialing') return 'good';
  if (v === 'past_due' || v === 'unpaid' || v === 'incomplete') return 'warn';
  return 'neutral';
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

async function readJsonOrText(res: Response): Promise<{ json: any | null; text: string | null }> {
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => null);
      return { json: j, text: null };
    }
    const t = await res.text().catch(() => '');
    return { json: null, text: t || null };
  } catch {
    return { json: null, text: null };
  }
}

// Voucher creation is proxied through the server-side route
// /api/admin/stripe/promo/create which derives the Edge Function URL
// from NEXT_PUBLIC_SUPABASE_URL (already required for the app to run).
// No NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL is needed in the browser.

type ModalKind = 'cancel_now' | 'cancel_eop' | 'pause' | 'resume' | 'credit' | 'refund' | null;

export default function AdminVouchersPage() {
  const { isLoggedIn, getAccessToken } = useAuth();

  // Users list (for workspace selector)
  const [users, setUsers] = useState<ApiUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Fast customer search
  const [q, setQ] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [selected, setSelected] = useState<SearchRow | null>(null);

  // Customer snapshot (email → workspace, ids)
  const [custBusy, setCustBusy] = useState(false);
  const [custErr, setCustErr] = useState('');
  const [cust, setCust] = useState<SupportCustomerResponse | null>(null);

  const selectedEmail = useMemo(() => String(selected?.email || '').trim(), [selected]);
  const selectedWorkspaceId = useMemo(
    () => String(cust?.user?.current_workspace_id || selected?.current_workspace_id || '').trim(),
    [cust, selected]
  );

  // Stripe dashboard links mode
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');

  // Workspace billing snapshot
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [wsBillingLoading, setWsBillingLoading] = useState(false);
  const [wsBillingError, setWsBillingError] = useState('');
  const [wsBilling, setWsBilling] = useState<AdminBillingWorkspaceResponse | null>(null);

  // Voucher mode
  const [voucherKind, setVoucherKind] = useState<'campaign' | 'targeted'>('campaign');
  const [issuedToEmail, setIssuedToEmail] = useState<string>(''); // used only for targeted

  // Voucher form state
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<string>('');

  const [promoCodePrefix, setPromoCodePrefix] = useState('TISSCA');
  const [promoPercentOff, setPromoPercentOff] = useState<number>(20);
  const [promoDuration, setPromoDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [promoDurationMonths, setPromoDurationMonths] = useState<number>(3);
  const [promoMaxRedemptions, setPromoMaxRedemptions] = useState<number>(1);
  const [promoRedeemBy, setPromoRedeemBy] = useState<string>(''); // YYYY-MM-DD

  // Optional send voucher email (fail-closed route)
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  // Billing portal promo codes policy
  const [portalAllowPromoCodes, setPortalAllowPromoCodes] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMsg, setPortalMsg] = useState('');

  // Billing actions
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);

  // Credit inputs (GBP)
  const [creditAmountGBP, setCreditAmountGBP] = useState<string>('10.00');
  const [creditReason, setCreditReason] = useState<string>('Support goodwill credit');

  // Refund inputs (PaymentIntent / Charge)
  const [refundPaymentIntent, setRefundPaymentIntent] = useState<string>('');
  const [refundCharge, setRefundCharge] = useState<string>('');
  const [refundAmountGBP, setRefundAmountGBP] = useState<string>(''); // optional
  const [refundReason, setRefundReason] = useState<'requested_by_customer' | 'duplicate' | 'fraudulent' | ''>(
    'requested_by_customer'
  );

  const wsIdForActions = useMemo(
    () => String(wsBilling?.workspace?.id || selectedWorkspaceId || '').trim(),
    [wsBilling, selectedWorkspaceId]
  );
  const canAct = Boolean(wsIdForActions);

  const lastVoucherCode = useMemo(() => {
    const fromCust = String(cust?.promo_issues?.[0]?.code || '').trim();
    if (fromCust) return fromCust;
    const fromWs = String(wsBilling?.promo_issues?.[0]?.code || '').trim();
    return fromWs || '';
  }, [cust, wsBilling]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  async function loadUsers() {
    try {
      setUsersError('');
      setLoadingUsers(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `Failed to load users (HTTP ${response.status})`);
      }

      const list = Array.isArray(payload?.users) ? payload.users : [];
      setUsers(list);

      // auto-select first workspace if none
      if (!workspaceId) {
        const firstWs = list.find((u: ApiUserRow) => String(u.currentWorkspaceId || '').trim())?.currentWorkspaceId;
        if (firstWs) setWorkspaceId(String(firstWs));
      }
    } catch (err: any) {
      setUsers([]);
      setUsersError(err?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }

  // Debounced customer search (server-side)
  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(async () => {
      try {
        setSearchErr('');
        if (!isLoggedIn) return;

        const term = q.trim();
        if (term.length < 2) {
          setResults([]);
          return;
        }

        setSearchBusy(true);

        const token = await getAccessToken();
        if (!token) {
          setSearchErr('No auth token.');
          return;
        }

        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(term)}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = payload?.error || payload?.message || `Search failed (HTTP ${res.status})`;
          setSearchErr(msg);
          setResults([]);
          return;
        }

        const list = Array.isArray(payload?.users) ? payload.users : [];
        if (!cancelled) setResults(list);
      } catch (e: any) {
        if (!cancelled) {
          setSearchErr(e?.message || 'Search failed.');
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, isLoggedIn, getAccessToken]);

  async function loadCustomerByEmail(email: string) {
    try {
      setCustErr('');
      setCustBusy(true);
      setCust(null);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch(`/api/admin/support/customer?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const { json, text } = await readJsonOrText(res);

      if (!res.ok) {
        const msg = json?.error || json?.message || (text ? text.slice(0, 300) : null) || `Failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const next = (json as SupportCustomerResponse) || null;
      setCust(next);

      const ws = String(next?.user?.current_workspace_id || '').trim();
      if (ws) {
        setWorkspaceId(ws);
        setWsBillingError('');
        setWsBilling(null);
        setPromoMsg('');
        setSendMsg('');
        setBillingMsg('');
        await fetchBillingByWorkspaceId(ws);
      }
    } catch (e: any) {
      setCustErr(e?.message || 'Failed to load customer.');
    } finally {
      setCustBusy(false);
    }
  }

  // Workspace options (deduped from users)
  const workspaceOptions = useMemo(() => {
    type Acc = { id: string; userCount: number; ownersOrNames: string[] };

    const map = new Map<string, Acc>();

    for (const u of users) {
      const ws = String(u.currentWorkspaceId || '').trim();
      if (!ws) continue;

      const label =
        String(u.profile?.full_name || u.name || '').trim() || String(u.email || '').trim() || 'Unknown user';

      const acc = map.get(ws) || { id: ws, userCount: 0, ownersOrNames: [] };
      acc.userCount += 1;
      if (acc.ownersOrNames.length < 3) acc.ownersOrNames.push(label);
      map.set(ws, acc);
    }

    const opts = Array.from(map.values()).map((x) => {
      const head = `${x.id.slice(0, 8)}…`;
      const people =
        x.ownersOrNames.join(', ') +
        (x.userCount > x.ownersOrNames.length ? ` + ${x.userCount - x.ownersOrNames.length} more` : '');
      return { id: x.id, label: `${head} (${people})`, userCount: x.userCount };
    });

    opts.sort((a, b) => (b.userCount || 0) - (a.userCount || 0));
    return opts;
  }, [users]);

  const usersInWorkspace = useMemo(() => {
    const ws = String(workspaceId || '').trim();
    if (!ws) return [];
    return users
      .filter((u) => String(u.currentWorkspaceId || '').trim() === ws)
      .map((u) => ({
        email: String(u.email || '').trim(),
        name: String(u.profile?.full_name || u.name || '').trim(),
        planTierRaw: String(u.planTier || '').trim() || null,
        planLabel: formatPlanLabel(u.planTier),
        confirmed: Boolean(u.emailConfirmedAt),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }, [users, workspaceId]);

  function stripeCustomerUrl(id: string) {
    const safe = String(id || '').trim();
    if (!safe) return '';
    const prefix = stripeMode === 'test' ? 'test/' : '';
    return `https://dashboard.stripe.com/${prefix}customers/${encodeURIComponent(safe)}`;
  }

  function stripeSubscriptionUrl(id: string) {
    const safe = String(id || '').trim();
    if (!safe) return '';
    const prefix = stripeMode === 'test' ? 'test/' : '';
    return `https://dashboard.stripe.com/${prefix}subscriptions/${encodeURIComponent(safe)}`;
  }

  async function fetchBillingByWorkspaceId(wsId: string) {
    const workspace_id = String(wsId || '').trim();
    if (!workspace_id) {
      setWsBilling(null);
      setWsBillingError('Please select a workspace.');
      return;
    }

    try {
      setWsBillingError('');
      setWsBillingLoading(true);
      setWsBilling(null);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch(`/api/admin/billing/workspace?workspace_id=${encodeURIComponent(workspace_id)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const { json, text } = await readJsonOrText(res);

      if (!res.ok) {
        const requestId =
          res.headers.get('x-request-id') || res.headers.get('x-vercel-id') || res.headers.get('cf-ray') || '';

        // Surface both the error code AND the underlying details (e.g. PostgREST message).
        const errorParts = [json?.error, json?.details || json?.hint]
          .filter(Boolean)
          .join(' — ');
        const serverMsg =
          errorParts ||
          json?.code ||
          json?.message ||
          (text ? text.slice(0, 500) : null) ||
          `Failed (HTTP ${res.status})`;

        const msg = requestId ? `${serverMsg} (req: ${requestId})` : serverMsg;
        throw new Error(msg);
      }

      setWsBilling((json as AdminBillingWorkspaceResponse) || null);
    } catch (e: any) {
      setWsBilling(null);
      setWsBillingError(e?.message || 'Failed to load billing snapshot.');
    } finally {
      setWsBillingLoading(false);
    }
  }

  async function refreshWorkspaceBilling() {
    await fetchBillingByWorkspaceId(workspaceId);
  }

  function moneyToMinorGBP(s: string): number | null {
    const raw = String(s || '').trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  function closeModal() {
    setModal(null);
  }

  async function createVoucher() {
    const workspace_id = String(workspaceId || '').trim();
    if (!workspace_id) {
      setPromoMsg('Please select a workspace.');
      return;
    }

    const kind = voucherKind;

    const email = String(issuedToEmail || '').trim();
    if (kind === 'targeted') {
      if (!email || !email.includes('@')) {
        setPromoMsg('Targeted vouchers require a valid email address.');
        return;
      }
      if (promoMaxRedemptions !== 1) setPromoMaxRedemptions(1);
    }

    setPromoMsg('');
    setSendMsg('');

    try {
      setPromoBusy(true);

      const token = await getAccessToken();
      if (!token) {
        setPromoMsg('No auth token.');
        return;
      }

      const prefix = promoCodePrefix.trim().toUpperCase();
      if (!prefix || prefix.length < 3) {
        setPromoMsg('Code prefix must be at least 3 characters.');
        return;
      }

      const percent = Number(promoPercentOff);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        setPromoMsg('Percent off must be between 1 and 100.');
        return;
      }

      const maxRedemptions = Number(promoMaxRedemptions);
      if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 10000) {
        setPromoMsg('Max redemptions must be between 1 and 10000.');
        return;
      }

      const durationInMonths =
        promoDuration === 'repeating' ? Math.max(1, Math.min(36, Number(promoDurationMonths) || 1)) : null;

      const redeemBy = promoRedeemBy.trim();
      const redeemByIso = redeemBy ? new Date(`${redeemBy}T23:59:59.000Z`).toISOString() : null;
      if (redeemBy && Number.isNaN(new Date(redeemByIso as string).getTime())) {
        setPromoMsg('Redeem-by date is invalid.');
        return;
      }

      const body = {
        workspace_id,
        code_prefix: prefix,
        percent_off: percent,
        duration: promoDuration,
        duration_in_months: durationInMonths,
        max_redemptions: maxRedemptions,
        redeem_by_iso: redeemByIso,
        kind,
        issued_to_email: kind === 'targeted' ? email : null,
      };

      // Voucher creation is proxied through the server-side route which
      // derives the Supabase Edge Function URL from NEXT_PUBLIC_SUPABASE_URL.
      // No NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL required in the browser.
      const res = await fetch('/api/admin/stripe/promo/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const { json, text } = await readJsonOrText(res);

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.details ||
          json?.message ||
          (text ? text.slice(0, 220) : null) ||
          `Failed (HTTP ${res.status})`;
        setPromoMsg(msg);
        return;
      }

      const code = String(json?.code || '').trim();
      if (code) {
        await copyToClipboard(code);
        setPromoMsg(`Voucher created and copied: ${code}`);
      } else {
        setPromoMsg('Voucher created, but code missing in response.');
      }

      await fetchBillingByWorkspaceId(workspace_id);

      // Refresh customer snapshot too (if open)
      if (selectedEmail) await loadCustomerByEmail(selectedEmail);
    } catch (e: any) {
      setPromoMsg(e?.message || 'Failed to create voucher.');
    } finally {
      setPromoBusy(false);
    }
  }

  async function sendVoucherEmail() {
    setSendMsg('');
    setPromoMsg('');
    setBillingMsg('');

    const email = String(issuedToEmail || selectedEmail || cust?.user?.email || '').trim();
    if (!email || !email.includes('@')) {
      setSendMsg('Select a valid customer email first.');
      return;
    }

    const code = String(lastVoucherCode || '').trim();
    if (!code) {
      setSendMsg('No voucher code found yet. Create a voucher first.');
      return;
    }

    try {
      setSendBusy(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch('/api/admin/support/vouchers/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: email,
          code,
          message: 'Here is your TISSCA voucher code. Please use it before it expires.',
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.message || payload?.error || `Failed (HTTP ${res.status})`;
        setSendMsg(msg);
        return;
      }

      setSendMsg(payload?.message || 'Email sent.');
    } catch (e: any) {
      setSendMsg(e?.message || 'Failed to send email.');
    } finally {
      setSendBusy(false);
    }
  }

  async function togglePortalPromoCodes(nextValue: boolean) {
    try {
      setPortalMsg('');
      setPortalBusy(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch('/api/admin/stripe/portal/promo-codes', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allow_promotion_codes: nextValue }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      setPortalAllowPromoCodes(Boolean(payload?.allow_promotion_codes));
      setPortalMsg(payload?.message || 'Updated.');
    } catch (e: any) {
      setPortalMsg(e?.message || 'Failed to update portal setting.');
      setPortalAllowPromoCodes(false);
    } finally {
      setPortalBusy(false);
    }
  }

  async function callSubscriptionAction(action: 'cancel' | 'pause' | 'resume', extra?: any) {
    setBillingMsg('');
    setPromoMsg('');
    setSendMsg('');

    if (!wsIdForActions) {
      setBillingMsg('No workspace loaded. Open a customer or select a workspace first.');
      return;
    }

    try {
      setBillingBusy(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch('/api/admin/stripe/subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: wsIdForActions,
          action,
          ...(extra || {}),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Failed (HTTP ${res.status})`;
        setBillingMsg(msg);
        return;
      }

      const status = String(payload?.status || '').trim() || 'updated';
      setBillingMsg(`Subscription ${action} OK (${status}).`);

      await fetchBillingByWorkspaceId(wsIdForActions);
      if (selectedEmail) await loadCustomerByEmail(selectedEmail);
    } catch (e: any) {
      setBillingMsg(e?.message || 'Subscription action failed.');
    } finally {
      setBillingBusy(false);
      closeModal();
    }
  }

  async function callCredit() {
    setBillingMsg('');
    setPromoMsg('');
    setSendMsg('');

    if (!wsIdForActions) {
      setBillingMsg('No workspace loaded. Open a customer or select a workspace first.');
      return;
    }

    const amount_minor = moneyToMinorGBP(creditAmountGBP);
    if (!amount_minor) {
      setBillingMsg('Enter a valid credit amount (e.g. 10.00).');
      return;
    }

    try {
      setBillingBusy(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch('/api/admin/stripe/credits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: wsIdForActions,
          amount_minor,
          currency: 'gbp',
          description: creditReason || 'Support goodwill credit',
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Failed (HTTP ${res.status})`;
        setBillingMsg(msg);
        return;
      }

      setBillingMsg('Credit applied to customer balance.');
      await fetchBillingByWorkspaceId(wsIdForActions);
      if (selectedEmail) await loadCustomerByEmail(selectedEmail);
    } catch (e: any) {
      setBillingMsg(e?.message || 'Credit failed.');
    } finally {
      setBillingBusy(false);
      closeModal();
    }
  }

  async function callRefund() {
    setBillingMsg('');
    setPromoMsg('');
    setSendMsg('');

    const pi = refundPaymentIntent.trim();
    const ch = refundCharge.trim();

    if (!pi && !ch) {
      setBillingMsg('Enter a PaymentIntent (pi_...) or Charge (ch_...) to refund.');
      return;
    }

    const amount_minor = refundAmountGBP.trim() ? moneyToMinorGBP(refundAmountGBP) : null;
    if (refundAmountGBP.trim() && !amount_minor) {
      setBillingMsg('Refund amount is invalid.');
      return;
    }

    try {
      setBillingBusy(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch('/api/admin/stripe/refunds', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent: pi || undefined,
          charge: ch || undefined,
          amount_minor: amount_minor ?? null,
          reason: refundReason || null,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Failed (HTTP ${res.status})`;
        setBillingMsg(msg);
        return;
      }

      setBillingMsg('Refund created successfully.');
    } catch (e: any) {
      setBillingMsg(e?.message || 'Refund failed.');
    } finally {
      setBillingBusy(false);
      closeModal();
    }
  }

  const modalTitle =
    modal === 'cancel_now'
      ? 'Cancel subscription now'
      : modal === 'cancel_eop'
        ? 'Cancel at period end'
        : modal === 'pause'
          ? 'Pause subscription'
          : modal === 'resume'
            ? 'Resume subscription'
            : modal === 'credit'
              ? 'Apply credit'
              : modal === 'refund'
                ? 'Refund payment'
                : '';

  const modalBody =
    modal === 'cancel_now'
      ? 'This cancels the subscription immediately.'
      : modal === 'cancel_eop'
        ? 'This keeps the subscription active until the end of the current period, then cancels.'
        : modal === 'pause'
          ? 'This pauses billing collection on the subscription (Stripe pause_collection).'
          : modal === 'resume'
            ? 'This removes pause_collection and resumes billing.'
            : modal === 'credit'
              ? 'This creates a customer balance credit which reduces future invoice amounts.'
              : modal === 'refund'
                ? 'This creates a refund for a PaymentIntent or Charge. If you leave amount blank, Stripe refunds the full amount.'
                : '';

  return (
    <div className="min-h-screen bg-gray-50 py-12 text-slate-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-blue-600 hover:text-blue-700 inline-block">
              ← Admin Dashboard
            </Link>
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-700 inline-block">
              Users
            </Link>
          </div>

          <button
            onClick={loadUsers}
            disabled={loadingUsers}
            className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900 disabled:opacity-50"
            type="button"
          >
            {loadingUsers ? 'Refreshing…' : 'Refresh users'}
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vouchers & Billing</h1>
            <p className="text-gray-600">Customer lookup → workspace billing snapshot → vouchers → staff billing actions</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-500">Rule</div>
            <div className="text-sm font-semibold text-slate-900">
              Billing is <span className="font-semibold">workspace-scoped</span> (billing container). No guessing.
            </div>
          </div>
        </div>

        {usersError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{usersError}</div>
        )}

        {/* Customer search + snapshot */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Find customer</h2>
              <p className="mt-1 text-sm text-gray-600">
                Search by email or name, open the snapshot, and it will load the workspace billing container.
              </p>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-[11px] text-gray-500">Status</div>
              <div className="text-sm text-gray-700">
                {searchBusy ? 'Searching…' : searchErr ? 'Error' : results.length ? `${results.length} match(es)` : '—'}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by email or full name…"
                className="w-full border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-2 text-[11px] text-gray-500">Server-side search. Minimum 2 characters.</div>
              {searchErr && <div className="mt-2 text-xs text-red-700">{searchErr}</div>}
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Selected</div>
              <div className="mt-2 text-sm text-gray-700 truncate">{selectedEmail || '—'}</div>
              <div className="mt-1 text-[11px] text-gray-500 font-mono break-all">ws: {selectedWorkspaceId || '—'}</div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedEmail || custBusy}
                  onClick={() => selectedEmail && loadCustomerByEmail(selectedEmail)}
                  className="text-xs px-3 py-2 rounded border border-gray-300 bg-white font-semibold text-slate-900 hover:bg-gray-50 disabled:opacity-50"
                >
                  {custBusy ? 'Loading…' : 'Open'}
                </button>

                <button
                  type="button"
                  disabled={!selectedEmail}
                  onClick={() => {
                    setSelected(null);
                    setCust(null);
                    setCustErr('');
                    setBillingMsg('');
                    setPromoMsg('');
                    setSendMsg('');
                  }}
                  className="text-xs px-3 py-2 rounded border border-gray-300 bg-white font-semibold text-slate-900 hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-4 rounded border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {results.map((r) => (
                  <li key={r.id} className="p-3 bg-white flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{r.email}</div>
                      <div className="text-xs text-gray-500 truncate">{String(r.full_name || '').trim() || '—'}</div>
                      <div className="text-[11px] text-gray-500 font-mono truncate">
                        {r.current_workspace_id ? `ws: ${r.current_workspace_id}` : 'ws: —'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setSelected(r);
                        setCust(null);
                        setCustErr('');
                        setPromoMsg('');
                        setSendMsg('');
                        setBillingMsg('');
                        await loadCustomerByEmail(r.email);
                      }}
                      className="shrink-0 text-xs px-3 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {custErr && <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{custErr}</div>}

          {!!cust && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Email</div>
                <div className="mt-1 font-semibold text-slate-900 break-all">{cust.user.email}</div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cust.user.email)}
                  className="mt-2 text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Copy
                </button>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Name</div>
                <div className="mt-1 font-semibold text-slate-900">{cust.user.full_name || '—'}</div>
                <div className="mt-2 text-[11px] text-gray-500 font-mono break-all">uid: {cust.user.id}</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Workspace</div>
                <div className="mt-1 font-semibold text-slate-900">{cust.workspace?.name || '—'}</div>
                <div className="mt-2 text-[11px] text-gray-500 font-mono break-all">{cust.user.current_workspace_id || '—'}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${planBadgeClasses(
                      cust.workspace?.plan_tier
                    )}`}
                  >
                    {formatPlanLabel(cust.workspace?.plan_tier)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${
                      statusTone(cust.workspace?.subscription_status) === 'good'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : statusTone(cust.workspace?.subscription_status) === 'warn'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {statusLabel(cust.workspace?.subscription_status)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Next billing date: <span className="font-semibold">{fmtDate(cust.workspace?.current_period_end, 'date')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Billing Portal promo codes policy */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Billing Portal promo codes</h2>
              <p className="mt-1 text-sm text-gray-600">
                For email-locked targeted vouchers, portal promo codes must remain <span className="font-semibold">OFF</span> to prevent bypass.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={portalBusy}
                onClick={() => togglePortalPromoCodes(false)}
                className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900 disabled:opacity-50"
              >
                Force OFF
              </button>

              <button
                type="button"
                disabled={portalBusy}
                onClick={() => togglePortalPromoCodes(true)}
                className="text-sm border border-amber-300 bg-amber-50 px-3 py-2 rounded hover:bg-amber-100 font-semibold text-amber-900 disabled:opacity-50"
              >
                Turn ON (not recommended)
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm text-gray-700">
              Current policy (server):{' '}
              <span className={`font-semibold ${portalAllowPromoCodes ? 'text-amber-800' : 'text-green-700'}`}>
                {portalAllowPromoCodes ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              This page calls <span className="font-mono">PATCH /api/admin/stripe/portal/promo-codes</span> (staff-only).
            </div>
          </div>

          {portalMsg && <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">{portalMsg}</div>}

          <div className="mt-3 text-[11px] text-gray-500">
            Note: Stripe itself cannot email-lock promo codes. Targeted vouchers must be enforced in your Checkout session creation API.
          </div>
        </div>

        {/* Workspace billing + voucher generator */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Workspace — Billing snapshot</h2>
              <p className="mt-1 text-sm text-gray-600">Workspace-scoped billing container. Choose a workspace, then refresh.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-gray-600">Stripe mode</div>
              <select
                value={stripeMode}
                onChange={(e) => setStripeMode(e.target.value as 'test' | 'live')}
                className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>

              <button
                type="button"
                onClick={refreshWorkspaceBilling}
                disabled={wsBillingLoading || !workspaceId}
                className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {wsBillingLoading ? 'Refreshing…' : 'Refresh snapshot'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Workspace</div>
              <select
                value={workspaceId}
                onChange={(e) => {
                  const v = e.target.value;
                  setWorkspaceId(v);
                  setWsBilling(null);
                  setWsBillingError('');
                  setPromoMsg('');
                  setSendMsg('');
                  setBillingMsg('');
                }}
                className="w-full border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select a workspace…</option>
                {workspaceOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-[11px] text-gray-500">
                This selector is <span className="font-semibold">workspace-scoped</span> (billing container). It may show multiple people inside one workspace.
              </div>
            </div>

            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">Users inside this workspace</div>
              <div className="mt-2 text-xs text-gray-700">
                {usersInWorkspace.length === 0 ? '—' : `${usersInWorkspace.length} member${usersInWorkspace.length === 1 ? '' : 's'}`}
              </div>

              {usersInWorkspace.length > 0 && (
                <div className="mt-2 max-h-[120px] overflow-auto border border-gray-200 rounded bg-white">
                  <ul className="divide-y divide-gray-100">
                    {usersInWorkspace.map((u) => (
                      <li key={u.email} className="px-2 py-2 text-[12px] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{u.email}</div>
                          <div className="truncate text-gray-500">{u.name || '—'}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border ${planBadgeClasses(
                              u.planTierRaw
                            )}`}
                          >
                            {u.planLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setVoucherKind('targeted');
                              setIssuedToEmail(u.email);
                              setPromoMaxRedemptions(1);
                              setPromoMsg('');
                              setSendMsg('');
                            }}
                            className="text-[11px] px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            title="Prefill targeted voucher email"
                          >
                            Target
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {wsBillingError && (
            <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">Workspace snapshot failed</div>
                  <div className="mt-1 whitespace-pre-wrap break-words">{wsBillingError}</div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(wsBillingError)}
                  className="shrink-0 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-100"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {!!wsBilling?.workspace && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Workspace</div>
                <div className="font-semibold text-slate-900">{wsBilling.workspace?.name || '—'}</div>
                <div className="mt-1 font-mono text-xs break-all text-gray-600">{wsBilling.workspace?.id || '—'}</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Plan & status</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${planBadgeClasses(
                      wsBilling.workspace?.plan_tier
                    )}`}
                  >
                    {formatPlanLabel(wsBilling.workspace?.plan_tier)}
                  </span>

                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${
                      statusTone(wsBilling.workspace?.subscription_status) === 'good'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : statusTone(wsBilling.workspace?.subscription_status) === 'warn'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {statusLabel(wsBilling.workspace?.subscription_status)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Next billing date: <span className="font-semibold">{fmtDate(wsBilling.workspace?.current_period_end, 'date')}</span>
                </div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <div className="text-xs text-gray-500">Stripe IDs</div>

                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-gray-500">Customer</div>
                      <div className="font-mono text-xs break-all text-slate-900">{wsBilling.workspace?.stripe_customer_id || '—'}</div>
                    </div>
                    <a
                      href={wsBilling.workspace?.stripe_customer_id ? stripeCustomerUrl(wsBilling.workspace.stripe_customer_id) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                        wsBilling.workspace?.stripe_customer_id ? 'hover:bg-gray-50 text-gray-700' : 'opacity-50 pointer-events-none text-gray-400'
                      }`}
                    >
                      Open
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-gray-500">Subscription</div>
                      <div className="font-mono text-xs break-all text-slate-900">{wsBilling.workspace?.stripe_subscription_id || '—'}</div>
                    </div>
                    <a
                      href={wsBilling.workspace?.stripe_subscription_id ? stripeSubscriptionUrl(wsBilling.workspace.stripe_subscription_id) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs px-2 py-1 rounded border border-gray-300 ${
                        wsBilling.workspace?.stripe_subscription_id ? 'hover:bg-gray-50 text-gray-700' : 'opacity-50 pointer-events-none text-gray-400'
                      }`}
                    >
                      Open
                    </a>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-gray-500">Dashboard links only; safe.</div>
              </div>
            </div>
          )}

          {/* Voucher generator */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create voucher</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Campaign vouchers are shareable. Targeted vouchers are intended to be email-locked in your checkout flow (server validation).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherKind('targeted');
                      setIssuedToEmail(selectedEmail);
                      setPromoMaxRedemptions(1);
                      setPromoMsg('');
                      setSendMsg('');
                    }}
                    className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Prefill targeted: {selectedEmail}
                  </button>
                )}

                <button
                  type="button"
                  onClick={sendVoucherEmail}
                  disabled={sendBusy || !lastVoucherCode || !(issuedToEmail || selectedEmail || cust?.user?.email)}
                  className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title={lastVoucherCode ? `Sends: ${lastVoucherCode}` : 'Create a voucher first'}
                >
                  {sendBusy ? 'Sending…' : 'Send last voucher email'}
                </button>

                <button
                  type="button"
                  onClick={createVoucher}
                  disabled={promoBusy || !workspaceId}
                  className="text-xs px-4 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {promoBusy ? 'Creating…' : 'Create voucher'}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Voucher type</div>
                <select
                  value={voucherKind}
                  onChange={(e) => {
                    const v = e.target.value as 'campaign' | 'targeted';
                    setVoucherKind(v);
                    setPromoMsg('');
                    setSendMsg('');
                    if (v === 'campaign') setIssuedToEmail('');
                    if (v === 'targeted') setPromoMaxRedemptions(1);
                  }}
                  className="w-full border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm"
                >
                  <option value="campaign">Campaign (bulk / shareable)</option>
                  <option value="targeted">Targeted (single user / email-locked)</option>
                </select>

                <div className="mt-2 text-[11px] text-gray-500">
                  Targeted vouchers require email enforcement in the Checkout API. Portal promo codes must remain OFF.
                </div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Issued to (email)</div>
                <input
                  value={issuedToEmail}
                  onChange={(e) => setIssuedToEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                  placeholder="name@email.com"
                  disabled={voucherKind !== 'targeted' || promoBusy}
                />
                <div className="mt-2 text-[11px] text-gray-500">Only required for Targeted. For Campaign vouchers, leave blank.</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Max redemptions</div>
                <input
                  type="number"
                  value={promoMaxRedemptions}
                  onChange={(e) => setPromoMaxRedemptions(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                  min={1}
                  max={10000}
                  disabled={promoBusy || voucherKind === 'targeted'}
                />
                <div className="mt-2 text-[11px] text-gray-500">For Targeted vouchers this is forced to 1.</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Code prefix</div>
                <input
                  value={promoCodePrefix}
                  onChange={(e) => setPromoCodePrefix(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white font-mono text-xs"
                  placeholder="TISSCA"
                  disabled={promoBusy}
                />
                <div className="mt-2 text-[11px] text-gray-500">Stripe will generate a unique code with this prefix.</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Percent off</div>
                <input
                  type="number"
                  value={promoPercentOff}
                  onChange={(e) => setPromoPercentOff(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                  min={1}
                  max={100}
                  disabled={promoBusy}
                />
                <div className="mt-2 text-[11px] text-gray-500">Applies to the subscription invoice in Stripe.</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">Redeem by (optional)</div>
                <input
                  type="date"
                  value={promoRedeemBy}
                  onChange={(e) => setPromoRedeemBy(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                  disabled={promoBusy}
                />
                <div className="mt-2 text-[11px] text-gray-500">If set, the voucher expires after this date.</div>
              </div>

              <div className="rounded border border-gray-200 p-3 bg-white md:col-span-3">
                <div className="text-xs text-gray-500 mb-1">Duration</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={promoDuration}
                    onChange={(e) => setPromoDuration(e.target.value as any)}
                    className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm"
                    disabled={promoBusy}
                  >
                    <option value="once">Once</option>
                    <option value="repeating">Repeating</option>
                    <option value="forever">Forever</option>
                  </select>

                  {promoDuration === 'repeating' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Months</span>
                      <input
                        type="number"
                        value={promoDurationMonths}
                        onChange={(e) => setPromoDurationMonths(Number(e.target.value))}
                        className="w-24 border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                        min={1}
                        max={36}
                        disabled={promoBusy}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-gray-500">“Once” = next invoice only. “Repeating” = next N months. “Forever” = until cancelled.</div>
              </div>
            </div>

            {sendMsg && <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">{sendMsg}</div>}
            {promoMsg && <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">{promoMsg}</div>}

            <div className="mt-2 text-[11px] text-gray-500">
              Route: <span className="font-mono">/api/admin/stripe/promo/create</span> → Edge Function: <span className="font-mono">admin-create-promo-code</span>
            </div>
          </div>

          {/* Billing actions */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Billing actions</h3>
                <p className="mt-1 text-xs text-gray-600">Staff-only support controls (workspace-scoped, proof-based). Use carefully.</p>
              </div>

              <button
                type="button"
                disabled={!workspaceId || wsBillingLoading}
                onClick={() => workspaceId && fetchBillingByWorkspaceId(workspaceId)}
                className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh billing
              </button>
            </div>

            {!canAct ? (
              <div className="mt-3 text-sm text-gray-600">Open a customer or select a workspace to enable billing actions.</div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm font-semibold text-slate-900">Cancel subscription</div>
                    <div className="mt-1 text-xs text-gray-600">Cancel immediately or at period end.</div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={billingBusy}
                        onClick={() => setModal('cancel_now')}
                        className="text-xs px-3 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        Cancel now
                      </button>
                      <button
                        type="button"
                        disabled={billingBusy}
                        onClick={() => setModal('cancel_eop')}
                        className="text-xs px-3 py-2 rounded border border-gray-300 bg-white font-semibold text-slate-900 hover:bg-gray-50 disabled:opacity-50"
                      >
                        End of period
                      </button>
                    </div>
                  </div>

                  <div className="rounded border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm font-semibold text-slate-900">Pause / Resume</div>
                    <div className="mt-1 text-xs text-gray-600">Pause_collection on the subscription.</div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={billingBusy}
                        onClick={() => setModal('pause')}
                        className="text-xs px-3 py-2 rounded border border-gray-300 bg-white font-semibold text-slate-900 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        disabled={billingBusy}
                        onClick={() => setModal('resume')}
                        className="text-xs px-3 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        Resume
                      </button>
                    </div>
                  </div>

                  <div className="rounded border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm font-semibold text-slate-900">Apply credit</div>
                    <div className="mt-1 text-xs text-gray-600">Creates customer balance credit (reduces future invoices).</div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <input
                        value={creditAmountGBP}
                        onChange={(e) => setCreditAmountGBP(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                        placeholder="10.00"
                        disabled={billingBusy}
                      />
                      <button
                        type="button"
                        disabled={billingBusy}
                        onClick={() => setModal('credit')}
                        className="text-xs px-3 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        Apply credit
                      </button>
                    </div>

                    <input
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                      placeholder="Reason (optional)"
                      disabled={billingBusy}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-slate-900">Refund payment</div>
                  <div className="mt-1 text-xs text-gray-600">Provide a PaymentIntent (pi_...) or Charge (ch_...). Amount is optional for partial refunds.</div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                      value={refundPaymentIntent}
                      onChange={(e) => setRefundPaymentIntent(e.target.value)}
                      className="md:col-span-2 border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                      placeholder="PaymentIntent (pi_...)"
                      disabled={billingBusy}
                    />
                    <input
                      value={refundCharge}
                      onChange={(e) => setRefundCharge(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                      placeholder="Charge (ch_...)"
                      disabled={billingBusy}
                    />
                    <input
                      value={refundAmountGBP}
                      onChange={(e) => setRefundAmountGBP(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 bg-white text-sm"
                      placeholder="Amount £ (optional)"
                      disabled={billingBusy}
                    />
                    <button
                      type="button"
                      disabled={billingBusy}
                      onClick={() => setModal('refund')}
                      className="text-xs px-3 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                    >
                      Create refund
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-600">Reason</span>
                    <select
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value as any)}
                      className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm"
                      disabled={billingBusy}
                    >
                      <option value="requested_by_customer">Requested by customer</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="fraudulent">Fraudulent</option>
                      <option value="">Other / unset</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {billingMsg && <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm">{billingMsg}</div>}

            <div className="mt-2 text-[11px] text-gray-500">
              Safety: actions are staff-only and workspace-scoped. Refunds require a PaymentIntent/Charge id.
            </div>
          </div>

          {/* Voucher audit list */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-900">Issued vouchers (audit)</h4>
              <button
                type="button"
                onClick={refreshWorkspaceBilling}
                disabled={wsBillingLoading || !workspaceId}
                className="text-xs px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh list
              </button>
            </div>

            {!wsBilling?.promo_issues || wsBilling.promo_issues.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">No vouchers issued for this workspace yet.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Issued to</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Discount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Max</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Redeem by</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Created</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wsBilling.promo_issues.map((p) => (
                      <tr key={p.id} className="bg-white">
                        <td className="px-3 py-2">
                          <div className="font-mono text-xs text-slate-900 break-all">{p.code}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{p.kind || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{p.issued_to_email || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {p.percent_off != null
                            ? `${p.percent_off}%`
                            : p.amount_off != null
                              ? `${p.amount_off} ${p.currency ?? ''}`
                              : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {p.duration || '—'}
                          {p.duration === 'repeating' && p.duration_in_months ? ` (${p.duration_in_months}m)` : ''}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{p.max_redemptions ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{fmtDate(p.redeem_by, 'date')}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{fmtDate(p.created_at, 'datetime')}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.code)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.promotion_code_id || '')}
                              disabled={!p.promotion_code_id}
                              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                              title="Copy Stripe promotion_code id"
                            >
                              Copy promo id
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 text-[11px] text-gray-500">
              Audit source: <span className="font-mono">public.admin_promo_issues</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-gray-500">
          Reminder: Stripe cannot enforce “only this email can redeem”. Targeted vouchers must be validated server-side during checkout session creation.
        </div>
      </div>

      {/* Confirmation modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="text-lg font-bold text-slate-900">{modalTitle}</div>
              <div className="mt-1 text-sm text-gray-600">{modalBody}</div>
            </div>

            <div className="p-4">
              <div className="text-xs text-gray-500">
                Customer: <span className="font-semibold text-gray-700">{selectedEmail || cust?.user?.email || '—'}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Workspace: <span className="font-mono text-gray-700">{wsIdForActions || '—'}</span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={billingBusy}
                  className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={() => {
                    if (modal === 'cancel_now') return callSubscriptionAction('cancel', { cancel_at_period_end: false });
                    if (modal === 'cancel_eop') return callSubscriptionAction('cancel', { cancel_at_period_end: true });
                    if (modal === 'pause') return callSubscriptionAction('pause', { pause_behavior: 'void' });
                    if (modal === 'resume') return callSubscriptionAction('resume');
                    if (modal === 'credit') return callCredit();
                    if (modal === 'refund') return callRefund();
                  }}
                  className="text-sm bg-slate-900 text-white px-4 py-2 rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {billingBusy ? 'Working…' : 'Confirm'}
                </button>
              </div>

              <div className="mt-3 text-[11px] text-gray-500">
                Fail-closed: actions require staff auth and a valid workspace billing container.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}