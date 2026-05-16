// src/app/api/workspace/accountant/route.ts v3.0
//
// PURPOSE:
// - GET /api/workspace/accountant — Accountant Hub data + access check
// - POST /api/workspace/accountant — Export / action audit logging
// - Scoped by workspace/business via resolveUserFromToken.
// - Plan tier + workspace role gated:
//   - Free: blocked
//   - Pro / Pro Plus / Team Starter: owner only
//   - Team Pro: owner or accountant only
// - Stores server-computed snapshot into live accountant_hub_snapshots table.
// - Reconciles live data against previous snapshot (£0.01 tolerance).
// - Logs all access, snapshot, reconciliation, and export events to accountant_hub_audit_log.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  resolveAccountantHubAccess,
  logAccountantHubAction,
  estimateUkIncomeTax,
  round2,
  storeFinancialSnapshot,
  getLatestSnapshot,
  reconcileLiveVsSnapshot,
  updateSnapshotReconciliation,
} from '@/lib/accountant-hub';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Access control: plan tier + workspace role ──
    const access = await resolveAccountantHubAccess(resolved);

    if (!access.granted) {
      // Audit log: access denied
      if (access.workspace_id) {
        logAccountantHubAction({
          workspace_id: access.workspace_id,
          user_id: resolved.authId,
          action: 'access_denied',
          plan_tier: access.plan_tier,
          member_role: access.member_role,
          detail: {
            reason: access.denial_code,
            message: access.denial_reason,
          },
        });
      }

      return NextResponse.json(
        {
          error: access.denial_reason ?? 'Access denied.',
          denial_code: access.denial_code,
          plan_tier: access.plan_tier,
          member_role: access.member_role,
        },
        { status: 403 },
      );
    }

    // ── Scope ──
    const supabase = createServerSupabaseClient();
    const scopeKey = resolved.businessId ? 'business_id' : 'user_id';
    const scopeVal = resolved.businessId ?? resolved.authId;
    const scope: Record<string, string> = { [scopeKey]: scopeVal };
    const docScopeId = resolved.workspaceId ?? resolved.businessId ?? resolved.authId;

    // ── Tax year parameter (UK: 6 Apr → 5 Apr) ──
    const ALLOWED_TAX_YEARS = ['2024/25', '2025/26', '2026/27'];
    const url = new URL(req.url);
    const taxYearParam = url.searchParams.get('taxYear');
    const selectedTaxYear = ALLOWED_TAX_YEARS.includes(taxYearParam ?? '')
      ? taxYearParam!
      : (() => {
          const n = new Date();
          const sy = (n.getMonth() < 3 || (n.getMonth() === 3 && n.getDate() < 6))
            ? n.getFullYear() - 1 : n.getFullYear();
          const key = `${sy}/${String(sy + 1).slice(-2)}`;
          return ALLOWED_TAX_YEARS.includes(key) ? key : ALLOWED_TAX_YEARS[ALLOWED_TAX_YEARS.length - 1];
        })();

    // UK tax year date window
    const tyStartYear = parseInt(selectedTaxYear.split('/')[0], 10);
    // For date columns (documents.date): inclusive start + inclusive end
    const tyStart = `${tyStartYear}-04-06`;
    const tyEndInclusive = `${tyStartYear + 1}-04-05`;
    // For timestamptz columns (invoices/quotes created_at): inclusive start + exclusive end
    const tyEndExclusive = `${tyStartYear + 1}-04-06`;

    // ── Month ranges (current & previous month, clamped to tax year) ──
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const rawMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const rawMonthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    // Clamp to tax year window (if month falls outside, start > end → 0 results)
    const monthStart = rawMonthStart < tyStart ? tyStart : rawMonthStart;
    const monthEnd = rawMonthEnd > tyEndInclusive ? tyEndInclusive : rawMonthEnd;

    // Previous month range (clamped to tax year)
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const rawPrevMonthStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    const rawPrevMonthEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;
    const prevMonthStart = rawPrevMonthStart < tyStart ? tyStart : rawPrevMonthStart;
    const prevMonthEnd = rawPrevMonthEnd > tyEndInclusive ? tyEndInclusive : rawPrevMonthEnd;

    // ── Parallel queries — all scoped to selected UK tax year ──
    // invoices/quotes: filter created_at ∈ [tyStart, tyEndExclusive)
    // documents: filter date ∈ [tyStart, tyEndInclusive]
    const [
      invoicesTotalRes,
      invoicesPaidRes,
      invoicesOutstandingRes,
      invoicesOverdueRes,
      invoicesPaidValueRes,
      invoicesOutstandingValueRes,
      yearRevenueRes,
      monthRevenueRes,
      prevMonthRevenueRes,
      quotesTotalRes,
      quotesAcceptedRes,
      recentInvoicesRes,
      recentQuotesRes,
      docsInvoiceCountRes,
      docsQuoteCountRes,
      docPdfInfoRes,
      toolAttachmentsRes,
    ] = await Promise.all([
      // Invoice counts (created_at within tax year)
      supabase.from('invoices').select('id', { count: 'exact', head: true }).match(scope).gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).match(scope).eq('status', 'paid').gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).match(scope).in('status', ['sent', 'partially_paid']).gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).match(scope).eq('status', 'overdue').gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      // Invoice values (within tax year)
      supabase.from('invoices').select('total').match(scope).eq('status', 'paid').gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      supabase.from('invoices').select('balance_due').match(scope).in('status', ['sent', 'overdue', 'partially_paid']).gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      // Revenue from documents (date within tax year)
      supabase.from('documents').select('grand_total').eq('workspace_id', docScopeId).eq('type', 'invoice').gte('date', tyStart).lte('date', tyEndInclusive),
      // Month revenue (clamped to tax year — if month falls outside year, range is invalid → 0 results)
      supabase.from('documents').select('grand_total').eq('workspace_id', docScopeId).eq('type', 'invoice').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('documents').select('grand_total').eq('workspace_id', docScopeId).eq('type', 'invoice').gte('date', prevMonthStart).lte('date', prevMonthEnd),
      // Quote counts (created_at within tax year)
      supabase.from('quotes').select('id', { count: 'exact', head: true }).match(scope).gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      supabase.from('quotes').select('id', { count: 'exact', head: true }).match(scope).eq('status', 'accepted').gte('created_at', tyStart).lt('created_at', tyEndExclusive),
      // Recent invoices — most recent 10 within tax year
      supabase.from('invoices').select('id, invoice_number, status, total, balance_due, due_date, created_at, clients(name)').match(scope).gte('created_at', tyStart).lt('created_at', tyEndExclusive).order('created_at', { ascending: false }).limit(10),
      // Recent quotes — most recent 10 within tax year
      supabase.from('quotes').select('id, quote_number, status, total, created_at, clients(name)').match(scope).gte('created_at', tyStart).lt('created_at', tyEndExclusive).order('created_at', { ascending: false }).limit(10),
      // Document counts (within tax year)
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('workspace_id', docScopeId).eq('type', 'invoice').gte('date', tyStart).lte('date', tyEndInclusive),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('workspace_id', docScopeId).eq('type', 'quote').gte('date', tyStart).lte('date', tyEndInclusive),
      // Business structure from document_pdf_info (not date-filtered)
      supabase.from('document_pdf_info').select('business_structure').eq('workspace_id', access.workspace_id).maybeSingle(),
      // Tool attachments with structured result_data (created_at within tax year)
      supabase.from('tool_attachments').select('result_data').match(scope).gte('created_at', tyStart).lt('created_at', tyEndExclusive),
    ]);

    // ── Aggregations ──
    const sumField = (rows: any[] | null, field: string): number =>
      (rows ?? []).reduce((acc: number, r: any) => acc + (Number(r[field]) || 0), 0);

    const yearRevenue = sumField(yearRevenueRes.data, 'grand_total');
    const monthRevenue = sumField(monthRevenueRes.data, 'grand_total');
    const prevMonthRevenue = sumField(prevMonthRevenueRes.data, 'grand_total');
    const totalPaid = sumField(invoicesPaidValueRes.data, 'total');
    const totalOutstanding = sumField(invoicesOutstandingValueRes.data, 'balance_due');

    const invoicesTotal = invoicesTotalRes.count ?? 0;
    const invoicesPaid = invoicesPaidRes.count ?? 0;
    const invoicesOutstanding = invoicesOutstandingRes.count ?? 0;
    const invoicesOverdue = invoicesOverdueRes.count ?? 0;
    const quotesTotal = quotesTotalRes.count ?? 0;
    const quotesAccepted = quotesAcceptedRes.count ?? 0;
    const docsInvoiceCount = docsInvoiceCountRes.count ?? 0;
    const docsQuoteCount = docsQuoteCountRes.count ?? 0;
    const businessStructure: string = docPdfInfoRes.data?.business_structure ?? 'sole_trader';

    // ── Cost bucket aggregation from tool attachments ──
    // Parse line items from structured tool payloads and aggregate by cost_bucket.
    //
    // ACCOUNTING MODEL (construction trade):
    //   turnover         = sum of ALL tool line item totals
    //   labour           = profit margin (NOT deducted as a cost)
    //   cost_of_sales    = materials + subcontractor + plant_hire + other_direct_cost
    //   operating_expenses = overhead
    //   gross_profit     = turnover - cost_of_sales
    //   net_profit       = gross_profit - operating_expenses
    //   unknown items    = not deducted (conservative: treated as margin)
    //
    const COST_OF_SALES_BUCKETS = ['materials', 'subcontractor', 'plant_hire', 'other_direct_cost'];
    const OVERHEAD_BUCKETS = ['overhead'];
    const bucketTotals: Record<string, number> = {
      labour: 0, materials: 0, subcontractor: 0, plant_hire: 0,
      other_direct_cost: 0, overhead: 0, unknown: 0,
    };
    let toolAttachmentCount = 0;
    for (const row of (toolAttachmentsRes.data ?? []) as any[]) {
      const rd = row?.result_data;
      if (!rd || typeof rd !== 'object') continue;
      // Support both payload-wrapped and flat formats
      const payload = rd.payload ?? rd;
      const items = Array.isArray(payload?.line_items) ? payload.line_items : [];
      if (items.length === 0) continue;
      toolAttachmentCount++;
      for (const li of items) {
        const qty = typeof li.quantity === 'number' && li.quantity > 0 ? li.quantity : 1;
        const unitPrice = typeof li.unit_price === 'number' ? li.unit_price : (typeof li.amount === 'number' ? li.amount : 0);
        const lineTotal = round2(qty * unitPrice);
        const bucket = typeof li.cost_bucket === 'string' && li.cost_bucket in bucketTotals
          ? li.cost_bucket : 'unknown';
        bucketTotals[bucket] = round2(bucketTotals[bucket] + lineTotal);
      }
    }
    // turnover = sum of ALL line items (labour + materials + everything)
    const toolTurnover = round2(Object.values(bucketTotals).reduce((s, v) => s + v, 0));
    // cost_of_sales = materials + subcontractor + plant_hire + other_direct_cost (NOT labour)
    const costOfSales = round2(COST_OF_SALES_BUCKETS.reduce((s, b) => s + (bucketTotals[b] ?? 0), 0));
    // operating_expenses = overhead only
    const operatingExpenses = round2(OVERHEAD_BUCKETS.reduce((s, b) => s + (bucketTotals[b] ?? 0), 0));
    // gross_profit = turnover - cost_of_sales (labour stays as profit)
    const grossProfit = round2(toolTurnover - costOfSales);
    // net_profit = gross_profit - operating_expenses
    const netProfit = round2(grossProfit - operatingExpenses);

    // ── Estimated tax (simplified UK-style bands, disclaimer required on client) ──
    const estimatedAnnualTax = estimateUkIncomeTax(yearRevenue);
    const effectiveRate = yearRevenue > 0 ? round2((estimatedAnnualTax / yearRevenue) * 100) : 0;

    // ── Live financial data ──
    const liveData = {
      yearRevenue: round2(yearRevenue),
      monthRevenue: round2(monthRevenue),
      prevMonthRevenue: round2(prevMonthRevenue),
      totalPaid: round2(totalPaid),
      totalOutstanding: round2(totalOutstanding),
      invoicesTotal,
      invoicesPaid,
      invoicesOutstanding,
      invoicesOverdue,
      quotesTotal,
      quotesAccepted,
    };

    // ── Triple-redundancy: snapshot + reconciliation ──

    // 1. Retrieve previous snapshot BEFORE storing new one
    const prevSnapshot = await getLatestSnapshot(access.workspace_id);

    // 2. Store new server snapshot
    const stored = await storeFinancialSnapshot(access.workspace_id, {
      currency: 'GBP',
      period_start: tyStart,
      period_end: tyEndInclusive,
      tax_year: selectedTaxYear,
      total_income: liveData.yearRevenue,
      total_expenses: round2(costOfSales + operatingExpenses),
      profit: netProfit,
      total_vat: 0,  // No VAT tracking yet
      invoice_count: invoicesTotal,
      invoices_paid_count: invoicesPaid,
      invoices_outstanding_count: invoicesOutstanding,
      invoices_overdue_count: invoicesOverdue,
      total_paid: liveData.totalPaid,
      total_outstanding: liveData.totalOutstanding,
      quote_count: quotesTotal,
      accepted_quote_count: quotesAccepted,
      document_count: docsInvoiceCount,
      tool_attachment_count: docsQuoteCount,
      estimated_taxable_income: round2(yearRevenue),
      estimated_tax: round2(estimatedAnnualTax),
      vat_liability: 0,  // No VAT tracking yet
      effective_tax_rate: effectiveRate,
    });

    // 3. Log snapshot creation
    if (stored) {
      logAccountantHubAction({
        workspace_id: access.workspace_id,
        user_id: resolved.authId,
        action: 'snapshot_created',
        plan_tier: access.plan_tier,
        member_role: access.member_role,
        snapshot_id: stored.id,
        detail: { version: stored.version },
      });
    }

    // 4. Reconcile live data against previous snapshot
    let snapshotInfo: {
      version: number;
      computed_at: string;
      reconciliation_status: string;
      mismatch_flags: Record<string, unknown>;
    } | null = null;

    if (prevSnapshot) {
      const reconciliation = reconcileLiveVsSnapshot({
        totalIncome: liveData.yearRevenue,
        totalPaid: liveData.totalPaid,
        totalOutstanding: liveData.totalOutstanding,
        invoiceCount: invoicesTotal,
        invoicesPaidCount: invoicesPaid,
        invoicesOutstandingCount: invoicesOutstanding,
        invoicesOverdueCount: invoicesOverdue,
        quoteCount: quotesTotal,
        acceptedQuoteCount: quotesAccepted,
        estimatedTax: round2(estimatedAnnualTax),
      }, prevSnapshot);

      // Update the newly stored snapshot with reconciliation result
      if (stored) {
        await updateSnapshotReconciliation(
          stored.id,
          reconciliation.status,
          reconciliation.flags,
          reconciliation.status === 'mismatch' ? reconciliation.flags : null,
        );
      }

      snapshotInfo = {
        version: stored?.version ?? (prevSnapshot.snapshot_version + 1),
        computed_at: new Date().toISOString(),
        reconciliation_status: reconciliation.status,
        mismatch_flags: reconciliation.flags,
      };

      // Log reconciliation result
      logAccountantHubAction({
        workspace_id: access.workspace_id,
        user_id: resolved.authId,
        action: reconciliation.status === 'mismatch' ? 'reconciliation_fail' : 'reconciliation_pass',
        plan_tier: access.plan_tier,
        member_role: access.member_role,
        snapshot_id: stored?.id ?? prevSnapshot.id,
        detail: reconciliation.status === 'mismatch'
          ? { mismatches: reconciliation.flags }
          : { status: 'verified', compared_to_version: prevSnapshot.snapshot_version },
      });
    } else if (stored) {
      // First snapshot for this workspace — no reconciliation possible
      snapshotInfo = {
        version: stored.version,
        computed_at: new Date().toISOString(),
        reconciliation_status: 'unverified',
        mismatch_flags: {},
      };
    }

    // Audit log: access granted
    logAccountantHubAction({
      workspace_id: access.workspace_id,
      user_id: resolved.authId,
      action: 'access_granted',
      plan_tier: access.plan_tier,
      member_role: access.member_role,
      snapshot_id: stored?.id ?? undefined,
    });

    return NextResponse.json({
      access: {
        workspace_id: access.workspace_id,
        plan_tier: access.plan_tier,
        member_role: access.member_role,
        accountant_hub_access: true,
      },
      business: {
        structure: businessStructure,
      },
      financial: liveData,
      tax: {
        estimatedAnnualIncome: round2(yearRevenue),
        estimatedTax: round2(estimatedAnnualTax),
        effectiveRate,
        taxYear: selectedTaxYear,
      },
      profitAndLoss: {
        turnover: toolTurnover,
        labour: bucketTotals.labour,
        cost_of_sales: costOfSales,
        cost_of_sales_breakdown: {
          materials: bucketTotals.materials,
          subcontractor: bucketTotals.subcontractor,
          plant_hire: bucketTotals.plant_hire,
          other_direct_cost: bucketTotals.other_direct_cost,
          unknown: bucketTotals.unknown,
        },
        gross_profit: grossProfit,
        operating_expenses: operatingExpenses,
        operating_expenses_breakdown: {
          overhead: bucketTotals.overhead,
        },
        net_profit: netProfit,
        tool_attachment_count: toolAttachmentCount,
      },
      documents: {
        invoicesGenerated: docsInvoiceCount,
        quotesGenerated: docsQuoteCount,
      },
      recentInvoices: recentInvoicesRes.data ?? [],
      recentQuotes: recentQuotesRes.data ?? [],
      snapshot: snapshotInfo,
    });
  } catch (err) {
    console.error('[GET /api/workspace/accountant] Failed:', err);
    return NextResponse.json({ error: 'Failed to load accountant data' }, { status: 500 });
  }
}

// ─── POST: Export / action logging ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await resolveAccountantHubAccess(resolved);
    if (!access.granted) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action;

    if (action === 'data_exported') {
      await logAccountantHubAction({
        workspace_id: access.workspace_id,
        user_id: resolved.authId,
        action: 'data_exported',
        plan_tier: access.plan_tier,
        member_role: access.member_role,
        detail: {
          format: body.format ?? 'csv',
          snapshot_version: body.snapshot_version ?? null,
          source: body.source ?? 'accountant_hub',
          invoice_count: typeof body.invoice_count === 'number' ? body.invoice_count : 0,
          quote_count: typeof body.quote_count === 'number' ? body.quote_count : 0,
        },
      });
      return NextResponse.json({ logged: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/workspace/accountant] Failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
