// src/lib/pdf/branding.ts
//
// Shared PDF branding helpers used by all PDF generators
// (quotes, invoices, layout quotes). Fetches DocumentPdfInfo
// from Supabase and renders consistent branded headers/footers.

import { createServerSupabaseClient } from '@/lib/supabase';
import type { DocumentPdfInfo } from '@/app/api/workspace/document-pdf-info/route';
import { formatCurrency as fmtCur } from '@/lib/currency';

export type PdfIdentity = DocumentPdfInfo & { _logoBuffer?: Buffer | null };

/**
 * Load document PDF identity for a workspace.
 * Returns null if no identity is configured.
 */
export async function loadPdfIdentity(workspaceId: string): Promise<PdfIdentity | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('document_pdf_info')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!data) return null;

  const identity = data as PdfIdentity;

  // Pre-fetch logo image if URL exists.
  // The URL is a Supabase Storage public URL — the bucket must be set to public
  // in the Supabase dashboard for this to succeed on Vercel.
  if (identity.logo_url) {
    try {
      // 5-second timeout so a slow/unreachable storage endpoint never hangs the PDF function.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      let res: Response;
      try {
        res = await fetch(identity.logo_url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        identity._logoBuffer = Buffer.from(arrayBuffer);
      } else {
        console.warn(
          '[loadPdfIdentity] Logo fetch failed HTTP',
          res.status,
          '— bucket: business-logos must be public. URL:',
          identity.logo_url,
        );
        identity._logoBuffer = null;
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      console.warn(
        isTimeout
          ? '[loadPdfIdentity] Logo fetch timed out (>5s) — Supabase Storage may be unreachable'
          : '[loadPdfIdentity] Logo fetch threw — check bucket policy or network:',
        err,
      );
      identity._logoBuffer = null;
    }
  }

  return identity;
}

/**
 * Load PDF identity from a business/workspace ID.
 * In the live schema business_id IS workspace_id.
 */
export async function loadPdfIdentityByBusiness(businessId: string): Promise<PdfIdentity | null> {
  return loadPdfIdentity(businessId);
}

/**
 * Load PDF identity from an authenticated user's ID.
 * Resolves via user_profiles.current_workspace_id.
 * Use as fallback when loadPdfIdentityByBusiness fails.
 */
export async function loadPdfIdentityByUser(userId: string): Promise<PdfIdentity | null> {
  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_workspace_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.current_workspace_id) return null;

  return loadPdfIdentity(profile.current_workspace_id);
}

// ─── PDF Drawing Helpers ─────────────────────────────────────────────────────

const PAGE_W = 595.28; // A4
const MARGIN = 40;
const CONTENT_W = PAGE_W - 2 * MARGIN;

/**
 * Draw branded header matching the mobile app PDF format.
 * Logo (left) + Document type title (right).
 * Company name + tagline below logo.
 */
export function drawBrandedHeader(
  doc: PDFKit.PDFDocument,
  identity: PdfIdentity | null,
  docType: 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION',
): number {
  let y = 30;

  // Logo or company text
  if (identity?._logoBuffer) {
    try {
      doc.image(identity._logoBuffer, MARGIN, y, { height: 55 });
    } catch (err) {
      // PDFKit only natively supports PNG and JPEG.
      // WebP uploads are accepted by the bucket but will fail here — log so it's diagnosable.
      console.warn('[drawBrandedHeader] doc.image() failed — logo may be WebP or corrupt:', err);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(identity?.brand_color || '#1e40af')
        .text(identity?.company_name || 'TISSCA', MARGIN, y + 10, { lineBreak: false });
    }
  } else if (identity?.company_name) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor(identity.brand_color || '#1e40af')
      .text(identity.company_name, MARGIN, y + 10, { lineBreak: false });
  } else {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e40af')
      .text('TISSCA', MARGIN, y + 10, { lineBreak: false });
  }

  // Document type title (right-aligned) — lineBreak: false prevents cursor advancing
  // after this call, which would push subsequent explicit-y draws backward in PDFKit
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#111111')
    .text(docType, MARGIN, y + 5, { width: CONTENT_W, align: 'right', lineBreak: false });

  y += 55;

  // Company name + tagline below logo (if logo exists)
  if (identity?._logoBuffer && identity?.company_name) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
      .text(identity.company_name.toUpperCase(), MARGIN, y, { lineBreak: false });
    y += 16;
  }
  if (identity?.tagline) {
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(identity.tagline, MARGIN, y, { lineBreak: false });
    y += 14;
  }

  y += 8;

  // Horizontal separator line under header — matches Android PDF divider
  doc.save();
  doc.moveTo(MARGIN, y)
    .lineTo(PAGE_W - MARGIN, y)
    .strokeColor(identity?.brand_color || '#dddddd')
    .lineWidth(1.5)
    .stroke();
  doc.restore();
  y += 12;

  return y; // return Y position after header
}

