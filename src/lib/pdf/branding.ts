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

  // Pre-fetch logo image if URL exists
  if (identity.logo_url) {
    try {
      const res = await fetch(identity.logo_url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        identity._logoBuffer = Buffer.from(arrayBuffer);
      }
    } catch {
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
    } catch {
      // Fallback to text if image fails
      doc.fontSize(18).font('Helvetica-Bold').fillColor(identity?.brand_color || '#1e40af')
        .text(identity?.company_name || 'TISSCA', MARGIN, y + 10);
    }
  } else if (identity?.company_name) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor(identity.brand_color || '#1e40af')
      .text(identity.company_name, MARGIN, y + 10);
  } else {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e40af')
      .text('TISSCA', MARGIN, y + 10);
  }

  // Document type title (right-aligned)
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#111111')
    .text(docType, MARGIN, y + 5, { width: CONTENT_W, align: 'right' });

  y += 55;

  // Company name + tagline below logo (if logo exists)
  if (identity?._logoBuffer && identity?.company_name) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
      .text(identity.company_name.toUpperCase(), MARGIN, y);
    y += 16;
  }
  if (identity?.tagline) {
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(identity.tagline, MARGIN, y);
    y += 14;
  }

  y += 8;
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
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
      .text(row.label, boxX + padding, rowY, { width: 100 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#111111')
      .text(row.value || '—', boxX + padding + 100, rowY, { width: boxW - padding * 2 - 100, align: 'right' });
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
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666').text('To', MARGIN, y);
  let cy = y + 14;
  doc.fontSize(10).font('Helvetica').fillColor('#111111');
  if (client.name) { doc.text(client.name, MARGIN, cy); cy += 14; }
  if (client.company) { doc.text(client.company, MARGIN, cy); cy += 14; }
  if (client.address) {
    const lines = client.address.split('\n');
    for (const line of lines) {
      if (line.trim()) { doc.text(line.trim(), MARGIN, cy); cy += 14; }
    }
  }
  if (client.phone) { doc.text(client.phone, MARGIN, cy); cy += 14; }
  if (client.email) { doc.text(client.email, MARGIN, cy); }
}

/**
 * Draw line items table matching the mobile app format.
 * Columns: Description | Unit | Qty | Price | Total
 */
export function drawItemsTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  items: Array<{ description: string; unit: string; qty: number; price: number; total: number }>,
  _brandColor: string,
  currencyCode?: string | null,
): number {
  const col1 = MARGIN;
  const col2 = 280;
  const col3 = 340;
  const col4 = 400;
  const col5 = PAGE_W - MARGIN;
  let y = startY;

  // Header row
  const headerH = 22;
  doc.rect(col1, y, CONTENT_W, headerH).fill('#f5f5f5');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  doc.text('Description', col1 + 8, y + 6);
  doc.text('Unit', col2, y + 6, { width: 50, align: 'center' });
  doc.text('Qty', col3, y + 6, { width: 50, align: 'center' });
  doc.text('Price', col4, y + 6, { width: 60, align: 'right' });
  doc.text('Total', col5 - 70, y + 6, { width: 60, align: 'right' });

  // Lines
  doc.moveTo(col1, y).lineTo(PAGE_W - MARGIN, y).stroke('#dddddd');
  doc.moveTo(col1, y + headerH).lineTo(PAGE_W - MARGIN, y + headerH).stroke('#dddddd');

  y += headerH;
  const rowH = 26;

  for (const item of items) {
    if (y > 720) {
      doc.addPage();
      y = 40;
    }

    // Row border
    doc.moveTo(col1, y + rowH).lineTo(PAGE_W - MARGIN, y + rowH).stroke('#eeeeee');

    doc.fontSize(9).font('Helvetica').fillColor('#222222')
      .text(item.description, col1 + 8, y + 7, { width: col2 - col1 - 16 });
    doc.fillColor('#666666')
      .text(item.unit, col2, y + 7, { width: 50, align: 'center' });
    doc.text(String(item.qty), col3, y + 7, { width: 50, align: 'center' });
    doc.text(fmtCur(item.price, currencyCode), col4, y + 7, { width: 60, align: 'right' });
    doc.font('Helvetica-Bold').fillColor('#111111')
      .text(fmtCur(item.total, currencyCode), col5 - 70, y + 7, { width: 60, align: 'right' });

    y += rowH;
  }

  // Outer border
  doc.rect(col1, startY, CONTENT_W, y - startY).stroke('#dddddd');

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
    doc.fontSize(fontSize).font(font).fillColor('#333333')
      .text(row.label, boxX + 8, rowY);
    doc.text(row.value, boxX + 8, rowY, { width: boxW - 16, align: 'right' });
    if (row.bold) {
      // Draw separator above bold line
      doc.moveTo(boxX, rowY - 2).lineTo(boxX + boxW, rowY - 2).stroke('#cccccc');
    }
    rowY += rowH;
  }

  return y + padY * 2 + rows.length * rowH + 10;
}

