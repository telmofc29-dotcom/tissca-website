// src/lib/accountant-hub.ts v1.0
//
// PURPOSE:
// Central authority for Accountant Hub access control and financial snapshot logic.
// Shared server contract consumed by website, Android, and iOS.
//
// LOCKED BUSINESS RULES:
// - Free: No access
// - Pro: Owner only (single-user plan)
// - Team Starter: Owner only (members blocked)
// - Team Pro: Owner + accountant only (admin and member blocked)
//
// TRIPLE-REDUNDANCY DESIGN:
// 1. Raw source records: invoices, quotes, documents tables (live queries)
// 2. Server-computed snapshot: accountant_hub_snapshots table (periodic persistence)
// 3. Client-side verification: client re-computes from returned raw data, compares to snapshot
// 4. Mismatch detection: delta comparison with configurable tolerance
// 5. Audit log: every access, snapshot, reconciliation logged
// 6. Warning states: response includes reconciliation_status + mismatch_flags

import { createServerSupabaseClient } from '@/lib/supabase';
import { normalizePlanTier, isPro, type PlanTier } from '@/lib/plans';
import type { ResolvedUser } from '@/lib/workspace-data';

// Re-export client-safe pure function (defined in accountant-hub-shared.ts)
// so server-side code can also import it from this module.
export { isAccountantHubRoleAllowed } from '@/lib/accountant-hub-shared';
import { isAccountantHubRoleAllowed } from '@/lib/accountant-hub-shared';

// ─── Types (Shared Contract) ────────────────────────────────────────────────

/** Access decision returned by resolveAccountantHubAccess */
export type AccountantHubAccess = {
  granted: boolean;
  workspace_id: string;
  plan_tier: PlanTier;
  member_role: string;
  membership_status: 'active' | 'not_member';
  accountant_hub_access: boolean;
  denial_reason?: string;
  // For Android/iOS contract parity
  denial_code?:
    | 'no_workspace'
    | 'tier_free'
    | 'not_member'
    | 'role_not_allowed';
};

/** Financial snapshot shape — matches live public.accountant_hub_snapshots */
export type FinancialSnapshot = {
  snapshot_version: number;
  computed_at: string; // ISO 8601
  computed_by: 'server' | 'client' | 'reconciliation';
  currency: string;
  period_start: string;
  period_end: string;
  tax_year: string;

  // Income
  total_income: number;
  total_expenses: number;
  profit: number;
  total_vat: number;

  // Invoices
  invoice_count: number;
  invoices_paid_count: number;
  invoices_outstanding_count: number;
  invoices_overdue_count: number;
  total_paid: number;
  total_outstanding: number;

  // Quotes
  quote_count: number;
  accepted_quote_count: number;

  // Documents
  document_count: number;
  tool_attachment_count: number;

  // Tax
  estimated_taxable_income: number;
  estimated_tax: number;
  vat_liability: number;
  effective_tax_rate: number;

  // Reconciliation
  reconciliation_status: 'unverified' | 'verified' | 'mismatch' | 'stale';
  mismatch_flags: Record<string, { snapshot: number; live: number; delta: number }>;
  mismatch_details: Record<string, unknown> | null;
};

/** Full Accountant Hub API response — shared contract */
export type AccountantHubResponse = {
  access: {
    workspace_id: string;
    plan_tier: string;
    member_role: string;
    accountant_hub_access: true;
  };
  financial: {
    yearRevenue: number;
    monthRevenue: number;
    prevMonthRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    invoicesTotal: number;
    invoicesPaid: number;
    invoicesOutstanding: number;
    invoicesOverdue: number;
    quotesTotal: number;
    quotesAccepted: number;
  };
  tax: {
    estimatedAnnualIncome: number;
    estimatedTax: number;
    effectiveRate: number;
    taxYear: string;
  };
  documents: {
    invoicesGenerated: number;
    quotesGenerated: number;
  };
  recentInvoices: unknown[];
  recentQuotes: unknown[];
  snapshot: {
    version: number;
    computed_at: string;
    reconciliation_status: string;
    mismatch_flags: Record<string, unknown>;
  } | null;
};

