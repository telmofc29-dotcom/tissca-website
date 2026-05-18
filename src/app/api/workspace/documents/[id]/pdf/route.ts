// src/app/api/workspace/documents/[id]/pdf/route.ts v1.4
//
// GET /api/workspace/documents/:id/pdf
//
// PURPOSE:
// Generate a PDF for any document in the public.documents table.
// This handles Android-created quotes/invoices that live in documents
// (not in the website-native quotes/invoices tables).
//
// AUTHENTICATION: Bearer token via Authorization header OR ?token= query param.
//   Query param is accepted so browser <a href target="_blank"> links work correctly
//   without needing custom fetch() calls. This is safe for PDFs (HTTPS-only, short-lived token).
// AUTHORISATION:  Document must belong to the resolved workspace.
//
// VERSION HISTORY:
// - v1.0: Initial implementation — header-only auth.
// - v1.1 (2026-05-17): Accept token from ?token= query param (Part A fix).
// - v1.2 (2026-05-17): try/catch + pdfDoc.on('error') — fixes silent HTTP 500.
// - v1.3 (2026-05-18): Company Number + VAT Number in top-right info box (Android parity).
// - v1.4 (2026-05-18): Re-add flooring mm² → m² normalisation + deduplication.
//   Fix subtotal to use normalised item sum. Reorder info box fields to match Android:
//   Reference → Date → Status → Client Ref → Email → Phone → Company No → VAT No.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken, type DocumentRow } from '@/lib/workspace-data';
import { formatCurrency as fmtCur } from '@/lib/currency';
import {
  loadPdfIdentity,
  drawBrandedHeader,
  drawInfoBox,
  drawClientSection,
  drawItemsTable,
  drawTotalsBox,
  drawNotesSection,
  notesBoxHeight,
  drawFooterBar,
  drawPageNumber,
  FOOTER_RESERVED,
  MARGIN,
  CONTENT_W,
} from '@/lib/pdf/branding';

function normaliseDocType(type: string | null): 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION' {
  const t = String(type || '').toLowerCase();
  if (t.includes('layout')) return 'LAYOUT QUOTATION';
  if (t.includes('invoice') || t.includes('receipt') || t.includes('payment')) return 'INVOICE';
  return 'QUOTE';
}

/**
 * Android flooring tool stores room dimensions in mm and computes area as
 * lengthMm * widthMm (raw mm²) rather than (lengthMm/1000)*(widthMm/1000) m².
 * A 3600mm × 5400mm bedroom arrives with qty = 19440000 instead of 19.44.
 *
 * Heuristic: if unit is an area type (m², sqm, m2) and qty ≥ 10000,
 * the value was stored in mm² — divide by 1_000_000 to recover m².
 * Total is recalculated from normalised qty × price (or scaled from total if price is 0).
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

/**
 * Flexible item field normaliser: handles both the website's snake_case format
 * (description, qty, price, total) and potential Android camelCase variations
 * (name, quantity, unitPrice/unit_price, lineTotal/line_total/rowTotal).
 * Ensures items from any source are mapped to the canonical shape before rendering.
 */
function flexNormaliseItem(raw: Record<string, unknown>): {
  description: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
} {
  return {
    description: String(
      raw.description ?? raw.name ?? raw.itemName ?? raw.item_name ?? '',
    ),
    unit: String(raw.unit ?? raw.unitType ?? raw.unit_type ?? ''),
    qty: Number(raw.qty ?? raw.quantity ?? raw.amount ?? 0),
    price: Number(raw.price ?? raw.unit_price ?? raw.unitPrice ?? raw.rate ?? 0),
    total: Number(
      raw.total ?? raw.line_total ?? raw.lineTotal ?? raw.rowTotal ?? raw.row_total ?? 0,
    ),
  };
}

/**
 * Remove duplicate line items after normalisation.
 * Android can emit both a raw mm² row and a converted sqm row for the same
 * room; after normaliseAreaItem() both rows become identical. Keep the first.
 */
