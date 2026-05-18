// src/app/api/workspace/documents/[id]/pdf/route.ts v2.0
//
// GET /api/workspace/documents/:id/pdf
//
// PURPOSE:
// Generate a PDF for any document in the public.documents table.
// This handles Android-created quotes/invoices that live in documents
// (not in the website-native quotes/invoices tables).
//
// AUTHENTICATION: Bearer token via Authorization header OR ?token= query param.
// AUTHORISATION:  Document must belong to the resolved workspace.
//
// VERSION HISTORY:
// - v1.0–v1.4: see git history.
// - v2.0 (2026-05-18): Full behavioural port of Android PdfGenerator.kt v3.11.0.
//   All rendering delegated to `renderPdfBody()` which encapsulates the exact
//   contract: continuation-page header repeat, totals/notes overflow, footer
//   on every page, contract-spec measurements + typography.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken, type DocumentRow } from '@/lib/workspace-data';
import { isPro, normalizePlanTier } from '@/lib/plans';
import { loadPdfIdentity, renderPdfBody } from '@/lib/pdf/branding';

function normaliseDocType(type: string | null): 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION' {
  const t = String(type || '').toLowerCase();
  if (t.includes('layout')) return 'LAYOUT QUOTATION';
  if (t.includes('invoice') || t.includes('receipt') || t.includes('payment')) return 'INVOICE';
  return 'QUOTE';
}

/**
 * Android flooring tool stores room dimensions in mm and computes area as
 * lengthMm * widthMm (raw mm²). A 3600mm × 5400mm room arrives with
 * qty = 19,440,000 instead of 19.44. Heuristic: if unit is area and qty ≥ 10k,
 * the value is mm² — divide by 1,000,000 to recover m².
 */
function normaliseAreaItem(it: {
  description: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
}): typeof it {
  const u = it.unit.toLowerCase().replace(/\s+/g, '');
  const isArea = u === 'm²' || u === 'm2' || u === 'sqm' || u === 'sq.m' || u === 'sq.m.';
  if (!isArea || it.qty < 10_000) return it;
  const normQty = Math.round((it.qty / 1_000_000) * 10_000) / 10_000;
  const normTotal =
    it.price > 0
      ? Math.round(normQty * it.price * 100) / 100
      : Math.round((it.total / 1_000_000) * 100) / 100;
  return { ...it, qty: normQty, total: normTotal };
}

/** Map snake_case (website) and camelCase (Android) item fields to canonical shape. */
function flexNormaliseItem(raw: Record<string, unknown>): {
  description: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
} {
  return {
    description: String(raw.description ?? raw.name ?? raw.itemName ?? raw.item_name ?? ''),
    unit:        String(raw.unit ?? raw.unitType ?? raw.unit_type ?? ''),
    qty:    Number(raw.qty ?? raw.quantity ?? raw.amount ?? 0),
    price:  Number(raw.price ?? raw.unit_price ?? raw.unitPrice ?? raw.rate ?? 0),
    total:  Number(raw.total ?? raw.line_total ?? raw.lineTotal ?? raw.rowTotal ?? raw.row_total ?? 0),
  };
}