// ─── MISMATCH TOLERANCE ─────────────────────────────────────────────────────

/** Absolute tolerance (in currency units) for reconciliation mismatch detection */
const RECONCILIATION_TOLERANCE = 0.01; // £0.01

// ─── Access Control ─────────────────────────────────────────────────────────

/**
 * Resolve whether a user can access the Accountant Hub.
 *
 * Logic:
 * 1. Must have a workspace
 * 2. Must be on a paid plan (isPro)
 * 3. Must be a workspace member
 * 4. Role check:
 *    - Pro / Pro Plus: owner only (single-user plan, so owner = only member)
 *    - Team Starter: owner only
 *    - Team Pro: owner OR accountant only
 *
 * This function performs NO side effects. It only reads and decides.
 */
export async function resolveAccountantHubAccess(
  resolved: ResolvedUser,
): Promise<AccountantHubAccess> {
  const supabase = createServerSupabaseClient();
  const wsId = resolved.workspaceId;

  // ── Must have a workspace ──
  if (!wsId) {
    return {
      granted: false,
      workspace_id: '',
      plan_tier: 'free',
      member_role: 'none',
      membership_status: 'not_member',
      accountant_hub_access: false,
      denial_reason: 'No workspace found.',
      denial_code: 'no_workspace',
    };
  }

  // ── Fetch workspace plan tier ──
  const { data: ws } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', wsId)
    .maybeSingle();

  const tier = normalizePlanTier(ws?.plan_tier);

  if (!isPro(tier)) {
    return {
      granted: false,
      workspace_id: wsId,
      plan_tier: tier,
      member_role: 'unknown',
      membership_status: 'not_member',
      accountant_hub_access: false,
      denial_reason: 'Upgrade to Pro or above to access the Accountant Hub.',
      denial_code: 'tier_free',
    };
  }

  // ── Fetch user's workspace membership + role ──
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', resolved.authId)
    .eq('workspace_id', wsId)
    .maybeSingle();

  if (!membership) {
    return {
      granted: false,
      workspace_id: wsId,
      plan_tier: tier,
      member_role: 'none',
      membership_status: 'not_member',
      accountant_hub_access: false,
      denial_reason: 'You are not a member of this workspace.',
      denial_code: 'not_member',
    };
  }

  const role = (membership.role || 'member').toLowerCase();

  // ── Role-based access decision ──
  const allowed = isAccountantHubRoleAllowed(tier, role);

  if (!allowed) {
    return {
      granted: false,
      workspace_id: wsId,
      plan_tier: tier,
      member_role: role,
      membership_status: 'active',
      accountant_hub_access: false,
      denial_reason: buildDenialMessage(tier, role),
      denial_code: 'role_not_allowed',
    };
  }

  return {
    granted: true,
    workspace_id: wsId,
    plan_tier: tier,
    member_role: role,
    membership_status: 'active',
    accountant_hub_access: true,
  };
}

// isAccountantHubRoleAllowed is re-exported from '@/lib/accountant-hub-shared'
// (see import block above). Defined there for client-safe imports.

