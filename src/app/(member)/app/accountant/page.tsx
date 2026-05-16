// src/app/(member)/app/accountant/page.tsx v2.0
//
// PURPOSE:
// - Accountant Hub page at /app/accountant.
// - Sections: Financial Overview, Documents, Estimated Tax, Export, Reconciliation.
// - Plan-tier + workspace-role gated:
//   - Free: blocked
//   - Pro / Pro Plus / Team Starter: owner only
//   - Team Pro: owner or accountant only
// - Shows reconciliation warning banner when snapshot mismatch detected.
// - Pulls data from /api/workspace/accountant v2.0.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type SnapshotInfo = {
  version: number;
  computed_at: string;
  reconciliation_status: string;
  mismatch_flags: Record<string, { snapshot: number; live: number; delta: number }>;
};

type AccountantData = {
  access: {
    workspace_id: string;
    plan_tier: string;
    member_role: string;
    accountant_hub_access: boolean;
  };
  business: {
    structure: 'sole_trader' | 'limited_company';
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
  profitAndLoss: {
    turnover: number;
    labour: number;
    cost_of_sales: number;
    cost_of_sales_breakdown: {
      materials: number;
      subcontractor: number;
      plant_hire: number;
      other_direct_cost: number;
      unknown: number;
    };
    gross_profit: number;
    operating_expenses: number;
    operating_expenses_breakdown: {
      overhead: number;
    };
    net_profit: number;
    tool_attachment_count: number;
  };
  documents: {
    invoicesGenerated: number;
    quotesGenerated: number;
  };
  recentInvoices: RecentInvoice[];
  recentQuotes: RecentQuote[];
  snapshot: SnapshotInfo | null;
};

type RecentInvoice = {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  balance_due: number;
  due_date: string | null;
  created_at: string;
  clients: { name: string } | null;
};

type RecentQuote = {
  id: string;
  quote_number: string | null;
  status: string;
  total: number;
  created_at: string;
  clients: { name: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  v === 0
    ? '\u00A30.00'
    : `\u00A3${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null) => {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusColor: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-600',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ─── UK Tax Year + Region Configuration ─────────────────────────────────────

const TAX_YEARS = ['2024/25', '2025/26', '2026/27'] as const;
type TaxYearKey = (typeof TAX_YEARS)[number];

const TAX_REGIONS = ['england_wales_ni', 'scotland'] as const;
type TaxRegion = (typeof TAX_REGIONS)[number];
const REGION_LABELS: Record<TaxRegion, string> = {
  england_wales_ni: 'England / Wales / Northern Ireland',
  scotland: 'Scotland',
};

type VatStatus = 'not_registered' | 'registered';
const VAT_REG_THRESHOLD = 90000;
const VAT_DEREG_THRESHOLD = 88000;

// ── England / Wales / NI income-tax bands (shared across all 3 years) ──
type IncomeTaxBands = {
  personalAllowance: number;
  taperStart: number;      // PA taper starts above this
  taperZero: number;       // PA reaches zero here
  bands: { name: string; rate: number; upTo: number }[]; // upTo = Infinity for topmost
};

const EWN_BANDS: Record<TaxYearKey, IncomeTaxBands> = {
  '2024/25': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Basic (20%)',      rate: 0.20, upTo: 50270 },
      { name: 'Higher (40%)',     rate: 0.40, upTo: 125140 },
      { name: 'Additional (45%)', rate: 0.45, upTo: Infinity },
    ],
  },
  '2025/26': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Basic (20%)',      rate: 0.20, upTo: 50270 },
      { name: 'Higher (40%)',     rate: 0.40, upTo: 125140 },
      { name: 'Additional (45%)', rate: 0.45, upTo: Infinity },
    ],
  },
  '2026/27': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Basic (20%)',      rate: 0.20, upTo: 50270 },
      { name: 'Higher (40%)',     rate: 0.40, upTo: 125140 },
      { name: 'Additional (45%)', rate: 0.45, upTo: Infinity },
    ],
  },
};

// ── Scottish income-tax bands ──
const SCOT_BANDS: Record<TaxYearKey, IncomeTaxBands> = {
  '2024/25': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Starter (19%)',       rate: 0.19, upTo: 14876 },
      { name: 'Basic (20%)',         rate: 0.20, upTo: 26561 },
      { name: 'Intermediate (21%)',  rate: 0.21, upTo: 43662 },
      { name: 'Higher (42%)',        rate: 0.42, upTo: 75000 },
      { name: 'Advanced (45%)',      rate: 0.45, upTo: 125140 },
      { name: 'Top (48%)',           rate: 0.48, upTo: Infinity },
    ],
  },
  '2025/26': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Starter (19%)',       rate: 0.19, upTo: 14876 },
      { name: 'Basic (20%)',         rate: 0.20, upTo: 26561 },
      { name: 'Intermediate (21%)',  rate: 0.21, upTo: 43662 },
      { name: 'Higher (42%)',        rate: 0.42, upTo: 75000 },
      { name: 'Advanced (45%)',      rate: 0.45, upTo: 125140 },
      { name: 'Top (48%)',           rate: 0.48, upTo: Infinity },
    ],
  },
  '2026/27': {
    personalAllowance: 12570, taperStart: 100000, taperZero: 125140,
    bands: [
      { name: 'Starter (19%)',       rate: 0.19, upTo: 14876 },
      { name: 'Basic (20%)',         rate: 0.20, upTo: 26561 },
      { name: 'Intermediate (21%)',  rate: 0.21, upTo: 43662 },
      { name: 'Higher (42%)',        rate: 0.42, upTo: 75000 },
      { name: 'Advanced (45%)',      rate: 0.45, upTo: 125140 },
      { name: 'Top (48%)',           rate: 0.48, upTo: Infinity },
    ],
  },
};

// ── NI bands (same for E/W/NI and Scotland) ──
type NiBands = { lower: number; upper: number; mainRate: number; higherRate: number };
const NI_BANDS: Record<TaxYearKey, NiBands> = {
  '2024/25': { lower: 12570, upper: 50270, mainRate: 0.06, higherRate: 0.02 },
  '2025/26': { lower: 12570, upper: 50270, mainRate: 0.06, higherRate: 0.02 },
  '2026/27': { lower: 12570, upper: 50270, mainRate: 0.06, higherRate: 0.02 },
};

// ── Corporation Tax ──
type CorpBands = { smallRate: number; mainRate: number; smallLimit: number; mainLimit: number };
const CORP_BANDS: Record<TaxYearKey, CorpBands> = {
  '2024/25': { smallRate: 0.19, mainRate: 0.25, smallLimit: 50000, mainLimit: 250000 },
  '2025/26': { smallRate: 0.19, mainRate: 0.25, smallLimit: 50000, mainLimit: 250000 },
  '2026/27': { smallRate: 0.19, mainRate: 0.25, smallLimit: 50000, mainLimit: 250000 },
};

// ── Sole trader breakdown ──
type BandResult = { name: string; rate: number; amount: number; tax: number };

function computePersonalAllowance(income: number, base: number, taperStart: number): number {
  if (income <= taperStart) return base;
  const reduction = Math.floor((income - taperStart) / 2);
  return Math.max(0, base - reduction);
}

function computeSoleTraderBreakdown(
  income: number, expenses: number, year: TaxYearKey, region: TaxRegion,
) {
  const itBands = region === 'scotland' ? SCOT_BANDS[year] : EWN_BANDS[year];
  const ni = NI_BANDS[year];
  const profit = Math.max(0, income - expenses);
  const pa = computePersonalAllowance(profit, itBands.personalAllowance, itBands.taperStart);
  const taxable = Math.max(0, profit - pa);

  // Walk through bands
  let remaining = taxable;
  // For Scottish bands the lower thresholds differ from EWN
  // bands[].upTo is the absolute income threshold; band width = upTo - previousUpTo
  // But PA is already subtracted, so we re-anchor to after-allowance amounts
  const bandResults: BandResult[] = [];
  let prevThreshold = 0;
  for (const band of itBands.bands) {
    if (remaining <= 0) {
      bandResults.push({ name: band.name, rate: band.rate, amount: 0, tax: 0 });
      continue;
    }
    const bandWidth = band.upTo === Infinity
      ? remaining
      : Math.max(0, band.upTo - itBands.personalAllowance - prevThreshold);
    prevThreshold = band.upTo === Infinity ? prevThreshold : band.upTo - itBands.personalAllowance;
    const inBand = Math.min(remaining, bandWidth);
    bandResults.push({ name: band.name, rate: band.rate, amount: inBand, tax: inBand * band.rate });
    remaining -= inBand;
  }

  const incomeTax = bandResults.reduce((s, b) => s + b.tax, 0);
  const niDue = Math.min(Math.max(0, profit - ni.lower), ni.upper - ni.lower) * ni.mainRate
    + Math.max(0, profit - ni.upper) * ni.higherRate;
  return {
    income, expenses, profit, personalAllowance: pa,
    bands: bandResults, incomeTax, ni: niDue, totalDue: incomeTax + niDue,
  };
}

// ── Limited company breakdown ──
function computeLtdBreakdown(
  income: number, expenses: number, year: TaxYearKey, vatStatus: VatStatus,
) {
  const c = CORP_BANDS[year];
  const profit = Math.max(0, income - expenses);
  let corpTax: number;
  if (profit <= c.smallLimit) {
    corpTax = profit * c.smallRate;
  } else if (profit >= c.mainLimit) {
    corpTax = profit * c.mainRate;
  } else {
    // Marginal relief
    corpTax = profit * c.mainRate - (c.mainLimit - profit) * 3 / 200;
  }
  const corpRate = profit > 0 ? (corpTax / profit) * 100 : 0;
  // VAT: only show a liability figure when registered
  const vatLiability = vatStatus === 'registered' ? 0 : 0; // Actual VAT calculation needs transaction data
  return { income, expenses, profit, corpTax, corpRate, afterTax: profit - corpTax, vatLiability, vatStatus };
}

const DISCLAIMER_TEXT = 'These are estimates based on the selected tax year and current inputs. ' +
  'They do not constitute financial advice. Always confirm with a qualified accountant or HMRC before filing.';

// Determine which supported tax year we are currently in (UK: 6 Apr – 5 Apr)
function getCurrentTaxYear(): TaxYearKey {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed, 3 = April
  const d = now.getDate();
  // Before 6 April → still in previous tax year
  const startYear = (m < 3 || (m === 3 && d < 6)) ? y - 1 : y;
  const key = `${startYear}/${String(startYear + 1).slice(-2)}` as TaxYearKey;
  return TAX_YEARS.includes(key) ? key : TAX_YEARS[TAX_YEARS.length - 1];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AccountantHubPage() {
  const [data, setData] = useState<AccountantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState<TaxYearKey>(getCurrentTaxYear);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('england_wales_ni');
  const [vatStatus, setVatStatus] = useState<VatStatus>('not_registered');
  const initialLoadDone = useRef(false);

  const loadData = useCallback(async (taxYear: TaxYearKey) => {
    if (initialLoadDone.current) {
      setRefreshing(true);
    }
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Please sign in to access the Accountant Hub.');
        return;
      }

      const res = await fetch(`/api/workspace/accountant?taxYear=${encodeURIComponent(taxYear)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        const denialCode = body.denial_code ?? 'unknown';
        if (denialCode === 'tier_free') {
          setError('Upgrade to Pro or above to access the Accountant Hub.');
        } else if (denialCode === 'role_not_allowed') {
          setError(body.error ?? 'Your workspace role does not have access to the Accountant Hub.');
        } else if (denialCode === 'not_member') {
          setError('You are not a member of this workspace.');
        } else {
          setError(body.error ?? 'Access denied.');
        }
        return;
      }

      if (!res.ok) {
        setError('Failed to load accountant data.');
        return;
      }

      setData(await res.json());
      initialLoadDone.current = true;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedTaxYear);
  }, [loadData, selectedTaxYear]);

  // ── Export CSV handler ──
  const handleExportCSV = useCallback(async () => {
    if (!data) return;
    setExporting(true);

    try {
      const csvIsLtd = data.business?.structure === 'limited_company';
      const csvSt = computeSoleTraderBreakdown(data.financial.yearRevenue, 0, selectedTaxYear, taxRegion);
      const csvLtd = computeLtdBreakdown(data.financial.yearRevenue, 0, selectedTaxYear, vatStatus);
      const computedAt = new Date().toISOString();
      const dateStr = computedAt.slice(0, 10);

      const metaRows: string[][] = [
        ['Accountant Hub Export'],
        ['Source', 'TISSCA Accountant Hub'],
        ['Business Structure', csvIsLtd ? 'Limited Company' : 'Sole Trader'],
        ['Tax Region', REGION_LABELS[taxRegion]],
        ['VAT Status', vatStatus === 'registered' ? 'VAT Registered' : 'Not VAT Registered'],
        ['Tax Year', selectedTaxYear],
        ['Computed At', computedAt],
        ['Snapshot Version', String(data.snapshot?.version ?? 'N/A')],
        ['Reconciliation Status', data.snapshot?.reconciliation_status ?? 'N/A'],
        [],
      ];

      const taxSummary: string[][] = csvIsLtd
        ? [
            ['Revenue', fmtCurrency(csvLtd.income)],
            ['Allowable Company Expenses', fmtCurrency(csvLtd.expenses)],
            ['Taxable Company Profit', fmtCurrency(csvLtd.profit)],
            ['Estimated Corporation Tax', fmtCurrency(csvLtd.corpTax)],
            ['After-tax Profit', fmtCurrency(csvLtd.afterTax)],
            ['VAT Liability', csvLtd.vatStatus === 'registered' ? fmtCurrency(csvLtd.vatLiability) : 'N/A (not registered)'],
            [],
          ]
        : [
            ['Turnover / Total Income', fmtCurrency(csvSt.income)],
            ['Allowable Expenses', fmtCurrency(csvSt.expenses)],
            ['Taxable Profit', fmtCurrency(csvSt.profit)],
            ['Personal Allowance Used', fmtCurrency(csvSt.personalAllowance)],
            ...csvSt.bands.map((b) => [`${b.name}`, `${fmtCurrency(b.amount)} → ${fmtCurrency(b.tax)}`]),
            ['Estimated Income Tax', fmtCurrency(csvSt.incomeTax)],
            ['Estimated NI (Class 4)', fmtCurrency(csvSt.ni)],
            ['Estimated Total Due', fmtCurrency(csvSt.totalDue)],
            [],
          ];

      // P&L section for CSV
      const pnl = data.profitAndLoss;
      const pnlRows: string[][] = pnl && pnl.tool_attachment_count > 0
        ? [
            ['Profit & Loss Summary'],
            ['Turnover (all line items)', fmtCurrency(pnl.turnover)],
            ['Labour (profit margin)', fmtCurrency(pnl.labour)],
            ['Cost of Sales', fmtCurrency(pnl.cost_of_sales)],
            ['  Materials', fmtCurrency(pnl.cost_of_sales_breakdown.materials)],
            ['  Subcontractor', fmtCurrency(pnl.cost_of_sales_breakdown.subcontractor)],
            ['  Plant / Hire', fmtCurrency(pnl.cost_of_sales_breakdown.plant_hire)],
            ['  Other Direct Cost', fmtCurrency(pnl.cost_of_sales_breakdown.other_direct_cost)],
            ['  Unclassified', fmtCurrency(pnl.cost_of_sales_breakdown.unknown)],
            ['Gross Profit', fmtCurrency(pnl.gross_profit)],
            ['Operating Expenses (Overheads)', fmtCurrency(pnl.operating_expenses)],
            ['Net Profit', fmtCurrency(pnl.net_profit)],
            ['Tool Estimates Used', String(pnl.tool_attachment_count)],
            [],
          ]
        : [];

      const rows = [
        ...metaRows,
        ...pnlRows,
        ...taxSummary,
        ['Type', 'Number', 'Client', 'Status', 'Total', 'Balance Due', 'Due Date', 'Created'],
        ...data.recentInvoices.map((inv) => [
          'Invoice',
          inv.invoice_number ?? '',
          inv.clients?.name ?? '',
          inv.status,
          String(inv.total),
          String(inv.balance_due),
          inv.due_date ?? '',
          inv.created_at,
        ]),
        ...data.recentQuotes.map((q) => [
          'Quote',
          q.quote_number ?? '',
          q.clients?.name ?? '',
          q.status,
          String(q.total),
          '',
          '',
          q.created_at,
        ]),
        [],
        [DISCLAIMER_TEXT],
      ];

      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accountant-export-${selectedTaxYear.replace('/', '-')}-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      // Log export to audit trail (fire-and-forget)
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          fetch('/api/workspace/accountant', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'data_exported',
              format: 'csv',
              snapshot_version: data.snapshot?.version ?? null,
              source: 'accountant_hub',
              tax_year: selectedTaxYear,
              tax_region: taxRegion,
              vat_status: vatStatus,
              business_structure: data.business?.structure ?? 'sole_trader',
              invoice_count: data.recentInvoices.length,
              quote_count: data.recentQuotes.length,
            }),
          }).catch(() => {}); // Fire-and-forget
        }
      }
    } finally {
      setExporting(false);
    }
  }, [data, selectedTaxYear, taxRegion, vatStatus]);

  // ── Export PDF handler ──
  const handleExportPDF = useCallback(() => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const f = data.financial;
      const d = data.documents;
      const computedAt = new Date().toISOString();
      const dateStr = computedAt.slice(0, 10);
      const pdfIsLtd = data.business?.structure === 'limited_company';
      const pdfSt = computeSoleTraderBreakdown(f.yearRevenue, 0, selectedTaxYear, taxRegion);
      const pdfLtd = computeLtdBreakdown(f.yearRevenue, 0, selectedTaxYear, vatStatus);

      const invoiceRows = data.recentInvoices
        .map(
          (inv) =>
            `<tr><td>${inv.invoice_number ?? ''}</td><td>${inv.clients?.name ?? ''}</td><td>${inv.status}</td><td>\u00A3${Number(inv.total).toFixed(2)}</td><td>\u00A3${Number(inv.balance_due).toFixed(2)}</td><td>${inv.due_date ?? ''}</td></tr>`
        )
        .join('');
      const quoteRows = data.recentQuotes
        .map(
          (q) =>
            `<tr><td>${q.quote_number ?? ''}</td><td>${q.clients?.name ?? ''}</td><td>${q.status}</td><td>\u00A3${Number(q.total).toFixed(2)}</td><td></td><td></td></tr>`
        )
        .join('');

      const fmt = (v: number) => `\u00A3${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // P&L section for PDF
      const pdfPnl = data.profitAndLoss;
      const pnlSection = pdfPnl && pdfPnl.tool_attachment_count > 0
        ? `<h2>Profit &amp; Loss (${selectedTaxYear})</h2>
<table><tbody>
<tr><td>Turnover (all line items)</td><td style="color:#b45309;font-weight:700">${fmt(pdfPnl.turnover)}</td></tr>
${pdfPnl.labour > 0 ? `<tr><td>Labour <span style="color:#94a3b8;font-size:10px">(profit margin — not deducted)</span></td><td style="color:#15803d;font-weight:600">${fmt(pdfPnl.labour)}</td></tr>` : ''}
<tr><td colspan="2" style="font-weight:600;padding-top:10px">Cost of Sales</td></tr>
${pdfPnl.cost_of_sales_breakdown.materials > 0 ? `<tr><td style="padding-left:16px">Materials</td><td>${fmt(pdfPnl.cost_of_sales_breakdown.materials)}</td></tr>` : ''}
${pdfPnl.cost_of_sales_breakdown.subcontractor > 0 ? `<tr><td style="padding-left:16px">Subcontractor</td><td>${fmt(pdfPnl.cost_of_sales_breakdown.subcontractor)}</td></tr>` : ''}
${pdfPnl.cost_of_sales_breakdown.plant_hire > 0 ? `<tr><td style="padding-left:16px">Plant / Hire</td><td>${fmt(pdfPnl.cost_of_sales_breakdown.plant_hire)}</td></tr>` : ''}
${pdfPnl.cost_of_sales_breakdown.other_direct_cost > 0 ? `<tr><td style="padding-left:16px">Other Direct Cost</td><td>${fmt(pdfPnl.cost_of_sales_breakdown.other_direct_cost)}</td></tr>` : ''}
${pdfPnl.cost_of_sales_breakdown.unknown > 0 ? `<tr><td style="padding-left:16px">Unclassified</td><td>${fmt(pdfPnl.cost_of_sales_breakdown.unknown)}</td></tr>` : ''}
<tr style="background:#fef9c3"><td><strong>Total Cost of Sales</strong></td><td style="font-weight:700">${fmt(pdfPnl.cost_of_sales)}</td></tr>
<tr style="background:#dcfce7"><td><strong>Gross Profit</strong></td><td style="color:#15803d;font-weight:700">${fmt(pdfPnl.gross_profit)}</td></tr>
${pdfPnl.operating_expenses > 0 ? `<tr><td>Operating Expenses (Overheads)</td><td>${fmt(pdfPnl.operating_expenses)}</td></tr>` : ''}
<tr style="background:#bbf7d0"><td><strong>Net Profit</strong></td><td style="color:#166534;font-weight:700;font-size:14px">${fmt(pdfPnl.net_profit)}</td></tr>
</tbody></table>
<p style="font-size:10px;color:#94a3b8;margin-top:4px">Based on ${pdfPnl.tool_attachment_count} classified tool estimate${pdfPnl.tool_attachment_count !== 1 ? 's' : ''}. Labour contributes to profit margin.</p>`
        : '';

      const vatLine = pdfLtd.vatStatus === 'registered'
        ? `<tr style="background:#fef2f2"><td><strong>VAT Liability</strong></td><td style="color:#b91c1c;font-weight:700">${fmt(pdfLtd.vatLiability)}</td></tr>`
        : `<tr><td>VAT Status</td><td style="color:#64748b">Not VAT registered</td></tr>`;

      const taxSection = pdfIsLtd
        ? `<h2>Corporation Tax Estimate (${selectedTaxYear})</h2>
<table><tbody>
<tr><td>Revenue</td><td style="color:#b45309;font-weight:700">${fmt(pdfLtd.income)}</td></tr>
<tr><td>Allowable Company Expenses</td><td>${fmt(pdfLtd.expenses)}</td></tr>
<tr><td>Taxable Company Profit</td><td style="color:#15803d;font-weight:700">${fmt(pdfLtd.profit)}</td></tr>
<tr><td>Effective Corporation Tax Rate</td><td>${pdfLtd.corpRate.toFixed(1)}%</td></tr>
<tr style="background:#fef2f2"><td><strong>Estimated Corporation Tax</strong></td><td style="color:#b91c1c;font-weight:700">${fmt(pdfLtd.corpTax)}</td></tr>
<tr><td>After-tax Profit</td><td style="color:#15803d;font-weight:700">${fmt(pdfLtd.afterTax)}</td></tr>
${vatLine}
</tbody></table>`
        : `<h2>Tax Estimate \u2014 Self Assessment (${selectedTaxYear}) \u2014 ${REGION_LABELS[taxRegion]}</h2>
<table><tbody>
<tr><td>Turnover / Total Income</td><td style="color:#b45309;font-weight:700">${fmt(pdfSt.income)}</td></tr>
<tr><td>Allowable Expenses</td><td>${fmt(pdfSt.expenses)}</td></tr>
<tr><td>Taxable Profit</td><td style="color:#15803d;font-weight:700">${fmt(pdfSt.profit)}</td></tr>
<tr><td>Personal Allowance</td><td>${fmt(pdfSt.personalAllowance)}</td></tr>
${pdfSt.bands.map((b) => `<tr><td>${b.name}</td><td>${fmt(b.amount)} \u2192 ${fmt(b.tax)}</td></tr>`).join('\n')}
<tr style="background:#fef2f2"><td><strong>Estimated Income Tax</strong></td><td style="color:#b91c1c;font-weight:700">${fmt(pdfSt.incomeTax)}</td></tr>
<tr style="background:#fef2f2"><td><strong>Estimated NI (Class 4)</strong></td><td style="color:#b91c1c;font-weight:700">${fmt(pdfSt.ni)}</td></tr>
<tr style="background:#fecaca"><td><strong>Estimated Total Due</strong></td><td style="color:#991b1b;font-weight:700;font-size:14px">${fmt(pdfSt.totalDue)}</td></tr>
</tbody></table>`;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Accountant Report ${dateStr}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#1e293b}
h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin-top:28px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #f1f5f9}
th{background:#f8fafc;font-weight:600}.kpi{display:inline-block;min-width:140px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;margin:4px 6px 4px 0}
.kpi .label{font-size:10px;color:#64748b}.kpi .val{font-size:18px;font-weight:700}
.meta{font-size:11px;color:#94a3b8}@media print{body{padding:20px}}</style></head><body>
<h1>Accountant Hub Report</h1>
<p class="meta">Generated ${dateStr} \u00b7 Plan: ${data.access.plan_tier} \u00b7 Structure: ${pdfIsLtd ? 'Limited Company' : 'Sole Trader'} \u00b7 Region: ${REGION_LABELS[taxRegion]} \u00b7 Tax Year: ${selectedTaxYear} \u00b7 VAT: ${vatStatus === 'registered' ? 'Registered' : 'Not registered'}</p>
<p class="meta">Snapshot: v${data.snapshot?.version ?? 'N/A'} \u00b7 Reconciliation: ${data.snapshot?.reconciliation_status ?? 'N/A'} \u00b7 Computed: ${computedAt}</p>
<h2>Financial Overview</h2>
<div>
<div class="kpi"><div class="label">Annual Revenue</div><div class="val">${fmt(f.yearRevenue)}</div></div>
<div class="kpi"><div class="label">Monthly Revenue</div><div class="val">${fmt(f.monthRevenue)}</div></div>
<div class="kpi"><div class="label">Total Paid</div><div class="val">${fmt(f.totalPaid)}</div></div>
<div class="kpi"><div class="label">Outstanding</div><div class="val">${fmt(f.totalOutstanding)}</div></div>
</div>
${pnlSection}
${taxSection}
<h2>Documents</h2>
<p style="font-size:12px">Invoices generated: ${d.invoicesGenerated} \u00b7 Quotes generated: ${d.quotesGenerated}</p>
<h2>Invoices</h2>
<table><thead><tr><th>#</th><th>Client</th><th>Status</th><th>Total</th><th>Balance Due</th><th>Due Date</th></tr></thead><tbody>${invoiceRows || '<tr><td colspan="6">No invoices</td></tr>'}</tbody></table>
<h2>Quotes</h2>
<table><thead><tr><th>#</th><th>Client</th><th>Status</th><th>Total</th><th></th><th></th></tr></thead><tbody>${quoteRows || '<tr><td colspan="6">No quotes</td></tr>'}</tbody></table>
<p style="margin-top:28px;font-size:10px;color:#94a3b8">${DISCLAIMER_TEXT}</p>
</body></html>`;

      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 300);
      }
    } finally {
      setExportingPdf(false);
    }
  }, [data, selectedTaxYear, taxRegion, vatStatus]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-slate-900" />
          <p className="text-sm text-slate-500">Loading accountant data\u2026</p>
        </div>
      </div>
    );
  }

  // ── Error / gate state ──
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-4xl">🔒</p>
          <h2 className="mt-3 text-lg font-semibold text-amber-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { financial: fin, documents: docs } = data;
  const isLtd = data.business?.structure === 'limited_company';

  const monthChange = fin.prevMonthRevenue > 0
    ? ((fin.monthRevenue - fin.prevMonthRevenue) / fin.prevMonthRevenue) * 100
    : 0;

  // ── Tax computation for selected year ──
  const taxIncome = fin.yearRevenue;
  const taxExpenses = 0; // Expense tracking not yet available
  const st = computeSoleTraderBreakdown(taxIncome, taxExpenses, selectedTaxYear, taxRegion);
  const ltd = computeLtdBreakdown(taxIncome, taxExpenses, selectedTaxYear, vatStatus);
  const vatWarning = vatStatus === 'not_registered' && taxIncome > VAT_REG_THRESHOLD;
  const vatDeregNote = vatStatus === 'registered' && taxIncome < VAT_DEREG_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* ── Reconciliation Warning ── */}
      {data.snapshot?.reconciliation_status === 'mismatch' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex gap-2">
            <span className="shrink-0 text-red-600">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-800">
                Financial Data Mismatch Detected
              </p>
              <p className="mt-1 text-xs text-red-700">
                Live calculations differ from the previous snapshot (v{data.snapshot.version},
                computed {fmtDate(data.snapshot.computed_at)}).
                This may indicate recent changes to invoices or quotes.
                Please review and verify the figures below.
              </p>
              {Object.keys(data.snapshot.mismatch_flags).length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-red-700">
                  {Object.entries(data.snapshot.mismatch_flags).map(([field, info]) => (
                    <li key={field}>
                      <strong>{field.replace(/_/g, ' ')}:</strong>{' '}
                      previous {typeof info === 'object' && info && 'snapshot' in info ? fmtCurrency((info as any).snapshot) : '—'}
                      {' → '}live {typeof info === 'object' && info && 'live' in info ? fmtCurrency((info as any).live) : '—'}
                      {' '}(delta: {typeof info === 'object' && info && 'delta' in info ? fmtCurrency((info as any).delta) : '—'})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Global Tax Year Selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {TAX_YEARS.map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => setSelectedTaxYear(ty)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedTaxYear === ty
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {ty}
              </button>
            ))}
          </div>
        </div>
        {refreshing && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-slate-600" />
            Updating\u2026
          </div>
        )}
      </div>

      {/* Year context banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
        <p className="text-xs text-slate-600">
          Showing values for <strong>tax year {selectedTaxYear}</strong> (6 Apr {selectedTaxYear.split('/')[0]} \u2013 5 Apr {parseInt(selectedTaxYear.split('/')[0], 10) + 1}).
          Estimate based on selected year and current inputs.
        </p>
      </div>

      {/* ── Section: Financial Overview ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Financial Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Year Revenue"
            value={fmtCurrency(fin.yearRevenue)}
            note={`Tax year ${selectedTaxYear}`}
            accent="amber"
          />
          <KpiCard
            label="This Month"
            value={fmtCurrency(fin.monthRevenue)}
            note={
              monthChange !== 0
                ? `${monthChange > 0 ? '+' : ''}${monthChange.toFixed(1)}% vs last month`
                : 'No prior month data'
            }
            accent="green"
          />
          <KpiCard
            label="Outstanding"
            value={fmtCurrency(fin.totalOutstanding)}
            note={`${fin.invoicesOutstanding} invoice${fin.invoicesOutstanding !== 1 ? 's' : ''} pending`}
            accent="amber"
          />
          <KpiCard
            label="Overdue"
            value={String(fin.invoicesOverdue)}
            note={fin.invoicesOverdue > 0 ? 'Requires follow-up' : 'All up to date'}
            accent={fin.invoicesOverdue > 0 ? 'red' : 'green'}
          />
        </div>

        {/* Invoice/Quote summary row */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="Total Invoices" value={fin.invoicesTotal} />
          <MiniStat label="Paid" value={fin.invoicesPaid} />
          <MiniStat label="Total Quotes" value={fin.quotesTotal} />
          <MiniStat label="Accepted" value={fin.quotesAccepted} />
        </div>
      </section>

      {/* ── Section: Profit & Loss ── */}
      {data.profitAndLoss && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Profit &amp; Loss ({selectedTaxYear})</h2>
          {data.profitAndLoss.tool_attachment_count === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
              <p className="text-sm text-slate-500">
                No classified tool data yet for this tax year. Create estimates using the Tools section to populate cost breakdowns.
              </p>
            </div>
          ) : (
            <>
              {/* P&L Summary KPIs */}
              <div className="mb-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <KpiCard label="Turnover" value={fmtCurrency(data.profitAndLoss.turnover)} note={`From ${data.profitAndLoss.tool_attachment_count} estimate${data.profitAndLoss.tool_attachment_count !== 1 ? 's' : ''}`} accent="amber" />
                <KpiCard label="Cost of Sales" value={fmtCurrency(data.profitAndLoss.cost_of_sales)} note="Materials + subs + plant + other" accent="red" />
                <KpiCard label="Gross Profit" value={fmtCurrency(data.profitAndLoss.gross_profit)} note={data.profitAndLoss.turnover > 0 ? `${((data.profitAndLoss.gross_profit / data.profitAndLoss.turnover) * 100).toFixed(1)}% margin` : '\u2014'} accent="green" />
                <KpiCard label="Overheads" value={fmtCurrency(data.profitAndLoss.operating_expenses)} note="Operating expenses" accent="slate" />
                <KpiCard label="Net Profit" value={fmtCurrency(data.profitAndLoss.net_profit)} note={data.profitAndLoss.turnover > 0 ? `${((data.profitAndLoss.net_profit / data.profitAndLoss.turnover) * 100).toFixed(1)}% margin` : '\u2014'} accent={data.profitAndLoss.net_profit >= 0 ? 'green' : 'red'} />
              </div>

              {/* P&L Breakdown Table */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)] overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profit &amp; Loss Breakdown</p>
                </div>
                {/* Turnover */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-amber-50/30">
                  <span className="text-sm font-medium text-amber-800">Turnover</span>
                  <span className="text-sm font-semibold text-amber-800">{fmtCurrency(data.profitAndLoss.turnover)}</span>
                </div>
                {/* Labour = profit margin (shown but NOT deducted) */}
                {data.profitAndLoss.labour > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-green-700">Labour <span className="text-xs text-green-500">(profit margin)</span></span>
                    <span className="text-sm font-medium text-green-700">{fmtCurrency(data.profitAndLoss.labour)}</span>
                  </div>
                )}
                {/* Cost of Sales breakdown */}
                <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/30">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cost of Sales</span>
                </div>
                {([
                  ['Materials', data.profitAndLoss.cost_of_sales_breakdown.materials],
                  ['Subcontractor', data.profitAndLoss.cost_of_sales_breakdown.subcontractor],
                  ['Plant / Hire', data.profitAndLoss.cost_of_sales_breakdown.plant_hire],
                  ['Other Direct Cost', data.profitAndLoss.cost_of_sales_breakdown.other_direct_cost],
                  ['Unclassified', data.profitAndLoss.cost_of_sales_breakdown.unknown],
                ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="text-sm font-medium text-slate-700">{fmtCurrency(val)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-amber-50/40">
                  <span className="text-sm font-medium text-amber-800">Total Cost of Sales</span>
                  <span className="text-sm font-semibold text-amber-800">{fmtCurrency(data.profitAndLoss.cost_of_sales)}</span>
                </div>
                {/* Gross Profit */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-green-50/40">
                  <span className="text-sm font-medium text-green-800">Gross Profit</span>
                  <span className="text-sm font-semibold text-green-800">{fmtCurrency(data.profitAndLoss.gross_profit)}</span>
                </div>
                {/* Overheads */}
                {data.profitAndLoss.operating_expenses > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-slate-600">Overheads</span>
                    <span className="text-sm font-medium text-slate-700">{fmtCurrency(data.profitAndLoss.operating_expenses)}</span>
                  </div>
                )}
                {/* Net Profit */}
                <div className="flex items-center justify-between px-5 py-4 bg-green-50/50">
                  <span className="text-sm font-bold text-green-900">Net Profit</span>
                  <span className={`text-base font-bold ${data.profitAndLoss.net_profit >= 0 ? 'text-green-900' : 'text-red-800'}`}>{fmtCurrency(data.profitAndLoss.net_profit)}</span>
                </div>
              </div>

              {/* Data source note */}
              <p className="mt-3 text-xs text-slate-400">
                Based on {data.profitAndLoss.tool_attachment_count} classified tool estimate{data.profitAndLoss.tool_attachment_count !== 1 ? 's' : ''} in this tax year. Labour contributes to profit margin. Materials, subcontractors, plant hire and other direct costs are deducted as cost of sales.
              </p>
            </>
          )}
        </section>
      )}

      {/* ── Section: Documents ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Documents ({selectedTaxYear})</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Invoices */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recent Invoices
            </h3>
            {data.recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No invoices yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.recentInvoices.slice(0, 5).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {inv.invoice_number ?? 'Draft'} — {inv.clients?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due {fmtDate(inv.due_date)}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {fmtCurrency(inv.total)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Quotes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recent Quotes
            </h3>
            {data.recentQuotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No quotes yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.recentQuotes.slice(0, 5).map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {q.quote_number ?? 'Draft'} — {q.clients?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{fmtDate(q.created_at)}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[q.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {q.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {fmtCurrency(q.total)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Document generation counts */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <MiniStat label="Invoices Generated" value={docs.invoicesGenerated} />
          <MiniStat label="Quotes Generated" value={docs.quotesGenerated} />
        </div>
      </section>

      {/* ── Section: Tax Estimate ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isLtd ? 'Corporation Tax Estimate' : 'Tax Estimate (Self Assessment)'}
        </h2>

        {/* Region selector — sole trader only */}
        {!isLtd && (
          <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {(['england_wales_ni', 'scotland'] as TaxRegion[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTaxRegion(r)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  taxRegion === r
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {REGION_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        {/* Scotland info banner */}
        {!isLtd && taxRegion === 'scotland' && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex gap-2">
              <span className="shrink-0 text-blue-600">ℹ️</span>
              <p className="text-xs leading-relaxed text-blue-800">
                <strong>Scottish Income Tax:</strong> Scotland sets its own income tax rates and bands.
                The rates below reflect the Scottish Government rates for {selectedTaxYear}. National Insurance
                remains UK-wide.
              </p>
            </div>
          </div>
        )}

        {/* VAT status selector — Ltd only */}
        {isLtd && (
          <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {(['not_registered', 'registered'] as VatStatus[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVatStatus(v)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  vatStatus === v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v === 'registered' ? 'VAT Registered' : 'Not VAT Registered'}
              </button>
            ))}
          </div>
        )}

        {/* VAT threshold warnings */}
        {vatWarning && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex gap-2">
              <span className="shrink-0 text-amber-600">⚠️</span>
              <p className="text-xs leading-relaxed text-amber-800">
                <strong>VAT Registration Threshold:</strong> Your turnover exceeds £90,000. You may be required
                to register for VAT. Consult HMRC or your accountant.
              </p>
            </div>
          </div>
        )}
        {vatDeregNote && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex gap-2">
              <span className="shrink-0 text-blue-600">ℹ️</span>
              <p className="text-xs leading-relaxed text-blue-800">
                <strong>VAT Deregistration:</strong> Your turnover is below the £88,000 deregistration threshold.
                You may be eligible to deregister for VAT.
              </p>
            </div>
          </div>
        )}

        {isLtd ? (
          <>
            {/* Limited Company overview KPIs */}
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <KpiCard label="Revenue" value={fmtCurrency(ltd.income)} note="Company turnover" accent="amber" />
              <KpiCard label="Allowable Company Expenses" value={fmtCurrency(ltd.expenses)} note="Not tracked yet" accent="slate" />
              <KpiCard label="Taxable Company Profit" value={fmtCurrency(ltd.profit)} note="Revenue minus expenses" accent="green" />
            </div>

            {/* Corp tax breakdown */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)] overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Corporation Tax Breakdown ({selectedTaxYear})</p>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Taxable Company Profit</span>
                <span className="text-sm font-semibold text-green-700">{fmtCurrency(ltd.profit)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Effective Corporation Tax Rate</span>
                <span className="text-sm font-medium text-slate-500">{ltd.corpRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-red-50/30">
                <span className="text-sm font-medium text-red-700">Estimated Corporation Tax</span>
                <span className="text-sm font-semibold text-red-700">{fmtCurrency(ltd.corpTax)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">After-tax Profit</span>
                <span className="text-sm font-semibold text-green-700">{fmtCurrency(ltd.afterTax)}</span>
              </div>
              {ltd.vatStatus === 'registered' && (
                <div className="flex items-center justify-between px-5 py-3 bg-red-50/50">
                  <span className="text-sm font-semibold text-red-700">VAT Liability</span>
                  <span className="text-sm font-bold text-red-700">{fmtCurrency(ltd.vatLiability)}</span>
                </div>
              )}
              {ltd.vatStatus === 'not_registered' && (
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50">
                  <span className="text-sm text-slate-500">VAT</span>
                  <span className="text-sm text-slate-400">Not registered</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Sole Trader overview KPIs */}
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <KpiCard label="Turnover / Total Income" value={fmtCurrency(st.income)} note="Annual revenue" accent="amber" />
              <KpiCard label="Allowable Expenses" value={fmtCurrency(st.expenses)} note="Not tracked yet" accent="slate" />
              <KpiCard label="Taxable Profit" value={fmtCurrency(st.profit)} note="Income minus expenses" accent="green" />
            </div>

            {/* Income tax breakdown */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)] overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Income Tax Breakdown — {REGION_LABELS[taxRegion]} ({selectedTaxYear})
                </p>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Personal Allowance{st.personalAllowance < 12570 ? ' (tapered)' : ''}</span>
                <span className="text-sm font-medium text-slate-500">{fmtCurrency(st.personalAllowance)}</span>
              </div>
              {st.bands.map((b, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <span className="text-sm text-slate-600">{b.name} ({b.rate}%)</span>
                  <span className="text-sm text-slate-700">{fmtCurrency(b.amount)} → <span className="font-semibold">{fmtCurrency(b.tax)}</span></span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-red-50/30">
                <span className="text-sm font-medium text-red-700">Estimated Income Tax</span>
                <span className="text-sm font-semibold text-red-700">{fmtCurrency(st.incomeTax)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-red-50/30">
                <span className="text-sm font-medium text-red-700">Estimated NI (Class 4)</span>
                <span className="text-sm font-semibold text-red-700">{fmtCurrency(st.ni)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 bg-red-50/50">
                <span className="text-sm font-bold text-red-800">Estimated Total Due</span>
                <span className="text-base font-bold text-red-800">{fmtCurrency(st.totalDue)}</span>
              </div>
            </div>
          </>
        )}

        {/* Legal disclaimer */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex gap-2">
            <span className="shrink-0 text-amber-600">⚠️</span>
            <p className="text-xs leading-relaxed text-amber-800">
              <strong>Disclaimer:</strong> {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Export ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Export</h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
          <p className="mb-4 text-sm text-slate-600">
            Download your financial summary, tax estimates, invoices and quotes for <strong>tax year {selectedTaxYear}</strong>. Exports reflect your selected business structure and tax year.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting\u2026' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exportingPdf ? 'Preparing\u2026' : 'Export PDF'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
}) {
  const accentBorder: Record<string, string> = {
    blue: 'border-blue-200',
    green: 'border-green-200',
    amber: 'border-amber-200',
    red: 'border-red-200',
    purple: 'border-purple-200',
    slate: 'border-gray-200',
  };

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] ${accentBorder[accent] ?? 'border-gray-200'}`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