/**
 * Draw the info box (right side) with date, ref, client ref, email, phone, notes.
 * Matches the mobile app format: bordered box with label-value rows.
 */
export function drawInfoBox(
  doc: PDFKit.PDFDocument,
  y: number,
  rows: Array<{ label: string; value: string }>,
): number {
  const boxX = 320;
  const boxW = PAGE_W - MARGIN - boxX;
  const rowH = 16;
  const padding = 8;
  const boxH = padding * 2 + rows.length * rowH;

  // Box border
  doc.rect(boxX, y, boxW, boxH).stroke('#cccccc');

  let rowY = y + padding;
  for (const row of rows) {
    // lineBreak: false on both cells: prevents cursor advancing after the label draw
    // which would push the value draw to the wrong y on the next PDFKit internal tick.
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
      .text(row.label, boxX + padding, rowY, { width: 100, lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#111111')
      .text(row.value || '—', boxX + padding + 100, rowY,
        { width: boxW - padding * 2 - 100, align: 'right', lineBreak: false });
    rowY += rowH;
  }

  return y + boxH + 10;
}

/**
 * Draw "To" client section (left side, alongside the info box above).
 */
export function drawClientSection(
  doc: PDFKit.PDFDocument,
  y: number,
  client: { name?: string; company?: string; address?: string; phone?: string; email?: string },
): void {
  // Width 260 keeps text within the left column (col1=40 to col2=280 gap),
  // preventing overlap with the info box. lineBreak: false prevents cursor drift.
  const COL_W = 260;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666')
    .text('To', MARGIN, y, { lineBreak: false });
  let cy = y + 14;
  doc.fontSize(10).font('Helvetica').fillColor('#111111');
  if (client.name)    { doc.text(client.name,    MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.company) { doc.text(client.company, MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.address) {
    const lines = client.address.split('\n');
    for (const line of lines) {
      if (line.trim()) { doc.text(line.trim(), MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
    }
  }
  if (client.phone) { doc.text(client.phone, MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.email) { doc.text(client.email, MARGIN, cy, { width: COL_W, lineBreak: false }); }
}

/**
 * Draw line items table matching the mobile app format.
 * Columns: Description | Unit | Qty | Price | Total
 *
 * IMPORTANT: All doc.text() calls use `lineBreak: false` to prevent PDFKit from
 * advancing the Y cursor after each column cell. Without this, subsequent same-row
 * columns that share the same Y coordinate cause PDFKit to enter a bad state —
 * especially when a doc.image() call (logo) preceded the table and left the internal
 * cursor at a different position.
 *
 * Architecture (Android PdfGenerator.kt parity):
 * - NO doc.save()/doc.restore() wrapper — save/restore are per PDF content-stream and
 *   MUST be balanced within a single page. Wrapping a function that calls doc.addPage()
 *   produces unbalanced Q operators (PDF spec violation; some readers reject the file).
 * - opts.onBeforePageBreak fires BEFORE doc.addPage() so the caller can draw the
 *   footer and update the page counter. drawItemsTable calls doc.addPage() itself.
 */
export function drawItemsTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  items: Array<{ description: string; unit: string; qty: number; price: number; total: number }>,
  brandColor: string,
  currencyCode?: string | null,
  opts?: {
    /**
     * Called just before doc.addPage() when a row overflows the footer zone.
     * Draw the footer bar and increment the page counter here.
     * Do NOT call doc.addPage() inside this callback — drawItemsTable does that.
     */
    onBeforePageBreak?: () => void;
  },
): number {
  const col1    = MARGIN;            // 40 — description
  const col2    = 280;               // unit
  const col3    = 340;               // qty
  const col4    = 400;               // price
  const colEnd  = PAGE_W - MARGIN;  // 555.28 — right edge
  const headerH = 22;
  const rowH    = 26;

  let y = startY;
  let pageStartY = startY; // tracks outer-border start per page section

  // ── Inner: draw branded table header ──────────────────────────────────────
  function drawTableHeader(atY: number): number {
    doc.rect(col1, atY, CONTENT_W, headerH).fill(brandColor || '#1e40af');
    // Explicit fillColor reset after rect.fill() — brand color must not leak to cells
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Description',  col1 + 8,    atY + 7, { lineBreak: false });
    doc.text('Unit',         col2,        atY + 7, { width: 50, align: 'center', lineBreak: false });
    doc.text('Qty',          col3,        atY + 7, { width: 50, align: 'center', lineBreak: false });
    doc.text('Price',        col4,        atY + 7, { width: 60, align: 'right',  lineBreak: false });
    doc.text('Total',        colEnd - 70, atY + 7, { width: 60, align: 'right',  lineBreak: false });
    doc.moveTo(col1, atY).lineTo(colEnd, atY).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.moveTo(col1, atY + headerH).lineTo(colEnd, atY + headerH).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.fillColor('#222222'); // reset fill so first data row renders correctly
    return atY + headerH;
  }

  y = drawTableHeader(y);

  for (const item of items) {
    // Evaluate safe-bottom live each row (same for all A4 pages, but correct practice)
    const safeBottom = doc.page.height - 110; // footer zone (100pt) + 10pt buffer

    if (y + rowH > safeBottom) {
      // Close outer border on the current page before leaving it
      doc.rect(col1, pageStartY, CONTENT_W, y - pageStartY)
        .strokeColor('#dddddd').lineWidth(0.5).stroke();

      // Caller finalises current page (footer + page number) — must NOT call addPage
      opts?.onBeforePageBreak?.();

      doc.addPage();
      y = MARGIN;
      pageStartY = y;
      y = drawTableHeader(y);
    }

    doc.moveTo(col1, y + rowH).lineTo(colEnd, y + rowH)
      .strokeColor('#eeeeee').lineWidth(0.5).stroke();

    const qtyDisplay = Number.isInteger(item.qty)
      ? String(item.qty)
      : item.qty.toFixed(2);

    // Every cell: explicit font + fillColor to prevent brand-color state leakage
    doc.fontSize(9).font('Helvetica').fillColor('#222222')
      .text(item.description, col1 + 8, y + 7, { width: col2 - col1 - 16, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(item.unit || '', col2, y + 7, { width: 50, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(qtyDisplay, col3, y + 7, { width: 50, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(fmtCur(item.price, currencyCode), col4, y + 7, { width: 60, align: 'right', lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111')
      .text(fmtCur(item.total, currencyCode), colEnd - 70, y + 7, { width: 60, align: 'right', lineBreak: false });

    y += rowH;
  }

  // Close outer border on the last (or only) page section
  doc.rect(col1, pageStartY, CONTENT_W, y - pageStartY)
    .strokeColor('#dddddd').lineWidth(0.5).stroke();

  return y;
}

/**
 * Draw subtotal/total box (right-aligned, matches screenshot).
 */
export function drawTotalsBox(
  doc: PDFKit.PDFDocument,
  y: number,
  rows: Array<{ label: string; value: string; bold?: boolean }>,
): number {
  const boxX = 380;
  const boxW = PAGE_W - MARGIN - boxX;
  const rowH = 18;
  const padY = 6;

  doc.rect(boxX, y, boxW, padY * 2 + rows.length * rowH).stroke('#cccccc');

  let rowY = y + padY;
  for (const row of rows) {
    const font = row.bold ? 'Helvetica-Bold' : 'Helvetica';
    const fontSize = row.bold ? 10 : 9;
    if (row.bold) {
      doc.moveTo(boxX, rowY - 2).lineTo(boxX + boxW, rowY - 2).strokeColor('#cccccc').lineWidth(0.5).stroke();
    }
    doc.fontSize(fontSize).font(font).fillColor('#333333')
      .text(row.label, boxX + 8, rowY, { lineBreak: false });
    doc.fontSize(fontSize).font(font).fillColor('#333333')
      .text(row.value, boxX + 8, rowY, { width: boxW - 16, align: 'right', lineBreak: false });
    rowY += rowH;
  }

  return y + padY * 2 + rows.length * rowH + 10;
}

/**
 * Draw NOTES section.
 */
/**
 * Returns the estimated height of a notes section box without drawing it.
 * Use this for page-break-before checks in the route.
 */
export function notesBoxHeight(
  doc: PDFKit.PDFDocument,
  notes: string,
): number {
  if (!notes) return 0;
  const padX = 10;
  const padY = 8;
  const textH = doc.heightOfString(notes, { width: CONTENT_W - padX * 2 });
  return padY + 16 + textH + padY + 16; // box + bottom gap
}

export function drawNotesSection(
  doc: PDFKit.PDFDocument,
  y: number,
  notes: string,
): number {
  if (!notes) return y;
  // Page-break guard removed — caller (route) is responsible for checking
  // safeBottom before calling this function and adding a new page if needed.

  const padX = 10;
  const padY = 8;
  const maxW = CONTENT_W;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#cc8800')
    .text('NOTES', MARGIN + padX, y + padY, { lineBreak: false });
  const textY = y + padY + 16;
  doc.fontSize(9).font('Helvetica').fillColor('#333333')
    .text(notes, MARGIN + padX, textY, { width: maxW - padX * 2 });
  const textH = doc.heightOfString(notes, { width: maxW - padX * 2 });
  const boxH = padY + 16 + textH + padY;

  doc.rect(MARGIN, y, maxW, boxH).strokeColor('#e5e5e5').lineWidth(0.5).stroke();

  return y + boxH + 16;
}

/**
 * Draw Contact Details + Payment Details footer bar.
 * Matches the mobile app format: two columns at the bottom of the page.
 */
/**
 * The reserved vertical space at the bottom of each page for the footer bar.
 * Body content must stop at (page.height - FOOTER_RESERVED) to avoid overlap.
 * Route and drawItemsTable both use this value for page-break guards.
 */
export const FOOTER_RESERVED = 110; // 100pt bar + 10pt buffer

export function drawFooterBar(
  doc: PDFKit.PDFDocument,
  identity: PdfIdentity | null,
): void {
  // Compute contact + payment line arrays first so we can size the bar dynamically.
  const contactLines: string[] = [
    identity?.contact_name,
    identity?.trading_name || identity?.company_name,
    identity?.address_line_1,
    identity?.address_line_2 || null,
    [identity?.city, identity?.postcode].filter(Boolean).join('  ') || null,
    identity?.email,
    identity?.phone,
    // Company No and VAT No appear in the top-right info box; omit here to avoid
    // duplication and to keep the footer bar height manageable.
  ].filter((v): v is string => !!v);

  const paymentLines: string[] = [
    identity?.account_name ? `Account Name: ${identity.account_name}` : null,
    identity?.bank_name ? `Bank: ${identity.bank_name}` : null,
    identity?.sort_code ? `Sort Code: ${identity.sort_code}` : null,
    identity?.account_number ? `Account: ${identity.account_number}` : null,
    identity?.iban ? `IBAN: ${identity.iban}` : null,
    identity?.swift_bic ? `SWIFT/BIC: ${identity.swift_bic}` : null,
    identity?.routing_number ? `Routing: ${identity.routing_number}` : null,
  ].filter((v): v is string => !!v);

  // Bar height: header line (8pt bold + 12pt gap) + data lines (9pt each) + top/bottom padding
  const LINE_H = 9;
  const maxLines = Math.max(contactLines.length, paymentLines.length);
  const barH = Math.max(70, 8 + 12 + maxLines * LINE_H + 8); // min 70pt
  const footerY = doc.page.height - barH - 10; // 10pt gap from bottom
  const halfW = CONTENT_W / 2;

  // Background bar
  doc.rect(MARGIN, footerY, CONTENT_W, barH).fill('#f8f8f8');
  doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY)
    .strokeColor('#dddddd').lineWidth(0.5).stroke();

  // Contact Details (left)
  let ly = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333')
    .text('Contact Details', MARGIN + 10, ly, { lineBreak: false });
  ly += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  for (const line of contactLines) {
    doc.text(line, MARGIN + 10, ly, { width: halfW - 20, lineBreak: false });
    ly += LINE_H;
  }

  // Payment Details (right)
  let ry = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333')
    .text('Payment Details', MARGIN + halfW + 10, ry, { lineBreak: false });
  ry += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  for (const line of paymentLines) {
    doc.text(line, MARGIN + halfW + 10, ry, { width: halfW - 20, lineBreak: false });
    ry += LINE_H;
  }
}

/**
 * Draw page number at bottom right.
 * Called once per page after footer bar — positioned below the footer bar.
 */
export function drawPageNumber(
  doc: PDFKit.PDFDocument,
  pageNum: number,
): void {
  doc.fontSize(7).font('Helvetica').fillColor('#999999')
    .text(`Page ${pageNum}`, MARGIN, doc.page.height - 14, { width: CONTENT_W, align: 'right', lineBreak: false });
}

/**
 * Draw a diagonal "TISSCA" watermark across the page.
 * Used for free-tier PDFs.
 */
export function drawWatermark(doc: PDFKit.PDFDocument): void {
  doc.save();
  doc.opacity(0.06);
  doc.fontSize(90).font('Helvetica-Bold').fillColor('#000000');
  doc.translate(PAGE_W / 2, doc.page.height / 2);
  doc.rotate(-45, { origin: [0, 0] });
  doc.text('TISSCA', -180, -40);
  doc.restore();
}

export { MARGIN, PAGE_W, CONTENT_W };
