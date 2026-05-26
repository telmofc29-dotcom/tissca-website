// src/app/api/workspace/documents/[id]/pdf/route.ts v2.3
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
// - v2.2 (2026-05-19): SHARED HELPERS — extracted all rawPayload parsing and item
//   extraction into src/lib/pdf/tool-payload.ts.
//   Multi-tool support: now fetches ALL tool_attachments for the entity (not
//   just the most recent one). Items are concatenated from all tools. user_notes
//   from each attachment is included in bottomNotes (matching Android contract).
//   Supports: Android flooring, Android generic tools, website TradeToolPayload,
//   website GeneralEstimatePayload.
// - v2.3 (2026-05-19): NOTES CLEANUP — suppress auto-appended values_text when
//   tool-aware line items were successfully extracted into the PDF table.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken, type DocumentRow } from '@/lib/workspace-data';
import { isPro, normalizePlanTier } from '@/lib/plans';
import { loadPdfIdentity, renderPdfBody } from '@/lib/pdf/branding';
import {
  extractItemsFromPayload,
  deduplicateItems,
  normaliseAreaItem,
  flexNormaliseItem,
  type PdfItem,
} from '@/lib/pdf/tool-payload';

function normaliseDocType(type: string | null): 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION' {
  const t = String(type || '').toLowerCase();
  if (t.includes('layout')) return 'LAYOUT QUOTATION';
  if (t.includes('invoice') || t.includes('receipt') || t.includes('payment')) return 'INVOICE';
  return 'QUOTE';
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

  // ── Tool-awareness: fetch ALL tool_attachments for the linked entity ──────
  //
  // documents.linked_entity_id → lead/job UUID
  // tool_attachments.parent_id = linked_entity_id
  //
  // v2.2: changed from limit(1) → fetch all attachments in creation order.
  // Items are extracted from each attachment and concatenated. user_notes from
  // each attachment are included in bottomNotes per the Android PDF contract.
  // Supports: Android flooring, Android generic tools, website TradeToolPayload,
  // website GeneralEstimatePayload. Falls back to doc.items if nothing extracted.
  type AttachmentRow = {
    tool_key: string | null;
    raw_payload: string | null;
    values_text: string | null;
    user_notes: string | null;
  };
  const toolAttachments: AttachmentRow[] = [];

  if (doc.linked_entity_id && workspaceId) {
    const { data: attachments } = await supabase
      .from('tool_attachments')
      .select('tool_key, raw_payload, values_text, user_notes')
      .eq('workspace_id', workspaceId)
      .eq('parent_id', doc.linked_entity_id)
      .order('created_at_millis', { ascending: true });

    if (attachments) {
      toolAttachments.push(...(attachments as AttachmentRow[]));
    }
  }

  // ── Item extraction: try all tool attachments, fall back to doc.items ──────
  //
  // extractItemsFromPayload() detects the payload format automatically:
  //   Website TradeToolPayload  → sections[].rows
  //   Website GeneralEstimate   → line_items[]
  //   Android flooring          → rooms[] + items[] (sqm-corrected)
  //   Android generic tool      → items[] at root
  let items: PdfItem[];
  let extractedToolItemsCount = 0;
  {
    const extracted: PdfItem[] = [];
    for (const ta of toolAttachments) {
      if (ta.raw_payload) {
        const taItems = extractItemsFromPayload(ta.tool_key, ta.raw_payload);
        extracted.push(...taItems);
      }
    }
    items = deduplicateItems(extracted);
    extractedToolItemsCount = items.length;

    // Fall back to doc.items if no items extracted from tool attachments
    if (items.length === 0) {
      const rawItems = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
      items = deduplicateItems(rawItems.map((it) => normaliseAreaItem(flexNormaliseItem(it))));
    }
  }

  // ── bottomNotes: doc.footer_notes + attachment user_notes (+ values_text only
  //    when tool items were NOT already extracted into the table) ────────────
  //
  // Order:
  //   1. doc.footer_notes (document's own T&Cs / notes)
  //   2. attachment.user_notes (user's manual notes from tool UI)
  //   3. attachment.values_text (auto-generated semantic breakdown) only when
  //      no tool-aware table items were extracted, to avoid duplicating the
  //      same breakdown as a second-page NOTES block.
  // For multi-tool documents, each attachment contributes its notes in order.
  let bottomNotes: string | null = doc.footer_notes ?? null;
  for (const ta of toolAttachments) {
    if (ta.user_notes?.trim()) {
      const un = ta.user_notes.trim();
      bottomNotes = bottomNotes ? `${bottomNotes}\n\n${un}` : un;
    }
    if (extractedToolItemsCount === 0 && ta.values_text?.trim()) {
      const vt = ta.values_text.trim();
      bottomNotes = bottomNotes ? `${bottomNotes}\n\n${vt}` : vt;
    }
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

