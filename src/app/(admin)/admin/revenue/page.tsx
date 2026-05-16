// src/app/(admin)/admin/revenue/page.tsx v4.0
//
// PURPOSE:
//   Real revenue + commercial truth dashboard for internal finance/admin use.
//   Backed by financial_events, workspaces, workspace_members, auth users,
//   tissca_staff, stripe_webhook_log, stripe_ops_log.
//   No fake numbers — graceful empty states when no data exists.

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type KPIs = {
  grossRevenue: number;
  stripeFees: number;
  netRevenue: number;
  refundsAmount: number;
  refundsCount: number;
  failedCount: number;
  disputesAmount: number;
  disputesCount: number;
  currency: string;
};

type PlanBreakdownRow = {
  planKey: string;
  grossRevenue: number;
  eventCount: number;
};

type WorkspaceCount = {
  planTier: string;
  count: number;
};

type MonthlyRow = {
  month: string;
  label: string;
  grossRevenue: number;
  fees: number;
  netRevenue: number;
  refunds: number;
};

type UserFootprint = {
  totalUsers: number;
  confirmedUsers: number;
  staffUsers: number;
  usersInPaidWorkspaces: number;
  usersInFreeWorkspaces: number;
  totalMembersInTeamWorkspaces: number;
};

type PaidWorkspaceRow = {
  id: string;
  name: string;
  planTier: string;
  subscriptionStatus: string | null;
  ownerName: string;
  memberCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  latestPaymentAmount: number | null;
  latestPaymentDate: string | null;
  latestPaymentCurrency: string;
};

type WebhookRow = {
  id: string;
  received_at: string;
  event_type: string;
  signature_valid: boolean | null;
  http_status: number | null;
  processed: boolean;
  error_message: string | null;
};

type OpsRow = {
  id: string;
  created_at: string;
  kind: string;
  route: string | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
};

type RevenueData = {
  kpis: KPIs;
  planBreakdown: PlanBreakdownRow[];
  workspaceCounts: WorkspaceCount[];
  monthlyRevenue: MonthlyRow[];
  userFootprint: UserFootprint;
  paidWorkspaceDetails: PaidWorkspaceRow[];
  recentWebhooks: WebhookRow[];
  recentOps: OpsRow[];
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team_starter: 'Team Starter',
  team_pro: 'Team Pro',
  team: 'Team (Legacy)',
  premium: 'Premium (Legacy)',
  unknown: 'Unknown',
};

function planLabel(key: string): string {
  return PLAN_LABELS[key] || key;
}