function deduplicateItems<T extends { description: string; unit: string; qty: number; price: number }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = [
      it.description.trim().toLowerCase(),
      it.unit.trim().toLowerCase(),
      it.qty,
      it.price,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Accept token from Authorization header OR ?token= query param.
  // The query param path is required so that <a href target="_blank"> links work —
  // browser navigation requests cannot set custom headers.
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
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Document not found</h2><p>This document does not exist or was deleted.</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Authorise: document must belong to this workspace
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (doc.workspace_id !== workspaceId) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error — Forbidden</h2><p>You do not have access to this document.</p></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Load PDF identity (branding) for this workspace
  const identity = workspaceId ? await loadPdfIdentity(workspaceId) : null;

  const brandColor = identity?.brand_color || '#1e40af';
  const currency = doc.currency ?? null;
  const docTypeLabel = normaliseDocType(doc.type);

  // Build items array.
  // flexNormaliseItem: maps both website snake_case and Android camelCase field names
  //   so items always arrive in the canonical shape regardless of which client created the doc.
  // normaliseAreaItem: Android flooring stores area as mm² (e.g. 19440000 for 19.44 m²).
  //   Divide by 1_000_000 when unit is m²/sqm and qty ≥ 10_000.
  // deduplicateItems: Android can emit both a raw and a converted row for the same room.
  const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
  const items = deduplicateItems(
    rawItems.map((it) => normaliseAreaItem(flexNormaliseItem(it))),
  );
  console.log(
    `[documents/pdf] doc ${params.id}: ${items.length} items from ${rawItems.length} raw`,
    items.length === 0 && rawItems.length > 0
      ? '— first raw item keys: ' + Object.keys(rawItems[0]).join(', ')
      : '',
  );

  // Subtotal: recalculate from normalised items — doc.subtotal may reflect the
  // wrong (mm²-based) item totals when Android wrote them before normalisation.
  const itemsSum = items.reduce((s, i) => s + i.total, 0);
  const subtotal = itemsSum > 0 ? itemsSum : (doc.subtotal ?? 0);
  const vat = doc.vat_amount ?? 0;
  const grand = doc.grand_total ?? subtotal + vat;

  try {
    // ── PDF generation ───────────────────────────────────────────────────────
    // Architecture mirrors Android PdfGenerator.kt:
    //   - Footer bar is PAGE-ANCHORED: drawn at the absolute bottom of EVERY page.
    //   - Body content is bounded by a safe-bottom zone: page.height - FOOTER_RESERVED.
    //   - Page-break guards check safeBottom() BEFORE drawing each body section.
    //   - drawItemsTable fires onBeforePageBreak (draw footer + increment counter)
    //     BEFORE calling doc.addPage() internally.
    //   - After all content, drawCurrentPageFooter() finalises the last page.
    // ─────────────────────────────────────────────────────────────────────────
    // margin: 0 is critical — with margin: 40 (default), PDFKit's maxY = page.height - 40 = 801.
    // Any doc.text() call with an explicit y > 801 (i.e. footer zone) triggers PDFKit to add a
    // new page before drawing, producing blank overflow pages. With margin: 0, maxY = 841.89
    // and all footer text at y ≤ 835 renders correctly without any phantom page breaks.
    // All our drawing functions use explicit (x, y) coordinates, so margin: 0 is safe.
    const pdfDoc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // ── Per-page helpers ──────────────────────────────────────────────────────
    let pageNum = 1;

    /** Returns the Y below which body content must not extend (footer safe zone). */
    const safeBottom = () => pdfDoc.page.height - FOOTER_RESERVED;

    /**
     * Draw footer bar + page number on the CURRENTLY ACTIVE page.
     * Must be called exactly once per page, after all body content for that page.
     */
    function drawCurrentPageFooter() {
      drawFooterBar(pdfDoc, identity);
      drawPageNumber(pdfDoc, pageNum);
    }

    /**
     * Finalise the current page (footer) and switch to a new one.
     * Use this for body-section overflow (header notes, totals, notes).
     * NOT used inside drawItemsTable — that function manages its own addPage().
     */
    function breakPage() {
      drawCurrentPageFooter();
      pdfDoc.addPage();
      pageNum++;
    }

    // ── Page 1: branding header ───────────────────────────────────────────────
    let y = drawBrandedHeader(pdfDoc, identity, docTypeLabel);

    // ── Info box (top-right) — Android field order: Date → Ref → Status →
    //    Client Ref → Email → Client Phone Number → Company No → VAT No ────────
    const infoRows: Array<{ label: string; value: string }> = [];
    if (doc.date) infoRows.push({
      label: 'Date',
      value: new Date(doc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
    if (doc.reference) infoRows.push({ label: 'Ref No', value: doc.reference });
    if (doc.status)    infoRows.push({ label: 'Status', value: doc.status });
    // Client Ref always shown (even if empty) — matches Android layout
    infoRows.push({ label: 'Client Ref', value: doc.client_ref ?? '' });
    if (doc.client_email) infoRows.push({ label: 'Email', value: doc.client_email });
    if (doc.client_phone) infoRows.push({ label: 'Client Phone Number', value: doc.client_phone });
    if (identity?.company_number) infoRows.push({ label: 'Company No', value: identity.company_number });
    if (identity?.vat_number)     infoRows.push({ label: 'VAT No', value: identity.vat_number });

    const infoEndY = infoRows.length > 0 ? drawInfoBox(pdfDoc, y, infoRows) : y;

    drawClientSection(pdfDoc, y, {
      name:    doc.client_name    ?? undefined,
      address: doc.client_address ?? undefined,
      phone:   doc.client_phone   ?? undefined,
      email:   doc.client_email   ?? undefined,
    });

    y = Math.max(infoEndY, y + 80) + 16;

    // ── Header notes ──────────────────────────────────────────────────────────
    if (doc.header_notes) {
      const notesH = pdfDoc.heightOfString(doc.header_notes, { width: CONTENT_W }) + 12;
      if (y + notesH > safeBottom()) { breakPage(); y = MARGIN; }
      pdfDoc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(doc.header_notes, MARGIN, y, { width: CONTENT_W });
      y += notesH;
    }

    // ── Items table ───────────────────────────────────────────────────────────
    // onBeforePageBreak: draw footer on the current (old) page and increment the
    // counter. drawItemsTable calls doc.addPage() after this callback returns —
    // the callback must NOT call doc.addPage() itself.
    if (items.length > 0) {
      y = drawItemsTable(pdfDoc, y, items, brandColor, currency, {
        onBeforePageBreak: () => {
          drawCurrentPageFooter();
          pageNum++;
        },
      });
      y += 12;
    }

    // ── Totals box ────────────────────────────────────────────────────────────
    const totalRows: Array<{ label: string; value: string; bold?: boolean }> = [
      { label: 'Subtotal', value: fmtCur(subtotal, currency) },
    ];
    if (vat > 0) totalRows.push({ label: `VAT (${identity?.vat_rate ?? 20}%)`, value: fmtCur(vat, currency) });
    totalRows.push({ label: 'Total', value: fmtCur(grand, currency), bold: true });

    const totalsBoxH = 6 * 2 + totalRows.length * 18 + 10;
    if (y + totalsBoxH > safeBottom()) { breakPage(); y = MARGIN; }
    y = drawTotalsBox(pdfDoc, y, totalRows);

    // ── Footer notes / NOTES section ─────────────────────────────────────────
    if (doc.footer_notes) {
      const boxH = notesBoxHeight(pdfDoc, doc.footer_notes);
      if (y + boxH > safeBottom()) { breakPage(); y = MARGIN; }
      y = drawNotesSection(pdfDoc, y, doc.footer_notes);
    }

    // ── Finalise last page ────────────────────────────────────────────────────
    // Every intermediate page already had its footer drawn by onBeforePageBreak
    // or breakPage(). This covers the first page (single-page docs) and the
    // last page of multi-page docs.
    drawCurrentPageFooter();

    pdfDoc.end();

    // `return await` ensures the catch block handles rejection from pdfDoc.on('error').
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

        resolve(
          new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${filename}"`,
              'Content-Length': String(buffer.byteLength),
              'Cache-Control': 'no-store',
            },
          }),
        );
      });
    });
  } catch (err) {
    console.error('[documents/pdf] PDF generation failed for doc', params.id, ':', err);
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>PDF Error</h2><p>Could not generate PDF. Please try again or contact support.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }
}
