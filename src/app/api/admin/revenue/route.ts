// src/app/api/admin/revenue/route.ts v4.0
//
// PURPOSE:
//   Real revenue + commercial truth dashboard API.
//   Queries financial_events, workspaces, workspace_members,
//   stripe_webhook_log, stripe_ops_log, auth users, tissca_staff, user_profiles.
//
// AUTH:
//   Bearer token → supabase.auth.getUser → tissca_staff (any active staff role).
//
// TABLES USED:
//   - financial_events    (revenue KPIs, plan breakdown, monthly table, latest payment per workspace)
//   - workspaces          (workspace billing truth, paid workspace detail)
//   - workspace_members   (member counts per workspace)
//   - auth.users          (total / confirmed user counts via admin API)
//   - tissca_staff        (staff user count)
//   - user_profiles       (workspace association for users-in-paid/free metric)
//   - stripe_webhook_log  (recent deliveries)
//   - stripe_ops_log      (recent operations)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Auth gate (any active staff member)
// ---------------------------------------------------------------------------

function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function requireStaff(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false as const, res: NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }) };
  }

  const supabase = createServerSupabaseClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false as const, res: NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }) };
  }

  const { data: staff, error: staffErr } = await supabase
    .from('tissca_staff')
    .select('is_active, role')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (staffErr || !staff?.is_active) {
    return { ok: false as const, res: NextResponse.json({ error: 'NOT_STAFF' }, { status: 403 }) };
  }

  return { ok: true as const, supabase };
}

// ---------------------------------------------------------------------------
// Tier display ordering
// ---------------------------------------------------------------------------

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  team_starter: 2,
  team_pro: 3,
};