/**
 * Draw NOTES section.
 */
export function drawNotesSection(
  doc: PDFKit.PDFDocument,
  y: number,
  notes: string,
): number {
  if (!notes) return y;
  if (y > 680) { doc.addPage(); y = 40; }

  const padX = 10;
  const padY = 8;
  const maxW = CONTENT_W;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#cc8800').text('NOTES', MARGIN + padX, y + padY);
  const textY = y + padY + 16;
  doc.fontSize(9).font('Helvetica').fillColor('#333333')
    .text(notes, MARGIN + padX, textY, { width: maxW - padX * 2 });
  const textH = doc.heightOfString(notes, { width: maxW - padX * 2 });
  const boxH = padY + 16 + textH + padY;

  doc.rect(MARGIN, y, maxW, boxH).stroke('#e5e5e5');

  return y + boxH + 16;
}

/**
 * Draw Contact Details + Payment Details footer bar.
 * Matches the mobile app format: two columns at the bottom of the page.
 */
export function drawFooterBar(
  doc: PDFKit.PDFDocument,
  identity: PdfIdentity | null,
): void {
  const footerY = doc.page.height - 100;
  const halfW = CONTENT_W / 2;

  // Background bar
  doc.rect(MARGIN, footerY, CONTENT_W, 70).fill('#f8f8f8');
  doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY).stroke('#dddddd');

  // Contact Details (left)
  let ly = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333').text('Contact Details', MARGIN + 10, ly);
  ly += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  const contactLines = [
    identity?.contact_name,
    identity?.trading_name || identity?.company_name,
    identity?.address_line_1,
    [identity?.city, identity?.postcode].filter(Boolean).join('  '),
    identity?.email,
    identity?.phone,
  ].filter(Boolean);
  for (const line of contactLines) {
    doc.text(line!, MARGIN + 10, ly, { width: halfW - 20 });
    ly += 9;
  }

  // Payment Details (right)
  let ry = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333').text('Payment Details', MARGIN + halfW + 10, ry);
  ry += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  const paymentLines = [
    identity?.account_name ? `Account Name: ${identity.account_name}` : null,
    identity?.bank_name ? `Bank: ${identity.bank_name}` : null,
    identity?.sort_code ? `Sort Code: ${identity.sort_code}` : null,
    identity?.account_number ? `Account: ${identity.account_number}` : null,
    identity?.iban ? `IBAN: ${identity.iban}` : null,
    identity?.swift_bic ? `SWIFT/BIC: ${identity.swift_bic}` : null,
    identity?.routing_number ? `Routing: ${identity.routing_number}` : null,
  ].filter(Boolean);
  for (const line of paymentLines) {
    doc.text(line!, MARGIN + halfW + 10, ry, { width: halfW - 20 });
    ry += 9;
  }
}

/**
 * Draw page number at bottom right.
 */
export function drawPageNumber(
  doc: PDFKit.PDFDocument,
  pageNum: number,
  _totalPages: number,
): void {
  doc.fontSize(7).font('Helvetica').fillColor('#999999')
    .text(`Page ${pageNum}`, MARGIN, doc.page.height - 20, { width: CONTENT_W, align: 'right' });
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
