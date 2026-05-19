// src/app/api/workspace/documents/[id]/pdf/route.ts v2.1
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
// - v2.1 (2026-05-18): TOOL-AWARE RENDERING — Flooring fix.
//   When doc.linked_entity_id resolves to a lead/job that has a flooring
//   tool attachment, the route now:
//     1. Fetches tool_key, raw_payload, values_text from tool_attachments.
//     2. Re-extracts items from rawPayload via extractFlooringItems() —
//        a TypeScript port of Android AttachmentContentExtractor
//        extractFlooringPdfItems(), ensuring proper room names and sqm
//        (no mm² scale issue, correct flooring-type label).
//     3. Appends values_text as bottomNotes so the full semantic breakdown
//        (FLOOR AREAS / FLOORING SUPPLY / SKIRTING & FINISHING / LABOUR)
//        appears in the PDF's bottom NOTES box — matching Android output.
//   Generic fallback (doc.items) is preserved for all other tool types.

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

// ─────────────────────────────────────────────────────────────────────────────
// FLOORING TOOL — TypeScript port of Android AttachmentContentExtractor
// extractFlooringPdfItems() (v1.6.0)
//
// Source contract: FlooringScreen.kt buildRawPayload() schema
//   rawPayload = {
//     rooms: [{ name, length, width, sqm?, isVisibleToClient? }],
//     flooringType: string,         // e.g. "lvt"
//     costPerSqm: string,           // e.g. "22.0"
//     items: [                      // tool-emitted non-room items
//       { name, qty, price, unit, costBucket }  // qty and price are strings
//     ]
//   }
//
// The `items[]` entries for rooms follow the naming convention:
//   "${roomName} (${flooringTypeLabel})"  — e.g. "Bedroom 1 (Vinyl / LVT)"
//
// Non-room items (always visible):
//   "Waste allowance", "Underlay", "Skirting board", "Door threshold",
//   "Scotia / trim", "Flooring adhesive", "Fitting", "Old floor uplift"
//
// This function EXACTLY mirrors Android's logic so item descriptions,
// sqm values, and totals are identical to what Android generates.
// ─────────────────────────────────────────────────────────────────────────────
type PdfItem = { description: string; unit: string; qty: number; price: number; total: number };