// ---------------------------------------------------------------------------
// GET /api/admin/revenue
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (!gate.ok) return gate.res;

  const supabase = gate.supabase;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

    // ─── Parallel batch 1: core data ────────────────────────
    const [eventsRes, workspacesRes, membersRes, webhooksRes, opsRes, staffRes] = await Promise.all([
      supabase
        .from('financial_events')
        .select('occurred_at,event_type,plan_key,currency,gross_amount,fee_amount,net_amount,status,workspace_id')
        .gte('occurred_at', yearStart)
        .order('occurred_at', { ascending: false }),

      supabase
        .from('workspaces')
        .select('id,name,owner_id,plan_tier,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end'),

      supabase
        .from('workspace_members')
        .select('workspace_id,user_id,role'),

      supabase
        .from('stripe_webhook_log')
        .select('id,received_at,stripe_event_id,event_type,signature_valid,http_status,processed,error_message')
        .order('received_at', { ascending: false })
        .limit(20),

      supabase
        .from('stripe_ops_log')
        .select('id,created_at,kind,route,success,error_code,error_message')
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('tissca_staff')
        .select('user_id')
        .eq('is_active', true),
    ]);

    // Log errors but continue with empty arrays
    for (const [label, res] of [
      ['financial_events', eventsRes],
      ['workspaces', workspacesRes],
      ['workspace_members', membersRes],
      ['stripe_webhook_log', webhooksRes],
      ['stripe_ops_log', opsRes],
      ['tissca_staff', staffRes],
    ] as const) {
      if ((res as any).error) {
        console.error(`[admin/revenue] ${label} query error:`, (res as any).error.message);
      }
    }

    const events = eventsRes.data || [];
    const allWorkspaces = workspacesRes.data || [];
    const allMembers = membersRes.data || [];
    const webhooks = webhooksRes.data || [];
    const ops = opsRes.data || [];
    const staffUsers = staffRes.data || [];

    // ─── User footprint (auth.admin.listUsers) ──────────────
    let totalUsers = 0;
    let confirmedUsers = 0;
    try {
      // Supabase admin listUsers paginates, fetch all pages
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listErr) {
          console.error('[admin/revenue] auth.admin.listUsers error:', listErr.message);
          break;
        }
        const users = listData?.users || [];
        totalUsers += users.length;
        confirmedUsers += users.filter(
          (u: any) => u.email_confirmed_at || u.confirmed_at,
        ).length;
        hasMore = users.length === 1000;
        page++;
      }
    } catch (err) {
      console.error('[admin/revenue] user footprint error:', err);
    }

    // ─── Build member-count map ─────────────────────────────
    const memberCountMap = new Map<string, number>();
    const memberUserIds = new Set<string>();
    for (const m of allMembers) {
      memberCountMap.set(m.workspace_id, (memberCountMap.get(m.workspace_id) || 0) + 1);
      memberUserIds.add(m.user_id);
    }

    // ─── Build workspace lookup ─────────────────────────────
    const wsMap = new Map<string, typeof allWorkspaces[0]>();
    for (const ws of allWorkspaces) {
      wsMap.set(ws.id, ws);
    }

    // Users in paid vs free workspaces (via workspace_members join)
    const usersInPaidWorkspaces = new Set<string>();
    const usersInFreeWorkspaces = new Set<string>();
    const teamWorkspaceMemberUserIds = new Set<string>();
    for (const m of allMembers) {
      const ws = wsMap.get(m.workspace_id);
      const tier = ws?.plan_tier || 'free';
      if (tier !== 'free') {
        usersInPaidWorkspaces.add(m.user_id);
      } else {
        usersInFreeWorkspaces.add(m.user_id);
      }
      if (tier === 'team_starter' || tier === 'team_pro' || tier === 'team') {
        teamWorkspaceMemberUserIds.add(m.user_id);
      }
    }

    const userFootprint = {
      totalUsers,
      confirmedUsers,
      staffUsers: staffUsers.length,
      usersInPaidWorkspaces: usersInPaidWorkspaces.size,
      usersInFreeWorkspaces: usersInFreeWorkspaces.size,
      totalMembersInTeamWorkspaces: teamWorkspaceMemberUserIds.size,
    };

    // ─── KPIs (this month) ──────────────────────────────────
    const thisMonthEvents = events.filter((e) => e.occurred_at >= monthStart);

    const payments = thisMonthEvents.filter(
      (e) => e.event_type === 'subscription_payment' && e.status === 'completed',
    );
    const refunds = thisMonthEvents.filter((e) => e.event_type === 'refund');
    const failures = thisMonthEvents.filter((e) => e.event_type === 'payment_failed');
    const disputes = thisMonthEvents.filter((e) => e.event_type === 'dispute');

    const kpis = {
      grossRevenue: payments.reduce((sum, e) => sum + (e.gross_amount || 0), 0),
      stripeFees: payments.reduce((sum, e) => sum + (e.fee_amount || 0), 0),
      netRevenue: payments.reduce((sum, e) => sum + (e.net_amount || 0), 0),
      refundsAmount: refunds.reduce((sum, e) => sum + Math.abs(e.gross_amount || 0), 0),
      refundsCount: refunds.length,
      failedCount: failures.length,
      disputesAmount: disputes.reduce((sum, e) => sum + Math.abs(e.gross_amount || 0), 0),
      disputesCount: disputes.length,
      currency: 'gbp',
    };

    // ─── Plan breakdown (this month, payments only) ─────────
    const planMap = new Map<string, { gross: number; count: number }>();
    for (const e of payments) {
      const key = e.plan_key || 'unknown';
      const existing = planMap.get(key) || { gross: 0, count: 0 };
      existing.gross += e.gross_amount || 0;
      existing.count += 1;
      planMap.set(key, existing);
    }
    const planBreakdown = Array.from(planMap.entries())
      .map(([planKey, data]) => ({
        planKey,
        grossRevenue: data.gross,
        eventCount: data.count,
      }))
      .sort((a, b) => b.grossRevenue - a.grossRevenue);

    // ─── Workspace counts by plan_tier ──────────────────────
    const tierMap = new Map<string, number>();
    for (const w of allWorkspaces) {
      const tier = w.plan_tier || 'free';
      tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
    }
    const workspaceCounts = Array.from(tierMap.entries())
      .map(([planTier, count]) => ({ planTier, count }))
      .sort((a, b) => (TIER_ORDER[a.planTier] ?? 99) - (TIER_ORDER[b.planTier] ?? 99));

    // ─── Monthly revenue (last 12 months) ───────────────────
    const monthlyMap = new Map<string, { gross: number; fees: number; net: number; refunds: number }>();
    for (const e of events) {
      const month = e.occurred_at?.substring(0, 7); // "YYYY-MM"
      if (!month) continue;
      const existing = monthlyMap.get(month) || { gross: 0, fees: 0, net: 0, refunds: 0 };

      if (e.event_type === 'subscription_payment' && e.status === 'completed') {
        existing.gross += e.gross_amount || 0;
        existing.fees += e.fee_amount || 0;
        existing.net += e.net_amount || 0;
      } else if (e.event_type === 'refund') {
        existing.refunds += Math.abs(e.gross_amount || 0);
      }

      monthlyMap.set(month, existing);
    }

    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyMap.get(key) || { gross: 0, fees: 0, net: 0, refunds: 0 };
      monthlyRevenue.push({
        month: key,
        label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        grossRevenue: data.gross,
        fees: data.fees,
        netRevenue: data.net,
        refunds: data.refunds,
      });
    }

    // ─── Paid workspaces detail table ───────────────────────
    const paidWorkspaces = allWorkspaces.filter((ws) => ws.plan_tier && ws.plan_tier !== 'free');

    // Resolve owner emails for paid workspaces
    const ownerIds = [...new Set(paidWorkspaces.map((ws) => ws.owner_id).filter(Boolean))] as string[];
    const ownerMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id,email,full_name')
        .in('id', ownerIds);
      for (const p of profiles || []) {
        ownerMap.set(p.id, p.full_name || p.email || p.id);
      }
    }

    // Latest payment per workspace from financial_events
    const latestPaymentMap = new Map<string, { amount: number; date: string; currency: string }>();
    for (const e of events) {
      if (
        e.event_type === 'subscription_payment' &&
        e.status === 'completed' &&
        e.workspace_id
      ) {
        if (!latestPaymentMap.has(e.workspace_id)) {
          latestPaymentMap.set(e.workspace_id, {
            amount: e.gross_amount || 0,
            date: e.occurred_at,
            currency: e.currency || 'gbp',
          });
        }
        // events are ordered desc, so first match is latest
      }
    }

    const paidWorkspaceDetails = paidWorkspaces.map((ws) => {
      const payment = latestPaymentMap.get(ws.id);
      return {
        id: ws.id,
        name: ws.name || '(unnamed)',
        planTier: ws.plan_tier,
        subscriptionStatus: ws.subscription_status || null,
        ownerName: ownerMap.get(ws.owner_id) || ws.owner_id || '(unknown)',
        memberCount: memberCountMap.get(ws.id) || 0,
        stripeCustomerId: ws.stripe_customer_id || null,
        stripeSubscriptionId: ws.stripe_subscription_id || null,
        latestPaymentAmount: payment?.amount ?? null,
        latestPaymentDate: payment?.date ?? null,
        latestPaymentCurrency: payment?.currency ?? 'gbp',
      };
    });

    return NextResponse.json({
      kpis,
      planBreakdown,
      workspaceCounts,
      monthlyRevenue,
      userFootprint,
      paidWorkspaceDetails,
      recentWebhooks: webhooks,
      recentOps: ops,
    });
  } catch (error: any) {
    console.error('[admin/revenue] Fatal error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}
