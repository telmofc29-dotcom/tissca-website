// src/lib/pdf/branding.ts
//
// Shared PDF branding helpers used by all PDF generators
// (quotes, invoices, layout quotes). Fetches DocumentPdfInfo
// from Supabase and renders consistent branded headers/footers.

import { createServerSupabaseClient } from '@/lib/supabase';
import type { DocumentPdfInfo } from '@/app/api/workspace/document-pdf-info/route';

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

// ─────────────────────────────────────────────────────────────────────────────
// PDF Drawing Helpers — Direct behavioural port of Android PdfGenerator.kt v3.11.0
//
// Source of truth: docs/audit/android-pdf-rendering-contract.md (Android repo)
// Every constant, font size, coordinate, and overflow rule below is derived
// from the contract — DO NOT change values without a corresponding change in
// PdfGenerator.kt + the contract document.
// ─────────────────────────────────────────────────────────────────────────────

// ── Page geometry (contract §2.1) ────────────────────────────────────────────
const PAGE_W       = 595;   // A4 width in points
const PAGE_H       = 842;   // A4 height in points
const MARGIN       = 40;    // left edge (contract: `left = 40f`)
const RIGHT        = 555;   // right edge (PAGE_W - MARGIN)
const CONTENT_W    = 515;   // RIGHT - MARGIN
const LINE_HEIGHT  = 16;    // contract: `lineHeight = 16f`
const FOOTER_TOP   = 752;   // contract: `footerTop = 842 - 90`
const FOOTER_HEIGHT = 120;  // contract: `footerHeight = 120f`
const BOTTOM_LIMIT = 722;   // contract: `bottomLimit = 842 - 120` — page-break trigger

// ── Colours (contract §3.1) ──────────────────────────────────────────────────
const COLOR_TEXT          = '#000000';
const COLOR_GREY_BG       = '#F2F2F2';  // info box, totals box, notes box
const COLOR_TABLE_HEADER  = '#F0F0F0';  // table header row background
const COLOR_LINE          = '#D5D5D5';  // dividers, footer divider

// ── Font sizes (contract §3.1) ───────────────────────────────────────────────
const FONT_TITLE  = 26;
const FONT_LABEL  = 12;  // bold — section headers, column headers, Total/Balance rows
const FONT_BODY   = 12;  // normal — client name/address, table cells, notes body
const FONT_SMALL  = 10;  // normal — info box rows, footer lines, page number, sub-total rows

// ── Public re-exports (some routes import these directly) ────────────────────
export { MARGIN, PAGE_W, PAGE_H, CONTENT_W, FOOTER_TOP, FOOTER_HEIGHT, BOTTOM_LIMIT };

// ─────────────────────────────────────────────────────────────────────────────
// Text options preset.
//
// Android `Canvas.drawText(s, x, y, paint)` treats `y` as the alphabetic
// baseline of the glyphs. PDFKit's `doc.text(s, x, y)` defaults to treating
// `y` as the TOP of the bounding box, which shifts every line down by one
// ascender's worth (~9pt for 12pt Helvetica). Without correction, item-row
// dividers cut through text descenders and all blocks render ~ascender-pt
// too low compared to Android.
//
// `baseline: 'alphabetic'` makes PDFKit interpret `y` as the alphabetic
// baseline, exactly matching Android. Every Y coordinate in this module is
// therefore literal from the contract — no offset conversion needed.
// ─────────────────────────────────────────────────────────────────────────────
const TX_OPTS = { lineBreak: false, baseline: 'alphabetic' } as unknown as PDFKit.Mixins.TextOptions;

/**
 * Legacy export used by document route's page-break guards.
 * Equivalent of `(page.height - BOTTOM_LIMIT) = 120` — the reserved footer zone.
 * @deprecated Prefer `BOTTOM_LIMIT` for new code (matches Android contract naming).
 */
export const FOOTER_RESERVED = FOOTER_HEIGHT;