function cleanDisplayLabel(id: string): string {
  // Mirror Android AttachmentContentExtractor.cleanDisplayLabel():
  // Replace underscores with spaces, title-case each word.
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFlooringItems(rawPayload: string): PdfItem[] {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(rawPayload) as Record<string, unknown>;
  } catch {
    return [];
  }

  const out: PdfItem[] = [];

  // ── Step 1: Rooms section (Android: collapseSectionForClient on rooms[]) ──
  // Per Android v1.6.0: sqm is read from items[] lookup (correct unit-converted
  // values saved at buildRawPayload() time), NOT from rooms[].length/width
  // (which are raw user-input in whatever unit the user had selected — directly
  // multiplying them would give mm²-scale values for mm-input rooms).
  const roomsArr = (json.rooms as unknown[]) ?? [];
  const flooringTypeId = String(json.flooringType ?? '');
  const flooringTypeLabel = flooringTypeId ? cleanDisplayLabel(flooringTypeId) : '';
  const costPerSqm = parseFloat(String(json.costPerSqm ?? '0')) || 0;

  // Build roomName → sqm lookup from items[] (Android v1.6.0 FIX)
  const itemsArr = (json.items as unknown[]) ?? [];
  const roomSqmFromItems = new Map<string, number>();
  if (costPerSqm > 0 && flooringTypeLabel) {
    const suffix = ` (${flooringTypeLabel})`;
    for (const raw of itemsArr) {
      const o = raw as Record<string, unknown>;
      const itemName = String(o.name ?? '');
      const unitField = String(o.unit ?? '');
      const qty = parseFloat(String(o.qty ?? '0')) || 0;
      if (unitField.toLowerCase() !== 'sqm' || qty <= 0) continue;
      if (itemName.endsWith(suffix)) {
        const roomName = itemName.slice(0, -suffix.length).trim();
        if (roomName) roomSqmFromItems.set(roomName, qty);
      }
    }
  }

  if (costPerSqm > 0) {
    for (const raw of roomsArr) {
      const o = raw as Record<string, unknown>;
      const name = String(o.name ?? 'Room') || 'Room';
      const isVisible = o.isVisibleToClient !== false; // default true per Android contract
      if (!isVisible) continue; // respect client-visibility flag (Phase 4B contract)

      // Prefer sqm from items[] lookup; fall back to pre-computed sqm field (v3.8.1)
      let sqm = roomSqmFromItems.get(name);
      if (!sqm && typeof o.sqm === 'number' && (o.sqm as number) > 0) {
        sqm = o.sqm as number;
      }
      if (!sqm || sqm <= 0) continue; // no valid sqm — skip (0-area room)

      const description = flooringTypeLabel ? `${name} (${flooringTypeLabel})` : name;
      out.push({
        description,
        unit: 'sqm',
        qty: sqm,
        price: costPerSqm,
        total: Math.round(sqm * costPerSqm * 100) / 100,
      });
    }
  }

  // ── Step 2: Non-room items from items[] ──
  // Skip per-room items (already emitted above). Android identifies them by
  // matching the room suffix; we use the same approach.
  const emittedDescriptions = new Set(out.map((i) => i.description));

  for (const raw of itemsArr) {
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    if (emittedDescriptions.has(name)) continue; // already emitted via rooms
    const qty = parseFloat(String(o.qty ?? '1')) || 1;
    const price = parseFloat(String(o.price ?? '0')) || 0;
    if (qty <= 0 || price <= 0) continue;
    const unit = String(o.unit ?? 'Item') || 'Item';
    out.push({
      description: cleanDisplayLabel(name),
      unit,
      qty,
      price,
      total: Math.round(qty * price * 100) / 100,
    });
  }

  return out;
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

  // ── Tool-awareness: query tool_attachments for the document's parent entity ──
  //
  // documents.linked_entity_id → lead/job UUID
  // tool_attachments.parent_id = linked_entity_id, parent_type ILIKE 'LEAD'|'JOB'
  //
  // This is the ONLY path to tool_key, raw_payload, values_text — none of
  // these fields exist on the documents table itself. Without this join, the
  // renderer cannot detect the originating tool and always falls back to the
  // generic flat-items interpretation (root cause of the flooring parity gap).
  let toolKey: string | null = null;
  let toolRawPayload: string | null = null;
  let toolValuesText: string | null = null;

  if (doc.linked_entity_id) {
    const { data: toolAttachment } = await supabase
      .from('tool_attachments')
      .select('tool_key, raw_payload, values_text')
      .eq('workspace_id', workspaceId ?? '')
      .eq('parent_id', doc.linked_entity_id)
      .not('tool_key', 'is', null)
      .neq('tool_key', '')
      .order('created_at_millis', { ascending: false })
      .limit(1)
      .maybeSingle<{ tool_key: string | null; raw_payload: string | null; values_text: string | null }>();

    if (toolAttachment) {
      toolKey       = toolAttachment.tool_key ?? null;
      toolRawPayload = toolAttachment.raw_payload ?? null;
      toolValuesText = toolAttachment.values_text ?? null;
    }
  }

  // ── Item extraction: tool-aware (flooring) or generic (all others) ──
  //
  // For flooring: re-extract from rawPayload using the TypeScript port of
  // Android AttachmentContentExtractor.extractFlooringPdfItems() (v1.6.0).
  // This ensures:
  //   • Room names carry the flooring-type label: "Bedroom 1 (Vinyl / LVT)"
  //   • Sqm comes from items[].qty (unit-converted at save time) — NOT from
  //     rooms[].length × rooms[].width (which are raw mm/cm user inputs)
  //   • Client-visibility flags (isVisibleToClient=false) are respected
  //   • All non-room items (Waste allowance, Skirting, Fitting etc.) are
  //     preserved with their original names
  //
  // Generic fallback: reads doc.items (Android-exported DocumentLineItem[]).
  let items: PdfItem[];
  if (toolKey === 'flooring' && toolRawPayload) {
    const extracted = extractFlooringItems(toolRawPayload);
    // Fall back to doc.items if extraction produced nothing (malformed payload)
    items = extracted.length > 0
      ? deduplicateItems(extracted)
      : deduplicateItems(
          (Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [])
            .map((it) => normaliseAreaItem(flexNormaliseItem(it))),
        );
  } else {
    const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
    items = deduplicateItems(rawItems.map((it) => normaliseAreaItem(flexNormaliseItem(it))));
  }

  // ── bottomNotes: for flooring, prepend the values_text breakdown ──
  //
  // values_text (from tool_attachments) is the full semantic breakdown
  // Android builds in buildValuesText():
  //   "TISSCA – FLOORING\n\nFLOOR AREAS\n• Bedroom 1 | ... = X sqm\n..."
  //
  // Android's PDF bottom notes = attachment.userNotes (user's manual notes),
  // NOT the values_text breakdown. The website mirrors this: user notes from
  // documents.footer_notes are shown first; the semantic breakdown follows.
  //
  // For non-flooring tools, bottomNotes = doc.footer_notes as before.
  let bottomNotes: string | null = doc.footer_notes ?? null;
  if (toolKey === 'flooring' && toolValuesText?.trim()) {
    const cleanBreakdown = toolValuesText.trim();
    bottomNotes = bottomNotes
      ? `${bottomNotes}\n\n${cleanBreakdown}`
      : cleanBreakdown;
  }

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
      bottomNotes,
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