/** Drop duplicate rows (Android can emit both raw mm² and converted sqm). */
function deduplicateItems<T extends { description: string; unit: string; qty: number; price: number }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = [it.description.trim().toLowerCase(), it.unit.trim().toLowerCase(), it.qty, it.price].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Contract §13: money format is `{symbol}{value:.2f}` — NO thousands separator.
const SYMBOLS: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function fmtMoney(value: number, code?: string | null): string {
  const c = (code ?? 'GBP').toUpperCase();
  return `${SYMBOLS[c] ?? c}${value.toFixed(2)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token =
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    req.nextUrl.searchParams.get('token') ||
    '';

  if (!token) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Unauthorised</h2><p>No auth token. Please reload the member app and try again.</p></body></html>',
      { status: 401, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const resolved = await resolveUserFromToken(token);
  if (!resolved) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Unauthorised</h2><p>Session expired or invalid token. Please sign in again.</p></body></html>',
      { status: 401, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<DocumentRow>();

  if (docErr || !doc) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Document not found</h2></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (doc.workspace_id !== workspaceId) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Forbidden</h2></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Plan check — controls watermark (free) vs logo (Pro+) per contract §6
  let isProUser = false;
  if (workspaceId) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('plan_tier')
      .eq('id', workspaceId)
      .maybeSingle();
    isProUser = isPro(normalizePlanTier(ws?.plan_tier));
  }

  const identity = workspaceId ? await loadPdfIdentity(workspaceId) : null;
  const currency = doc.currency ?? identity?.default_currency ?? 'GBP';
  const docTypeLabel = normaliseDocType(doc.type);

  // Normalise + dedupe items
  const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
  const items = deduplicateItems(rawItems.map((it) => normaliseAreaItem(flexNormaliseItem(it))));

  // Recalculate subtotal from normalised items (doc.subtotal may pre-date normalisation)
  const itemsSum = items.reduce((s, i) => s + i.total, 0);
  const subtotal = itemsSum > 0 ? itemsSum : (doc.subtotal ?? 0);
  const vat = doc.vat_amount ?? 0;
  const grand = doc.grand_total ?? subtotal + vat;

  // Build info-box rows (contract §10.1 field order — Status is NOT listed)
  const infoRows: Array<{ label: string; value: string }> = [];
  if (doc.date) infoRows.push({
    label: 'Date',
    value: new Date(doc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  });
  if (doc.reference)  infoRows.push({ label: 'Ref No', value: doc.reference });
  infoRows.push({ label: 'Client Ref', value: doc.client_ref ?? '—' });
  infoRows.push({ label: 'Email',      value: doc.client_email ?? '—' });
  infoRows.push({ label: 'Client Phone Number', value: doc.client_phone ?? '—' });
  if (identity?.company_number) infoRows.push({ label: 'Company No', value: identity.company_number });
  if (identity?.vat_enabled || identity?.vat_number) {
    infoRows.push({ label: 'VAT No', value: identity?.vat_number ?? '—' });
  }

  // Build totals rows (contract §4.7)
  const totalsRows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: fmtMoney(subtotal, currency) },
  ];
  if (vat > 0) totalsRows.push({
    label: `VAT (${identity?.vat_rate ?? 20}%)`,
    value: fmtMoney(vat, currency),
  });
  totalsRows.push({ label: 'Total', value: fmtMoney(grand, currency), bold: true });

  try {
    // margin: 0 — PDFKit's default margin triggers internal auto-pagination when
    // explicit-y text exceeds (page.height - margin). With margin: 0, footer text
    // at y=752+ renders without phantom page breaks. All drawing uses explicit (x,y).
    const pdfDoc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

    renderPdfBody(pdfDoc, {
      identity,
      docType: docTypeLabel,
      isProUser,
      fallbackTitle: identity?.company_name || 'TISSCA',
      client: {
        name:    doc.client_name    ?? undefined,
        address: doc.client_address ?? undefined,
        phone:   doc.client_phone   ?? undefined,
        email:   doc.client_email   ?? undefined,
      },
      infoRows,
      headerNotes: doc.header_notes ?? null,
      items,
      totalsRows,
      bottomNotes: doc.footer_notes ?? null,
      currencyCode: currency,
    });

    pdfDoc.end();

    return await new Promise<NextResponse>((resolve, reject) => {
      pdfDoc.on('error', (err: Error) => {
        console.error('[documents/pdf] PDFKit stream error:', err);
        reject(err);
      });
      pdfDoc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = doc.reference
          ? `${doc.reference.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
          : `document-${doc.id}.pdf`;

        resolve(new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': String(buffer.byteLength),
            'Cache-Control': 'no-store',
          },
        }));
      });
    });
  } catch (err) {
    console.error('[documents/pdf] PDF generation failed for doc', params.id, ':', err);
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error</h2><p>Could not generate PDF. Please try again.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }
}