// ─────────────────────────────────────────────────────────────────────────────
// Money + Quantity formatting (contract §13)
// Contract: `"{symbol}{value:.2f}"` with Locale.UK — NO thousands separator
// ─────────────────────────────────────────────────────────────────────────────
function currencySymbolFor(code?: string | null): string {
  const c = (code ?? 'GBP').toUpperCase();
  if (c === 'GBP') return '£';
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  return c; // unknown → render code itself per contract
}

/**
 * Contract-spec money formatter — NO thousands separator, 2dp, Locale.UK decimal.
 * Examples: `£1234.56`, `€1234.56`, `$1234.56`.
 * Differs from the general-purpose `formatCurrency` in @/lib/currency
 * which uses toLocaleString and DOES insert thousands separators.
 */
function formatMoney(value: number, code?: string | null): string {
  return `${currencySymbolFor(code)}${value.toFixed(2)}`;
}

/** Contract-spec qty formatter — integer if whole, 2dp otherwise. */
function formatQty(value: number): string {
  return value % 1 === 0 ? String(Math.trunc(value)) : value.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Watermark (contract §8) — HORIZONTAL, no rotation
// ─────────────────────────────────────────────────────────────────────────────
export function drawWatermark(doc: PDFKit.PDFDocument): void {
  doc.save();
  // Alpha 44/255 ≈ 0.1725 (contract line 883)
  doc.opacity(44 / 255);
  doc.fontSize(120).font('Helvetica-Bold').fillColor(COLOR_TEXT);
  // Contract: centre at (pageWidth/2, pageHeight/2) = (297.5, 421), no rotate()
  // Android `Paint.Align.CENTER` + `drawText` uses the baseline as y. We use
  // PDFKit's `{ baseline: 'alphabetic' }` to align our y with the glyph
  // baseline, exactly matching Android's geometry.
  const textW = doc.widthOfString('TISSCA');
  doc.text('TISSCA', PAGE_W / 2 - textW / 2, PAGE_H / 2, TX_OPTS);
  doc.opacity(1);
  doc.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Header section (contract §1.1 steps 2-5 + §2.2)
// Returns `headerBottomY` — used by overflow handlers to place repositioned
// content (`max(200, hb + 24)`) on continuation pages.
// ─────────────────────────────────────────────────────────────────────────────
type ClientBlock = {
  name?: string | null;
  address?: string | null;     // newline-separated lines; first 4 used
  phone?: string | null;       // not rendered in "To:" — appears in info box
  email?: string | null;       // not rendered in "To:" — appears in info box
};

export function drawBrandedHeader(
  doc: PDFKit.PDFDocument,
  identity: PdfIdentity | null,
  docType: 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION',
  client?: ClientBlock,
): number {
  // ── Logo (contract §2.2) ───────────────────────────────────────────────────
  // Position: top-left at (40, 30). Max 210 × 90. Scale algorithm:
  //   scaleByHeight = 90 / bitmap.height
  //   if (scaledWidthByHeight > 210) finalScale = 210 / bitmap.width
  //   else                            finalScale = scaleByHeight
  let logoBottomY = 30; // default when no logo (contract line 927)
  if (identity?._logoBuffer) {
    try {
      // PDFKit's doc.image({ fit: [w, h] }) scales to fit within the bounding box
      // preserving aspect ratio — equivalent to Android's height-first/width-clamp
      // algorithm because both axes are independently bounded.
      doc.image(identity._logoBuffer, MARGIN, 30, { fit: [210, 90] });
      // We cannot easily read the rendered dimensions back from PDFKit, so use
      // a conservative estimate: assume the logo used its full max height (90pt).
      logoBottomY = 30 + 90;
    } catch (err) {
      console.warn('[drawBrandedHeader] doc.image() failed — logo may be WebP or corrupt:', err);
    }
  }

  // ── Document title (contract §2.2 + §3.2: titlePaint 26pt bold, right-aligned) ──
  doc.fontSize(FONT_TITLE).font('Helvetica-Bold').fillColor(COLOR_TEXT);
  const titleW = doc.widthOfString(docType);
  doc.text(docType, RIGHT - titleW, 70, TX_OPTS);

  // ── "To:" block (contract §2.2) ────────────────────────────────────────────
  // Start y = max(130, logoBottomY + 28); body starts at +16; lines step 14; max 4 lines
  const toLabelY = Math.max(130, logoBottomY + 28);
  doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT)
    .text('To', MARGIN, toLabelY, TX_OPTS);

  let toBodyY = toLabelY + 16;
  doc.fontSize(FONT_BODY).font('Helvetica').fillColor(COLOR_TEXT);
  if (client?.name) {
    doc.text(client.name, MARGIN, toBodyY, { ...TX_OPTS, width: 260 });
    toBodyY += 14;
  }
  if (client?.address) {
    const lines = client.address.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4);
    for (const line of lines) {
      doc.text(line, MARGIN, toBodyY, { ...TX_OPTS, width: 260 });
      toBodyY += 14;
    }
  }

  // headerBottomY = the lower of (logoBottomY) and (last "To:" line y)
  return Math.max(logoBottomY, toBodyY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Box (contract §2.3) — top-right grey rounded rect, 220pt × dynamic
// `headerNotes` is rendered INSIDE this box per contract §11 (header channel).
// ─────────────────────────────────────────────────────────────────────────────
type InfoRow = { label: string; value: string };

export function drawInfoBox(
  doc: PDFKit.PDFDocument,
  yIgnored: number,             // kept for API compat — actual y is fixed at 105
  rows: InfoRow[],
  headerNotes?: string | null,
): number {
  // Suppress unused warning while preserving the public signature.
  void yIgnored;

  const boxWidth = 220;
  const boxLeft  = RIGHT - boxWidth; // 335
  const boxTop   = 105;              // contract line 985
  const rowStep  = 14;
  const topPad   = 18;
  const botPad   = 8;

  // ── Header notes wrapping (smallPaint 10pt, wrap at boxWidth - 20) ─────────
  const cleanNotes = (headerNotes ?? '').trim();
  let notesLines: string[] = [];
  let notesBlockH = 0;
  if (cleanNotes) {
    doc.fontSize(FONT_SMALL).font('Helvetica');
    notesLines = wrapText(doc, cleanNotes, boxWidth - 20);
    const notesHeadingH = 14;          // contract line 1001
    const notesLineStep = 12;          // contract line 1002
    const notesBottomPad = 6;          // contract line 1005
    notesBlockH = notesHeadingH + notesLines.length * notesLineStep + notesBottomPad;
  }

  // Base height + notes block (contract line 990)
  const baseH = topPad + rows.length * rowStep + botPad;
  const boxH  = baseH + notesBlockH;

  // ── Rounded grey rect (contract: cornerRadius 6, infoBoxPaint #F2F2F2) ────
  doc.save();
  doc.roundedRect(boxLeft, boxTop, boxWidth, boxH, 6).fill(COLOR_GREY_BG);
  doc.restore();

  // ── Label/value rows (smallPaint 10pt, label left, value right-aligned) ───
  let infoY = boxTop + topPad;
  for (const row of rows) {
    doc.fontSize(FONT_SMALL).font('Helvetica').fillColor(COLOR_TEXT);
    doc.text(row.label, boxLeft + 10, infoY, { ...TX_OPTS, width: 100 });
    const valStr = row.value || '—';
    const valW   = doc.widthOfString(valStr);
    doc.text(valStr, RIGHT - 10 - valW, infoY, TX_OPTS);
    infoY += rowStep;
  }

  // ── Header notes inside info box (contract lines 1027-1033) ────────────────
  if (cleanNotes) {
    infoY += 2; // contract line 1027
    doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT)
      .text('Notes', boxLeft + 10, infoY, TX_OPTS);
    infoY += 14;
    doc.fontSize(FONT_SMALL).font('Helvetica').fillColor(COLOR_TEXT);
    for (const line of notesLines) {
      doc.text(line, boxLeft + 10, infoY, TX_OPTS);
      infoY += 12;
    }
  }

  return boxTop + boxH;
}

/**
 * Backward-compat wrapper for routes that draw the "To:" block separately.
 * The new contract-pure header (`drawBrandedHeader` with `client` param) renders
 * the "To:" block itself. This stub is a no-op — kept so external callers do
 * not break during the migration.
 * @deprecated Pass `client` to `drawBrandedHeader` instead.
 */
export function drawClientSection(
  _doc: PDFKit.PDFDocument,
  _y: number,
  _client: { name?: string; company?: string; address?: string; phone?: string; email?: string },
): void {
  // intentionally empty — see jsdoc above
}

// ─────────────────────────────────────────────────────────────────────────────
// Text wrapping (contract §4.3) — used by description column + notes
// Word-split by space, build line while measureText(candidate) <= maxWidth.
// Single long words exceed width without character break (contract spec).
// ─────────────────────────────────────────────────────────────────────────────
function wrapText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${line} ${words[i]}`;
      if (doc.widthOfString(candidate) <= maxWidth) {
        line = candidate;
      } else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table (contract §2.4 + §2.5 + §4)
// Columns (all LEFT-aligned per contract §4.2):
//   Description 45% w=231.75 x=46
//   Unit        12% w=61.8  x=277.75
//   Qty         10% w=51.5  x=339.55
//   Price       15% w=77.25 x=391.05
//   Total       18% w=92.7  x=468.3
// ─────────────────────────────────────────────────────────────────────────────
const COL = {
  descX:  46,
  unitX:  277.75,
  qtyX:   339.55,
  priceX: 391.05,
  totalX: 468.3,
  descWidth: 231.75,
} as const;

const TABLE_HEADER_H = 24;  // contract line 1041

export function drawTableHeader(doc: PDFKit.PDFDocument, startY: number): number {
  // Background (contract: tableHeaderPaint #F0F0F0)
  doc.save();
  doc.rect(MARGIN, startY, CONTENT_W, TABLE_HEADER_H).fill(COLOR_TABLE_HEADER);
  doc.restore();

  // Column header text (labelPaint 12pt bold, y = startY + 16 per contract line 1045)
  doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT);
  const textY = startY + 16;
  doc.text('Description', COL.descX,  textY, TX_OPTS);
  doc.text('Unit',        COL.unitX,  textY, TX_OPTS);
  doc.text('Qty',         COL.qtyX,   textY, TX_OPTS);
  doc.text('Price',       COL.priceX, textY, TX_OPTS);
  doc.text('Total',       COL.totalX, textY, TX_OPTS);

  // Return y after header + 6pt gap (contract: startY + 24 + 6 = startY + 30)
  return startY + TABLE_HEADER_H + 6;
}

/**
 * Draw a single item row at the given y.
 * Returns the new y (after the row + 6pt divider gap).
 * Caller is responsible for the page-break check BEFORE invoking this.
 */
function drawItemRow(
  doc: PDFKit.PDFDocument,
  y: number,
  item: { description: string; unit: string; qty: number; price: number; total: number },
  currencyCode: string | null,
): number {
  // Description wraps (contract §4.3): wrap width = descWidth - 12 = 219.75
  doc.fontSize(FONT_BODY).font('Helvetica').fillColor(COLOR_TEXT);
  const descLines = wrapText(doc, item.description || '', COL.descWidth - 12);
  const rowHeight = Math.max(descLines.length * LINE_HEIGHT, LINE_HEIGHT);

  // Description: multi-line, each line at y + (i+1)*16 - 4 (contract line 1080)
  descLines.forEach((line, i) => {
    doc.text(line, COL.descX, y + (i + 1) * LINE_HEIGHT - 4, TX_OPTS);
  });

  // Other columns: single line at y + 16 - 4 = y + 12 (contract line 1084)
  const cellY = y + LINE_HEIGHT - 4;
  doc.text(item.unit || '', COL.unitX,  cellY, TX_OPTS);
  doc.text(formatQty(item.qty), COL.qtyX, cellY, TX_OPTS);
  doc.text(formatMoney(item.price, currencyCode), COL.priceX, cellY, TX_OPTS);
  doc.text(formatMoney(item.total, currencyCode), COL.totalX, cellY, TX_OPTS);

  // Row divider (contract lines 1091-1092)
  const dividerY = y + rowHeight;
  doc.save();
  doc.moveTo(MARGIN, dividerY).lineTo(RIGHT, dividerY)
    .strokeColor(COLOR_LINE).lineWidth(1).stroke();
  doc.restore();

  return dividerY + 6;
}

/**
 * Filter "totals-like" descriptions per contract §4.6.
 * If the resulting list is empty, returns a single "Service" placeholder.
 */
function filterAndGuardItems<T extends { description: string }>(
  items: T[],
  placeholder: () => T,
): T[] {
  const filtered = items.filter((it) => {
    const d = (it.description || '').trim().toLowerCase();
    if (!d) return false;
    if (d === 'subtotal' || d === 'total' || d === 'discount') return false;
    if (d.startsWith('vat') || d.startsWith('deposit') || d.startsWith('balance')) return false;
    return true;
  });
  return filtered.length > 0 ? filtered : [placeholder()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Totals Box (contract §2.6) — bottom-right grey rounded rect, 200pt wide
// ─────────────────────────────────────────────────────────────────────────────
type TotalsRow = { label: string; value: string; bold?: boolean };

export function drawTotalsBox(
  doc: PDFKit.PDFDocument,
  y: number,
  rows: TotalsRow[],
): number {
  const boxWidth = 200;
  const boxLeft  = RIGHT - boxWidth;   // 355
  const rowStep  = 14;
  const topPad   = 18;
  const botPad   = 10;
  const boxH     = topPad + rows.length * rowStep + botPad;

  // Rounded grey rect (contract: cornerRadius 6, infoBoxPaint #F2F2F2)
  doc.save();
  doc.roundedRect(boxLeft, y, boxWidth, boxH, 6).fill(COLOR_GREY_BG);
  doc.restore();

  let rowY = y + topPad;
  for (const row of rows) {
    const isBold = row.bold === true;
    const size = isBold ? FONT_LABEL : FONT_SMALL;
    const fnt  = isBold ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(size).font(fnt).fillColor(COLOR_TEXT);
    doc.text(row.label, boxLeft + 10, rowY, TX_OPTS);
    const valW = doc.widthOfString(row.value);
    doc.text(row.value, RIGHT - 10 - valW, rowY, TX_OPTS);
    rowY += rowStep;
  }

  return y + boxH;
}

/** Computes the height drawTotalsBox would produce — for overflow guards. */
export function totalsBoxHeight(rowCount: number): number {
  return 18 + rowCount * 14 + 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom NOTES box (contract §2.7) — full-width grey rounded rect
// ─────────────────────────────────────────────────────────────────────────────
const NOTES_WRAP_W = CONTENT_W - 20; // 495

/** Computes the height drawNotesBox would produce — for overflow guards. */
export function notesBoxHeight(doc: PDFKit.PDFDocument, notes: string): number {
  if (!notes || !notes.trim()) return 0;
  doc.fontSize(FONT_BODY).font('Helvetica');
  const lines = wrapText(doc, notes, NOTES_WRAP_W);
  return 12 + 16 + lines.length * 14 + 12; // contract line 1168
}

export function drawNotesSection(
  doc: PDFKit.PDFDocument,
  y: number,
  notes: string,
): number {
  if (!notes || !notes.trim()) return y;

  doc.fontSize(FONT_BODY).font('Helvetica');
  const lines = wrapText(doc, notes, NOTES_WRAP_W);
  const boxH  = 12 + 16 + lines.length * 14 + 12;

  // Rounded grey rect (contract lines 1187-1191)
  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 6).fill(COLOR_GREY_BG);
  doc.restore();

  // "NOTES" heading (labelPaint 12pt bold, all-caps) — contract line 1194
  doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT)
    .text('NOTES', MARGIN + 10, y + 18, TX_OPTS);

  // Body lines (bodyPaint 12pt, step 14) — contract lines 1196-1199
  let ny = y + 18 + 18;
  doc.fontSize(FONT_BODY).font('Helvetica').fillColor(COLOR_TEXT);
  for (const line of lines) {
    doc.text(line, MARGIN + 10, ny, TX_OPTS);
    ny += 14;
  }

  return y + boxH;
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer (contract §5) — divider + Contact Details (left) + Payment Details (right)
// Rendered on EVERY page including continuation pages.
// ─────────────────────────────────────────────────────────────────────────────
function contactLinesFromIdentity(identity: PdfIdentity | null, fallbackTitle: string): string[] {
  if (!identity) return [fallbackTitle];
  const id = identity as PdfIdentity & {
    country?: string | null;
    website?: string | null;
    county?: string | null;
  };
  const lines: string[] = [];
  lines.push(id.company_name || fallbackTitle);
  if (id.trading_name)   lines.push(id.trading_name);
  if (id.address_line_1) lines.push(id.address_line_1);
  if (id.address_line_2) lines.push(id.address_line_2);
  const cityLine = [id.city, id.county, id.postcode].filter(Boolean).join(' ');
  if (cityLine) lines.push(cityLine);
  if (id.country) lines.push(id.country);
  if (id.email)   lines.push(id.email);
  if (id.phone)   lines.push(id.phone);
  if (id.website) lines.push(id.website);
  if (id.vat_enabled && id.vat_number) lines.push(`VAT No: ${id.vat_number}`);
  return lines;
}

function paymentLinesFromIdentity(identity: PdfIdentity | null): string[] {
  if (!identity) return ['Bank: —', 'Sort Code: —', 'Account: —'];
  const lines: string[] = [];
  if (identity.account_name)   lines.push(`Account Name: ${identity.account_name}`);
  lines.push(`Bank: ${identity.bank_name || '—'}`);
  lines.push(`Sort Code: ${identity.sort_code || '—'}`);
  lines.push(`Account: ${identity.account_number || '—'}`);
  if (identity.iban)           lines.push(`IBAN: ${identity.iban}`);
  if (identity.swift_bic)      lines.push(`SWIFT/BIC: ${identity.swift_bic}`);
  if (identity.routing_number) lines.push(`Routing: ${identity.routing_number}`);
  return lines;
}

export function drawFooterBar(
  doc: PDFKit.PDFDocument,
  identity: PdfIdentity | null,
  fallbackTitle = 'TISSCA',
): void {
  // Divider (contract: footerTop - 10 = 742)
  doc.save();
  doc.moveTo(MARGIN, FOOTER_TOP - 10).lineTo(RIGHT, FOOTER_TOP - 10)
    .strokeColor(COLOR_LINE).lineWidth(1).stroke();
  doc.restore();

  // Contact Details (left half)
  doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT)
    .text('Contact Details', MARGIN, FOOTER_TOP, TX_OPTS);
  let cy = FOOTER_TOP + 14;
  doc.fontSize(FONT_SMALL).font('Helvetica').fillColor(COLOR_TEXT);
  for (const line of contactLinesFromIdentity(identity, fallbackTitle)) {
    doc.text(line, MARGIN, cy, TX_OPTS);
    cy += 12;
  }

  // Payment Details (right half, x = left + contentWidth/2 = 297.5)
  const payX = MARGIN + CONTENT_W / 2;
  doc.fontSize(FONT_LABEL).font('Helvetica-Bold').fillColor(COLOR_TEXT)
    .text('Payment Details', payX, FOOTER_TOP, TX_OPTS);
  let py = FOOTER_TOP + 14;
  doc.fontSize(FONT_SMALL).font('Helvetica').fillColor(COLOR_TEXT);
  for (const line of paymentLinesFromIdentity(identity)) {
    doc.text(line, payX, py, TX_OPTS);
    py += 12;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page number (contract §5.5) — "Page N", smallPaint 10pt, right-aligned at y=822
// ─────────────────────────────────────────────────────────────────────────────
export function drawPageNumber(doc: PDFKit.PDFDocument, pageNum: number): void {
  doc.fontSize(FONT_SMALL).font('Helvetica').fillColor(COLOR_TEXT);
  const label = `Page ${pageNum}`;
  const w = doc.widthOfString(label);
  doc.text(label, RIGHT - w, PAGE_H - 20, TX_OPTS);
}

// ─────────────────────────────────────────────────────────────────────────────
// drawItemsTable — backward-compat wrapper that loops drawItemRow with the
// contract-spec page-break logic. Used by the legacy invoice/quote routes that
// don't migrate to renderPdfBody().
//
// Page-break rule (contract §4.5): check `y + rowHeight > BOTTOM_LIMIT (722)`
// BEFORE drawing the row; on overflow, fire opts.onBeforePageBreak (draws
// footer + increments page counter), addPage, redraw FULL header + table
// header on new page, then draw the overflow row.
// ─────────────────────────────────────────────────────────────────────────────
export function drawItemsTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  items: Array<{ description: string; unit: string; qty: number; price: number; total: number }>,
  _brandColor: string,
  currencyCode?: string | null,
  opts?: {
    onBeforePageBreak?: () => void;
    /**
     * Called AFTER addPage to redraw the full header (logo, title, To: block, info box)
     * on the continuation page per contract §1.2 step 5. Returns headerBottomY (hb).
     */
    onContinuationHeader?: () => number;
  },
): number {
  // Silence unused-param lint — brand colour is intentionally ignored per contract
  // (table header background is fixed #F0F0F0, not branded).
  void _brandColor;

  let y = drawTableHeader(doc, startY);

  for (const item of items) {
    doc.fontSize(FONT_BODY).font('Helvetica');
    const descLines = wrapText(doc, item.description || '', COL.descWidth - 12);
    const rowHeight = Math.max(descLines.length * LINE_HEIGHT, LINE_HEIGHT);

    if (y + rowHeight > BOTTOM_LIMIT) {
      opts?.onBeforePageBreak?.();
      doc.addPage();
      // Contract §1.2 step 5–6: redraw full header + table header on new page.
      const hb = opts?.onContinuationHeader?.() ?? MARGIN;
      y = drawTableHeader(doc, Math.max(200, hb + 24));
    }

    y = drawItemRow(doc, y, item, currencyCode ?? null);
  }

  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// renderPdfBody — single-entry orchestrator that mirrors Android generatePdf()
// All page-break, continuation-header, footer-on-every-page logic lives here.
// ─────────────────────────────────────────────────────────────────────────────
export type RenderInput = {
  identity: PdfIdentity | null;
  docType: 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION';
  /** Pro-tier flag — controls watermark (non-Pro) and logo rendering (Pro). */
  isProUser: boolean;
  /** Fallback used in footer when identity is null and for the watermark gate. */
  fallbackTitle?: string;
  client: ClientBlock;
  infoRows: InfoRow[];
  /** Header notes channel — appears INSIDE info box (contract §11). */
  headerNotes?: string | null;
  items: Array<{ description: string; unit: string; qty: number; price: number; total: number }>;
  totalsRows: TotalsRow[];
  /**
   * Bottom notes channel — appears in the bottom NOTES box (contract §11).
   * Caller is responsible for joining bottomNotes + userNotes + footerNotes.
   */
  bottomNotes?: string | null;
  currencyCode?: string | null;
};

/**
 * Render the complete PDF body to an open PDFDocument.
 * The caller owns the PDFDocument lifecycle (create, stream, end).
 *
 * Order of operations strictly follows contract §1.1:
 *   1. watermark (non-Pro only)
 *   2. logo + title + To: block (drawBrandedHeader)
 *   3. info box (right) — includes headerNotes inside
 *   4. table header + item rows (with continuation-page support)
 *   5. totals box (with overflow guard)
 *   6. bottom NOTES box (with overflow guard)
 *   7. footer on every page (drawn inline at page breaks + finalised on last page)
 *   8. page number on every page
 */
export function renderPdfBody(doc: PDFKit.PDFDocument, input: RenderInput): void {
  const {
    identity, docType, isProUser,
    fallbackTitle = identity?.company_name || 'TISSCA',
    client, infoRows, headerNotes,
    items, totalsRows, bottomNotes, currencyCode,
  } = input;

  // ── Filter totals-like descriptions + placeholder fallback (contract §4.6) ──
  const cleanItems = filterAndGuardItems(items, () => ({
    description: 'Service',
    unit: 'Unit',
    qty: 1,
    price: 0,
    total: 0,
  }));

  let pageNum = 1;

  // ── Per-page helpers ──────────────────────────────────────────────────────
  function drawWatermarkIfFree() {
    if (!isProUser) drawWatermark(doc);
  }

  function drawFullHeader(): number {
    drawWatermarkIfFree();
    const hb = drawBrandedHeader(doc, isProUser ? identity : null, docType, client);
    drawInfoBox(doc, 0, infoRows, headerNotes);
    return hb;
  }

  function finalisePage() {
    drawFooterBar(doc, identity, fallbackTitle);
    drawPageNumber(doc, pageNum);
  }

  function breakPage(): number {
    finalisePage();
    doc.addPage();
    pageNum++;
    return drawFullHeader();
  }

  // ── Page 1 ────────────────────────────────────────────────────────────────
  const headerBottomY = drawFullHeader();

  // ── Items table ───────────────────────────────────────────────────────────
  // Table start y = max(200, headerBottomY + 24) (contract line 1056)
  let y = drawTableHeader(doc, Math.max(200, headerBottomY + 24));

  for (const item of cleanItems) {
    doc.fontSize(FONT_BODY).font('Helvetica');
    const descLines = wrapText(doc, item.description || '', COL.descWidth - 12);
    const rowHeight = Math.max(descLines.length * LINE_HEIGHT, LINE_HEIGHT);

    if (y + rowHeight > BOTTOM_LIMIT) {
      const hb = breakPage();
      y = drawTableHeader(doc, Math.max(200, hb + 24));
    }

    y = drawItemRow(doc, y, item, currencyCode ?? null);
  }

  // ── Totals box ────────────────────────────────────────────────────────────
  const totalsH = totalsBoxHeight(totalsRows.length);
  // Contract line 1111: overflow check `y + totalsHeight + 18 > 722`.
  // The `+18` is footer breathing-room clearance, NOT spacing inserted between
  // table and totals — Android draws totals at the current `y` (post-item).
  if (y + totalsH + 18 > BOTTOM_LIMIT) {
    const hb = breakPage();
    y = Math.max(200, hb + 24); // contract line 1121
  }
  y = drawTotalsBox(doc, y, totalsRows);

  // ── Bottom NOTES box ──────────────────────────────────────────────────────
  const cleanBottom = (bottomNotes ?? '').trim();
  if (cleanBottom) {
    const notesH = notesBoxHeight(doc, cleanBottom);
    const notesTopDefault = y + 18; // contract line 1170 (totalsTop+totalsH+18 = current y + 18)
    let notesTop = notesTopDefault;

    if (notesTop + notesH > BOTTOM_LIMIT) {
      const hb = breakPage();
      notesTop = Math.max(260, hb + 40); // contract line 1184
    }
    drawNotesSection(doc, notesTop, cleanBottom);
  }

  // ── Finalise final page (footer + page number) ────────────────────────────
  finalisePage();
}