/** Human-readable denial message based on tier and role. */
function buildDenialMessage(tier: PlanTier, role: string): string {
  if (tier === 'team_pro') {
    return `Only the workspace owner and accountant can access the Accountant Hub. Your role: ${role}.`;
  }
  return `Only the workspace owner can access the Accountant Hub. Your role: ${role}.`;
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

/**
 * Log an Accountant Hub action to the audit table.
 * Fire-and-forget — never blocks the response.
 */
export async function logAccountantHubAction(params: {
  workspace_id: string;
  user_id: string;
  action: string;
  plan_tier?: string;
  member_role?: string;
  snapshot_id?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.from('accountant_hub_audit_log').insert({
      workspace_id: params.workspace_id,
      user_id: params.user_id,
      action: params.action,
      plan_tier: params.plan_tier ?? null,
      member_role: params.member_role ?? null,
      snapshot_id: params.snapshot_id ?? null,
      detail: params.detail ?? {},
    });
  } catch (err) {
    // Fire-and-forget: do not throw
    console.error('[logAccountantHubAction] Failed:', err);
  }
}

// ─── Tax Estimation ─────────────────────────────────────────────────────────

/**
 * Simplified UK income tax estimate (2025/26 bands).
 * NOT financial advice. Display disclaimer required on all clients.
 * Portable: Android and iOS should use identical bands.
 */
export function estimateUkIncomeTax(annualIncome: number): number {
  const personalAllowance = 12570;
  const basicRateLimit = 50270;
  const higherRateLimit = 125140;

  if (annualIncome <= personalAllowance) return 0;

  let tax = 0;
  let remaining = annualIncome - personalAllowance;

  const basicBand = Math.min(remaining, basicRateLimit - personalAllowance);
  tax += basicBand * 0.2;
  remaining -= basicBand;

  if (remaining > 0) {
    const higherBand = Math.min(remaining, higherRateLimit - basicRateLimit);
    tax += higherBand * 0.4;
    remaining -= higherBand;
  }

  if (remaining > 0) {
    tax += remaining * 0.45;
  }

  return tax;
}

// ─── Snapshot Helpers ───────────────────────────────────────────────────────

/** Round to 2 decimal places. */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Compare two numeric values and return a mismatch entry if they differ
 * beyond the tolerance threshold.
 */
export function checkMismatch(
  field: string,
  liveValue: number,
  snapshotValue: number,
): { field: string; live: number; snapshot: number; delta: number } | null {
  const delta = Math.abs(liveValue - snapshotValue);
  if (delta > RECONCILIATION_TOLERANCE) {
    return { field, live: liveValue, snapshot: snapshotValue, delta: round2(delta) };
  }
  return null;
}

/**
 * Store a financial snapshot in the database.
 * Returns the snapshot ID if successful, null otherwise.
 */
export async function storeFinancialSnapshot(
  workspaceId: string,
  snapshot: Omit<FinancialSnapshot, 'snapshot_version' | 'computed_at' | 'computed_by' | 'reconciliation_status' | 'mismatch_flags' | 'mismatch_details'> & {
    reconciliation_status?: string;
    mismatch_flags?: Record<string, unknown>;
    mismatch_details?: Record<string, unknown>;
  },
): Promise<{ id: string; version: number } | null> {
  try {
    const supabase = createServerSupabaseClient();

    // Get next version number
    const { data: lastSnapshot } = await supabase
      .from('accountant_hub_snapshots')
      .select('snapshot_version')
      .eq('workspace_id', workspaceId)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (lastSnapshot?.snapshot_version ?? 0) + 1;

    const { data, error } = await supabase
      .from('accountant_hub_snapshots')
      .insert({
        workspace_id: workspaceId,
        snapshot_version: nextVersion,
        computed_by: 'server',
        period_start: snapshot.period_start,
        period_end: snapshot.period_end,
        tax_year: snapshot.tax_year,
        currency: snapshot.currency,
        total_income: snapshot.total_income,
        total_expenses: snapshot.total_expenses,
        profit: snapshot.profit,
        total_vat: snapshot.total_vat,
        invoice_count: snapshot.invoice_count,
        invoices_paid_count: snapshot.invoices_paid_count,
        invoices_outstanding_count: snapshot.invoices_outstanding_count,
        invoices_overdue_count: snapshot.invoices_overdue_count,
        total_paid: snapshot.total_paid,
        total_outstanding: snapshot.total_outstanding,
        quote_count: snapshot.quote_count,
        accepted_quote_count: snapshot.accepted_quote_count,
        document_count: snapshot.document_count,
        tool_attachment_count: snapshot.tool_attachment_count,
        estimated_taxable_income: snapshot.estimated_taxable_income,
        estimated_tax: snapshot.estimated_tax,
        vat_liability: snapshot.vat_liability,
        effective_tax_rate: snapshot.effective_tax_rate,
        reconciliation_status: snapshot.reconciliation_status ?? 'unverified',
        mismatch_flags: snapshot.mismatch_flags ?? {},
        mismatch_details: snapshot.mismatch_details ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[storeFinancialSnapshot] Insert failed:', error.message);
      return null;
    }

    return data?.id ? { id: data.id, version: nextVersion } : null;
  } catch (err) {
    console.error('[storeFinancialSnapshot] Error:', err);
    return null;
  }
}

/**
 * Update a stored snapshot's reconciliation status after comparison.
 */
export async function updateSnapshotReconciliation(
  snapshotId: string,
  status: 'verified' | 'mismatch',
  flags: Record<string, unknown>,
  details?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase
      .from('accountant_hub_snapshots')
      .update({
        reconciliation_status: status,
        mismatch_flags: flags,
        mismatch_details: details ?? null,
      })
      .eq('id', snapshotId);
  } catch (err) {
    console.error('[updateSnapshotReconciliation] Error:', err);
  }
}

/**
 * Retrieve the latest snapshot for a workspace.
 */
export async function getLatestSnapshot(
  workspaceId: string,
): Promise<(FinancialSnapshot & { id: string }) | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('accountant_hub_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      snapshot_version: data.snapshot_version,
      computed_at: data.computed_at,
      computed_by: data.computed_by,
      currency: data.currency,
      period_start: data.period_start,
      period_end: data.period_end,
      tax_year: data.tax_year,
      total_income: Number(data.total_income),
      total_expenses: Number(data.total_expenses),
      profit: Number(data.profit),
      total_vat: Number(data.total_vat),
      invoice_count: data.invoice_count,
      invoices_paid_count: data.invoices_paid_count,
      invoices_outstanding_count: data.invoices_outstanding_count,
      invoices_overdue_count: data.invoices_overdue_count,
      total_paid: Number(data.total_paid),
      total_outstanding: Number(data.total_outstanding),
      quote_count: data.quote_count,
      accepted_quote_count: data.accepted_quote_count,
      document_count: data.document_count,
      tool_attachment_count: data.tool_attachment_count,
      estimated_taxable_income: Number(data.estimated_taxable_income),
      estimated_tax: Number(data.estimated_tax),
      vat_liability: Number(data.vat_liability),
      effective_tax_rate: Number(data.effective_tax_rate),
      reconciliation_status: data.reconciliation_status,
      mismatch_flags: data.mismatch_flags ?? {},
      mismatch_details: data.mismatch_details ?? null,
    };
  } catch (err) {
    console.error('[getLatestSnapshot] Error:', err);
    return null;
  }
}