function fmtCurrency(minorUnits: number, currency = 'gbp'): string {
  const sym = currency === 'gbp' ? '£' : currency === 'usd' ? '$' : currency === 'eur' ? '€' : '';
  return `${sym}${(minorUnits / 100).toFixed(2)}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const BADGE_CLASSES: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200',
  disputed: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

function Badge({ status, label }: { status: string; label?: string }) {
  const cls = BADGE_CLASSES[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {label || status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg border ${color} p-5`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminRevenuePage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<RevenueData | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (!isLoggedIn) {
        setError('Not authenticated');
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        setError('No access token');
        return;
      }

      const res = await fetch('/api/admin/revenue', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error || `Request failed (${res.status})`);
        return;
      }

      setData(payload);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [isLoggedIn]);

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h2>
          <p className="text-gray-600 mt-2">Loading billing data…</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Failed to load revenue data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 text-sm font-medium text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    kpis,
    planBreakdown,
    workspaceCounts,
    monthlyRevenue,
    userFootprint,
    paidWorkspaceDetails,
    recentWebhooks,
    recentOps,
  } = data;
  const c = kpis.currency;
  const totalWorkspaces = workspaceCounts.reduce((s, w) => s + w.count, 0);

  // ─── Main render ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h2>
          <p className="text-gray-600 mt-2">
            Real billing, workspace, and user truth
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ─── KPI Cards (This Month) ────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Revenue — This Month
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            label="Gross Revenue"
            value={fmtCurrency(kpis.grossRevenue, c)}
            color="bg-emerald-50 border-emerald-200"
          />
          <KpiCard
            label="Stripe Fees"
            value={fmtCurrency(kpis.stripeFees, c)}
            color="bg-gray-50 border-gray-200"
          />
          <KpiCard
            label="Net Revenue"
            value={fmtCurrency(kpis.netRevenue, c)}
            color="bg-blue-50 border-blue-200"
          />
          <KpiCard
            label="Refunds"
            value={`${fmtCurrency(kpis.refundsAmount, c)} (${kpis.refundsCount})`}
            color="bg-amber-50 border-amber-200"
          />
          <KpiCard
            label="Failed Payments"
            value={String(kpis.failedCount)}
            color={kpis.failedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
          />
          <KpiCard
            label="Disputes"
            value={`${fmtCurrency(kpis.disputesAmount, c)} (${kpis.disputesCount})`}
            color={kpis.disputesCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
          />
        </div>
      </div>

      {/* ─── Plan Breakdown + Workspace Billing Truth ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Plan (This Month)</h3>
          </div>
          {planBreakdown.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No payment events recorded this month
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Plan
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                    Gross
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                    Payments
                  </th>
                </tr>
              </thead>
              <tbody>
                {planBreakdown.map((row, i) => (
                  <tr key={row.planKey} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {planLabel(row.planKey)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700">
                      {fmtCurrency(row.grossRevenue, c)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-500">{row.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Workspace Billing Truth */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Workspace Billing Truth</h3>
            <p className="text-xs text-gray-500 mt-1">
              {totalWorkspaces} workspaces total from{' '}
              <code className="bg-gray-100 px-1 rounded">workspaces</code>
            </p>
          </div>
          {workspaceCounts.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No workspaces found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tier
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                    Workspaces
                  </th>
                </tr>
              </thead>
              <tbody>
                {workspaceCounts.map((row, i) => {
                  const isLegacy = !['free', 'pro', 'team_starter', 'team_pro'].includes(row.planTier);
                  return (
                    <tr key={row.planTier} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">
                        {planLabel(row.planTier)}
                        {isLegacy && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">(needs cleanup)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-700">{row.count}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">Total</td>
                  <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900">
                    {totalWorkspaces}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── User Footprint Truth ──────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">User Footprint</h3>
          <p className="text-xs text-gray-500 mt-1">
            Platform-wide user and membership metrics
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100">
          <MetricCell label="Total Users" value={userFootprint.totalUsers} />
          <MetricCell label="Confirmed" value={userFootprint.confirmedUsers} />
          <MetricCell label="Staff" value={userFootprint.staffUsers} />
          <MetricCell label="In Paid Workspaces" value={userFootprint.usersInPaidWorkspaces} />
          <MetricCell label="In Free Workspaces" value={userFootprint.usersInFreeWorkspaces} />
          <MetricCell label="In Team Workspaces" value={userFootprint.totalMembersInTeamWorkspaces} />
        </div>
      </div>

      {/* ─── Paid Workspaces Table ─────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Paid Workspaces</h3>
          <p className="text-xs text-gray-500 mt-1">
            {paidWorkspaceDetails.length} paid workspace{paidWorkspaceDetails.length !== 1 ? 's' : ''} — billing, members, and latest payment
          </p>
        </div>
        {paidWorkspaceDetails.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No paid workspaces found. Revenue will appear here after the first subscription.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Workspace
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tier
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                    Members
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                    Last Payment
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                    Stripe IDs
                  </th>
                </tr>
              </thead>
              <tbody>
                {paidWorkspaceDetails.map((ws, i) => (
                  <tr key={ws.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]" title={ws.name}>
                        {ws.name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate max-w-[180px]" title={ws.id}>
                        {ws.id.substring(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        status={ws.planTier === 'pro' ? 'active' : ws.planTier.startsWith('team') ? 'completed' : 'pending'}
                        label={planLabel(ws.planTier)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        status={ws.subscriptionStatus || 'pending'}
                        label={ws.subscriptionStatus || 'unknown'}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]" title={ws.ownerName}>
                      {ws.ownerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {ws.memberCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ws.latestPaymentAmount !== null ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {fmtCurrency(ws.latestPaymentAmount, ws.latestPaymentCurrency)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {ws.latestPaymentDate ? fmtTime(ws.latestPaymentDate) : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No payments</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ws.stripeCustomerId ? (
                        <div className="text-xs font-mono text-gray-500 truncate max-w-[140px]" title={ws.stripeCustomerId}>
                          {ws.stripeCustomerId}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                      {ws.stripeSubscriptionId ? (
                        <div className="text-xs font-mono text-gray-400 truncate max-w-[140px]" title={ws.stripeSubscriptionId}>
                          {ws.stripeSubscriptionId}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Monthly Revenue Table ─────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue (Last 12 Months)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                  Month
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                  Gross
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                  Fees
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                  Net
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                  Refunds
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.map((row, i) => {
                const hasData = row.grossRevenue > 0 || row.refunds > 0;
                return (
                  <tr key={row.month} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{row.label}</td>
                    <td
                      className={`px-5 py-3 text-sm text-right ${hasData ? 'text-gray-700' : 'text-gray-300'}`}
                    >
                      {fmtCurrency(row.grossRevenue, c)}
                    </td>
                    <td
                      className={`px-5 py-3 text-sm text-right ${hasData ? 'text-gray-500' : 'text-gray-300'}`}
                    >
                      {fmtCurrency(row.fees, c)}
                    </td>
                    <td
                      className={`px-5 py-3 text-sm text-right ${hasData ? 'font-medium text-gray-800' : 'text-gray-300'}`}
                    >
                      {fmtCurrency(row.netRevenue, c)}
                    </td>
                    <td
                      className={`px-5 py-3 text-sm text-right ${row.refunds > 0 ? 'text-amber-600' : hasData ? 'text-gray-400' : 'text-gray-300'}`}
                    >
                      {fmtCurrency(row.refunds, c)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Operational Visibility ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Webhooks */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Webhooks</h3>
            <p className="text-xs text-gray-500 mt-1">
              Last 20 deliveries from{' '}
              <code className="bg-gray-100 px-1 rounded">stripe_webhook_log</code>
            </p>
          </div>
          {recentWebhooks.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No webhook deliveries recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Event
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentWebhooks.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {fmtTime(row.received_at)}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-700">
                        {row.event_type}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {row.processed ? (
                          <Badge status="success" label="OK" />
                        ) : (
                          <Badge
                            status="failed"
                            label={String(row.http_status || 'ERR')}
                          />
                        )}
                      </td>
                      <td
                        className="px-4 py-2 text-xs text-red-600 truncate max-w-[200px]"
                        title={row.error_message || ''}
                      >
                        {row.error_message || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Ops */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Ops</h3>
            <p className="text-xs text-gray-500 mt-1">
              Last 20 operations from{' '}
              <code className="bg-gray-100 px-1 rounded">stripe_ops_log</code>
            </p>
          </div>
          {recentOps.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No Stripe operations recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Kind
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Result
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOps.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {fmtTime(row.created_at)}
                      </td>
                      <td className="px-4 py-2 text-xs font-medium text-gray-700">{row.kind}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge
                          status={row.success ? 'success' : 'failed'}
                          label={row.success ? 'OK' : row.error_code || 'FAIL'}
                        />
                      </td>
                      <td
                        className="px-4 py-2 text-xs text-red-600 truncate max-w-[200px]"
                        title={row.error_message || ''}
                      >
                        {row.error_message || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Data Source Note ──────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500">
          Data sourced from{' '}
          <code className="bg-gray-100 px-1 rounded">financial_events</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">workspaces</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">workspace_members</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">auth.users</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">tissca_staff</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">stripe_webhook_log</code>, and{' '}
          <code className="bg-gray-100 px-1 rounded">stripe_ops_log</code>.
          Amounts in GBP (converted from minor units). Revenue populates after live Stripe traffic.
          User inspection available at <code className="bg-gray-100 px-1 rounded">/admin/users</code>.
        </p>
      </div>
    </div>
  );
}