/**
 * Reconcile live data against the last stored snapshot.
 * Returns mismatch flags and a reconciliation status.
 */
export function reconcileLiveVsSnapshot(
  live: {
    totalIncome: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
    invoicesPaidCount: number;
    invoicesOutstandingCount: number;
    invoicesOverdueCount: number;
    quoteCount: number;
    acceptedQuoteCount: number;
    estimatedTax: number;
  },
  snapshot: FinancialSnapshot,
): { status: 'verified' | 'mismatch'; flags: Record<string, { snapshot: number; live: number; delta: number }> } {
  const flags: Record<string, { snapshot: number; live: number; delta: number }> = {};

  const checks = [
    checkMismatch('total_income', live.totalIncome, snapshot.total_income),
    checkMismatch('total_paid', live.totalPaid, snapshot.total_paid),
    checkMismatch('total_outstanding', live.totalOutstanding, snapshot.total_outstanding),
    checkMismatch('invoice_count', live.invoiceCount, snapshot.invoice_count),
    checkMismatch('invoices_paid_count', live.invoicesPaidCount, snapshot.invoices_paid_count),
    checkMismatch('invoices_outstanding_count', live.invoicesOutstandingCount, snapshot.invoices_outstanding_count),
    checkMismatch('invoices_overdue_count', live.invoicesOverdueCount, snapshot.invoices_overdue_count),
    checkMismatch('quote_count', live.quoteCount, snapshot.quote_count),
    checkMismatch('accepted_quote_count', live.acceptedQuoteCount, snapshot.accepted_quote_count),
    checkMismatch('estimated_tax', live.estimatedTax, snapshot.estimated_tax),
  ];

  for (const c of checks) {
    if (c) flags[c.field] = { snapshot: c.snapshot, live: c.live, delta: c.delta };
  }

  return {
    status: Object.keys(flags).length === 0 ? 'verified' : 'mismatch',
    flags,
  };
}
